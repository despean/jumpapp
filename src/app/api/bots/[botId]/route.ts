import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { meetings, transcripts, users } from '@/lib/db/schema';

interface RouteParams {
  params: {
    botId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botId } = await params;

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify this bot belongs to the user
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.botId, botId),
        eq(meetings.userId, user.id)
      )
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Bot not found or access denied' }, { status: 404 });
    }

    // Get bot status from Recall.ai
    const recallService = new RecallAIService();
    const bot = await recallService.getBot(botId);

    let transcript = null;
    let hasTranscript = false;

    // Check if we already have the transcript in our database
    const existingTranscript = await db.query.transcripts.findFirst({
      where: eq(transcripts.meetingId, meeting.id)
    });

    if (existingTranscript) {
      transcript = {
        id: existingTranscript.id,
        content: existingTranscript.content,
        summary: existingTranscript.summary,
        attendees: existingTranscript.attendees ? JSON.parse(existingTranscript.attendees) : [],
        duration: existingTranscript.duration,
        processedAt: existingTranscript.processedAt,
      };
      hasTranscript = true;
    } else {
      // Check if bot has finished and transcript is available
      const { isReady, hasTranscript: transcriptReady } = await recallService.isBotReady(botId);
      
      if (isReady && transcriptReady) {
        console.log('🔍 Bot finished, checking for transcript...');
        
        try {
          const recallTranscript = await recallService.getBotTranscript(botId);
        
          if (recallTranscript) {
            console.log('✅ Transcript found, saving to database...');
            
            // Extract attendee information
            const attendees = recallTranscript.speakers.map(speaker => ({
              id: speaker.id,
              name: speaker.name,
            }));

            // Calculate duration from transcript words
            const duration = recallTranscript.words.length > 0 
              ? Math.round(recallTranscript.words[recallTranscript.words.length - 1].end_time / 60)
              : 0;

            // Save transcript to database
            const [savedTranscript] = await db.insert(transcripts).values({
              meetingId: meeting.id,
              content: recallTranscript.transcript_text,
              attendees: JSON.stringify(attendees),
              duration,
              processedAt: new Date(),
            }).returning();

            // Update meeting status
            await db.update(meetings)
              .set({
                status: 'completed',
                updatedAt: new Date(),
              })
              .where(eq(meetings.id, meeting.id));

            transcript = {
              id: savedTranscript.id,
              content: savedTranscript.content,
              summary: savedTranscript.summary,
              attendees,
              duration,
              processedAt: savedTranscript.processedAt,
            };
            hasTranscript = true;

            console.log('✅ Transcript saved successfully');
          }
        } catch (error) {
          console.log('⏳ Transcript not ready yet:', error.message);
        }
      }
    }

    return NextResponse.json({
      bot: {
        id: bot.id,
        status: bot.status,
        meeting_url: bot.meeting_url,
        created_at: bot.created_at,
        updated_at: bot.updated_at,
        status_changes: bot.status_changes,
      },
      meeting: {
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        platform: meeting.platform,
        status: meeting.status,
      },
      transcript,
      hasTranscript,
      isReady: bot.status === 'call_ended',
    });

  } catch (error) {
    console.error(`❌ Error getting bot ${params.botId}:`, error);
    
    let errorMessage = 'Failed to get bot status';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
