import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';
import { db } from '@/lib/db';
import { eq, and, isNotNull } from 'drizzle-orm';
import { meetings, transcripts, users } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all meetings with bots that are still in progress
    const activeMeetings = await db.query.meetings.findMany({
      where: and(
        eq(meetings.userId, user.id),
        isNotNull(meetings.botId),
        eq(meetings.status, 'in_progress')
      )
    });

    console.log(`🔍 Polling ${activeMeetings.length} active bot(s)...`);

    const recallService = new RecallAIService();
    const results = [];

    for (const meeting of activeMeetings) {
      if (!meeting.botId) continue;

      try {
        console.log(`📊 Checking bot ${meeting.botId} for meeting: ${meeting.title}`);
        
        // Get bot status
        const bot = await recallService.getBot(meeting.botId);
        
        let transcriptReady = false;
        let transcriptSaved = false;

        // Check if bot finished and transcript is available
        const { isReady, hasTranscript, status } = await recallService.isBotReady(meeting.botId);
        
        if (isReady) {
          console.log(`✅ Bot ${meeting.botId} finished with status: ${status}`);

          // Update meeting status if it changed
          if (meeting.status !== 'completed') {
            await db.update(meetings)
              .set({
                status: 'completed',
                updatedAt: new Date()
              })
              .where(eq(meetings.id, meeting.id));
          }

          // Check if we already have transcript
          const existingTranscript = await db.query.transcripts.findFirst({
            where: eq(transcripts.meetingId, meeting.id)
          });

          if (!existingTranscript && hasTranscript) {
            // Try to get transcript from Recall.ai
            try {
              const recallTranscript = await recallService.getBotTranscript(meeting.botId);
              
              if (recallTranscript) {
                console.log(`💾 Saving transcript for meeting: ${meeting.title}`);
                
                // Extract attendee information
                const attendees = recallTranscript.speakers.map(speaker => ({
                  id: speaker.id,
                  name: speaker.name,
                }));

                // Calculate duration
                const duration = recallTranscript.words.length > 0 
                  ? Math.round(recallTranscript.words[recallTranscript.words.length - 1].end_time / 60)
                  : 0;

                // Save transcript to database
                await db.insert(transcripts).values({
                  meetingId: meeting.id,
                  content: recallTranscript.transcript_text,
                  attendees: JSON.stringify(attendees),
                  duration,
                  processedAt: new Date(),
                });

                transcriptSaved = true;
                transcriptReady = true;

                console.log(`✅ Transcript saved for meeting: ${meeting.title}`);
              }
            } catch (error) {
              console.log(`⏳ Transcript not ready yet for bot ${meeting.botId}:`, error.message);
            }
          } else {
            transcriptReady = true;
            transcriptSaved = true;
          }

          // Update meeting status if transcript is ready
          if (transcriptReady) {
            await db.update(meetings)
              .set({
                status: 'completed',
                updatedAt: new Date(),
              })
              .where(eq(meetings.id, meeting.id));

            console.log(`🎉 Meeting ${meeting.title} marked as completed`);
          }
        }

        results.push({
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          botId: meeting.botId,
          botStatus: bot.status,
          transcriptReady,
          transcriptSaved,
          statusChanges: bot.status_changes,
        });

      } catch (error) {
        console.error(`❌ Error polling bot ${meeting.botId}:`, error);
        results.push({
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          botId: meeting.botId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      polled: activeMeetings.length,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error in bot polling:', error);
    
    return NextResponse.json({ 
      error: 'Failed to poll bot status',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
