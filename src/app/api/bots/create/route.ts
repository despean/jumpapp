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

    console.log('🤖 Bot creation request:', { meetingId, joinMinutesBefore });

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      console.log('❌ User not found for email:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('👤 User found:', user.id);

    // Get meeting from database
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, user.id)
      )
    });

    console.log('📅 Meeting lookup:', { meetingId, userId: user.id, found: !!meeting });

    if (!meeting) {
      // Let's also check if the meetingId exists at all
      const anyMeeting = await db.query.meetings.findFirst({
        where: eq(meetings.id, meetingId)
      });
      
      console.log('🔍 Meeting exists anywhere:', !!anyMeeting);
      if (anyMeeting) {
        console.log('📋 Meeting details:', {
          id: anyMeeting.id,
          userId: anyMeeting.userId,
          title: anyMeeting.title,
          requestedUserId: user.id
        });
      }
      
      return NextResponse.json({ 
        error: 'Meeting not found',
        debug: {
          meetingId,
          userId: user.id,
          meetingExists: !!anyMeeting
        }
      }, { status: 404 });
    }

    console.log('📋 Meeting details:', {
      id: meeting.id,
      title: meeting.title,
      meetingUrl: meeting.meetingUrl,
      platform: meeting.platform,
      startTime: meeting.startTime
    });

    if (!meeting.meetingUrl) {
      console.log('❌ No meeting URL found');
      return NextResponse.json({ 
        error: 'Meeting URL not found - cannot create bot' 
      }, { status: 400 });
    }

    // Check if meeting URL is supported
    const isSupported = RecallAIService.isSupportedMeetingUrl(meeting.meetingUrl);
    console.log('🔍 Meeting URL support check:', {
      url: meeting.meetingUrl,
      supported: isSupported
    });
    
    if (!isSupported) {
      return NextResponse.json({ 
        error: 'Meeting platform not supported by Recall.ai',
        meetingUrl: meeting.meetingUrl 
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

    // Clean the meeting URL for Recall.ai
    const cleanedUrl = RecallAIService.cleanMeetingUrl(meeting.meetingUrl);
    console.log('🧹 URL cleaning:', {
      original: meeting.meetingUrl,
      cleaned: cleanedUrl
    });

    // Create the bot
    const recallService = new RecallAIService();
    
    // Prepare bot configuration (following official Recall.ai format)
    const botConfig = {
      meeting_url: cleanedUrl,
      bot_name: `JumpApp Bot - ${meeting.title}`,
      recording_config: {
        transcript: {
          provider: {
            meeting_captions: {}
          }
        }
      },
    };

    console.log('🤖 Final bot configuration:', JSON.stringify(botConfig, null, 2));
    
    const bot = await recallService.createBot(botConfig);

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
