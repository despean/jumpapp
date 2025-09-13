import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and, desc, lt } from 'drizzle-orm';
import { meetings, users, transcripts, bots } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📋 Fetching past meetings for user:', session.user.email);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get past meetings (meetings that have ended)
    const now = new Date();
    const pastMeetings = await db.query.meetings.findMany({
      where: and(
        eq(meetings.userId, user.id),
        lt(meetings.endTime, now) // Only meetings that have ended
      ),
      orderBy: [desc(meetings.endTime)], // Most recent first
      limit: limit,
      offset: offset,
      with: {
        transcript: true // Include transcript if available
      }
    });

    console.log(`📊 Found ${pastMeetings.length} past meetings`);

    // Process meetings to include additional info
    const processedMeetings = await Promise.all(
      pastMeetings.map(async (meeting) => {
        let botInfo = null;
        let transcriptInfo = null;

        // Get bot info if botId exists
        if (meeting.botId) {
          try {
            const bot = await db.query.bots.findFirst({
              where: eq(bots.id, meeting.botId)
            });
            if (bot) {
              botInfo = {
                id: bot.id,
                status: bot.status,
                createdAt: bot.createdAt
              };
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch bot info for meeting:', meeting.id);
          }
        }

        // Process transcript info
        if (meeting.transcript) {
          const attendees = meeting.transcript.attendees 
            ? JSON.parse(meeting.transcript.attendees) 
            : [];
          
          transcriptInfo = {
            id: meeting.transcript.id,
            hasContent: !!meeting.transcript.content,
            contentLength: meeting.transcript.content?.length || 0,
            summary: meeting.transcript.summary,
            attendees: attendees,
            duration: meeting.transcript.duration,
            processedAt: meeting.transcript.processedAt
          };
        }

        // Calculate meeting duration
        const startTime = new Date(meeting.startTime);
        const endTime = new Date(meeting.endTime);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        return {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          duration: durationMinutes,
          platform: meeting.platform,
          meetingUrl: meeting.meetingUrl,
          attendeesCount: meeting.attendeesCount,
          status: meeting.status,
          botId: meeting.botId, // Include the actual botId for debugging
          botInfo,
          transcript: transcriptInfo,
          hasTranscript: !!transcriptInfo,
          createdAt: meeting.createdAt
        };
      })
    );

    // Separate meetings with and without transcripts
    const withTranscripts = processedMeetings.filter(m => m.hasTranscript);
    const withoutTranscripts = processedMeetings.filter(m => !m.hasTranscript);

    console.log(`📈 Meetings breakdown: ${withTranscripts.length} with transcripts, ${withoutTranscripts.length} without`);

    return NextResponse.json({
      meetings: processedMeetings,
      summary: {
        total: processedMeetings.length,
        withTranscripts: withTranscripts.length,
        withoutTranscripts: withoutTranscripts.length,
        limit,
        offset,
        hasMore: processedMeetings.length === limit // Simple check for pagination
      }
    });

  } catch (error) {
    console.error('❌ Error fetching past meetings:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch past meetings',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
