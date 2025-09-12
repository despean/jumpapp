import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { botPollingService } from '@/lib/bot-poller';
import { db } from '@/lib/db';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { meetings, transcripts, users } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 DEBUG: Polling service debug endpoint called');

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get polling service status
    const pollingStatus = botPollingService.getStatus();

    // Get all meetings with bots for this user
    const allMeetings = await db.query.meetings.findMany({
      where: and(
        eq(meetings.userId, user.id),
        isNotNull(meetings.botId)
      ),
      orderBy: meetings.createdAt
    });

    // Get meetings that would be polled
    const activeMeetings = await db.query.meetings.findMany({
      where: and(
        eq(meetings.userId, user.id),
        isNotNull(meetings.botId),
        inArray(meetings.status, ['scheduled', 'in_progress', 'completed'])
      )
    });

    // Get existing transcripts
    const existingTranscripts = await db.query.transcripts.findMany({
      where: eq(transcripts.meetingId, inArray(allMeetings.map(m => m.id)))
    });

    // Filter meetings that need polling
    const meetingsNeedingPoll = activeMeetings.filter(meeting => 
      !existingTranscripts.some(t => t.meetingId === meeting.id)
    );

    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email
      },
      pollingService: pollingStatus,
      meetings: {
        total: allMeetings.length,
        withBots: allMeetings.filter(m => m.botId).length,
        active: activeMeetings.length,
        needingPoll: meetingsNeedingPoll.length,
        withTranscripts: existingTranscripts.length
      },
      allMeetings: allMeetings.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        botId: m.botId,
        createdAt: m.createdAt,
        hasTranscript: existingTranscripts.some(t => t.meetingId === m.id)
      })),
      meetingsNeedingPoll: meetingsNeedingPoll.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        botId: m.botId,
        createdAt: m.createdAt
      })),
      transcripts: existingTranscripts.map(t => ({
        id: t.id,
        meetingId: t.meetingId,
        hasContent: !!t.content,
        contentLength: t.content?.length || 0,
        processedAt: t.processedAt
      }))
    };

    console.log('🔍 DEBUG: Polling debug info:', JSON.stringify(debugInfo, null, 2));

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('❌ DEBUG: Error in polling debug endpoint:', error);
    
    return NextResponse.json({ 
      error: 'Failed to get debug info',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'force-poll') {
      console.log('🔍 DEBUG: Force polling triggered from debug endpoint');
      await botPollingService.forcePoll();
      
      return NextResponse.json({ 
        message: 'Force poll completed',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action',
      validActions: ['force-poll']
    }, { status: 400 });

  } catch (error) {
    console.error('❌ DEBUG: Error in polling debug POST:', error);
    
    return NextResponse.json({ 
      error: 'Failed to execute debug action',
      details: String(error)
    }, { status: 500 });
  }
}
