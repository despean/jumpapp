import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { meetings, users, transcripts } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 DEBUG: Fetching ALL meetings for user:', session.user.email);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get ALL meetings (not just past ones)
    const allMeetings = await db.query.meetings.findMany({
      where: eq(meetings.userId, user.id),
      orderBy: [desc(meetings.startTime)], // Most recent first
      with: {
        transcript: true // Include transcript if available
      }
    });

    console.log(`🔍 DEBUG: Found ${allMeetings.length} total meetings`);

    // Process meetings to show debug info
    const debugMeetings = allMeetings.map((meeting) => {
      const now = new Date();
      const startTime = new Date(meeting.startTime);
      const endTime = new Date(meeting.endTime);
      const isPast = endTime < now;
      const isOngoing = startTime <= now && now <= endTime;
      const isFuture = startTime > now;

      return {
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
        botId: meeting.botId,
        hasBot: !!meeting.botId,
        hasTranscript: !!meeting.transcript,
        transcriptId: meeting.transcript?.id || null,
        transcriptContentLength: meeting.transcript?.content?.length || 0,
        timeStatus: isPast ? 'PAST' : isOngoing ? 'ONGOING' : 'FUTURE',
        minutesFromNow: Math.round((startTime.getTime() - now.getTime()) / (1000 * 60))
      };
    });

    const pastMeetings = debugMeetings.filter(m => m.timeStatus === 'PAST');
    const futureMeetings = debugMeetings.filter(m => m.timeStatus === 'FUTURE');
    const ongoingMeetings = debugMeetings.filter(m => m.timeStatus === 'ONGOING');

    console.log('🔍 DEBUG: Meeting breakdown:', {
      total: debugMeetings.length,
      past: pastMeetings.length,
      ongoing: ongoingMeetings.length,
      future: futureMeetings.length,
      withTranscripts: debugMeetings.filter(m => m.hasTranscript).length,
      withBots: debugMeetings.filter(m => m.hasBot).length
    });

    return NextResponse.json({
      debug: true,
      summary: {
        total: debugMeetings.length,
        past: pastMeetings.length,
        ongoing: ongoingMeetings.length,
        future: futureMeetings.length,
        withTranscripts: debugMeetings.filter(m => m.hasTranscript).length,
        withBots: debugMeetings.filter(m => m.hasBot).length
      },
      meetings: debugMeetings,
      currentTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DEBUG: Error fetching meetings:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch debug meetings',
      details: String(error)
    }, { status: 500 });
  }
}