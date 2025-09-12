import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { meetings, users } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, joinMinutesBefore = 2 } = body;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get meeting from database
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, user.id)
      )
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (!meeting.meetingUrl) {
      return NextResponse.json({ 
        error: 'Meeting URL not found - cannot create bot' 
      }, { status: 400 });
    }

    // Check if meeting URL is supported
    if (!RecallAIService.isSupportedMeetingUrl(meeting.meetingUrl)) {
      return NextResponse.json({ 
        error: 'Meeting platform not supported by Recall.ai' 
      }, { status: 400 });
    }

    // Check if bot already exists for this meeting
    if (meeting.botId) {
      return NextResponse.json({ 
        error: 'Bot already exists for this meeting',
        botId: meeting.botId 
      }, { status: 400 });
    }

    // Calculate when to join the meeting
    const meetingStart = new Date(meeting.startTime);
    const joinTime = new Date(meetingStart.getTime() - (joinMinutesBefore * 60 * 1000));
    const now = new Date();

    console.log('🕐 Meeting timing:', {
      meetingStart: meetingStart.toISOString(),
      joinTime: joinTime.toISOString(),
      now: now.toISOString(),
      shouldJoinNow: now >= joinTime
    });

    // Create the bot
    const recallService = new RecallAIService();
    
    const bot = await recallService.createBot({
      meeting_url: meeting.meetingUrl,
      bot_name: `JumpApp Bot - ${meeting.title}`,
      recording_config: {
        participant_events: true,
        transcription: true,
        chat: true,
      },
    });

    // Update meeting with bot ID
    await db.update(meetings)
      .set({
        botId: bot.id,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    console.log('✅ Bot created and meeting updated:', {
      botId: bot.id,
      meetingId,
      meetingUrl: meeting.meetingUrl
    });

    return NextResponse.json({
      success: true,
      bot: {
        id: bot.id,
        status: bot.status,
        meeting_url: bot.meeting_url,
        created_at: bot.created_at,
      },
      meeting: {
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime,
        joinTime: joinTime.toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ Error creating bot:', error);
    
    let errorMessage = 'Failed to create meeting bot';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
