import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { meetings, users, bots } from '@/lib/db/schema';

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

    // Check if we already have a bot for this meeting URL
    console.log('🔍 Searching for existing bot:', {
      userId: user.id,
      cleanedUrl: cleanedUrl
    });

    const existingBot = await db.query.bots.findFirst({
      where: and(
        eq(bots.userId, user.id),
        eq(bots.meetingUrl, cleanedUrl)
      )
    });

    console.log('🔍 Existing bot search result:', existingBot);

    // Also check all bots for this user to see what we have
    const allUserBots = await db.query.bots.findMany({
      where: eq(bots.userId, user.id)
    });
    console.log('📋 All user bots:', allUserBots.map(b => ({
      id: b.id,
      meetingUrl: b.meetingUrl,
      status: b.status
    })));

    let bot;
    const recallService = new RecallAIService();

    if (existingBot) {
      console.log('🔄 Found existing bot, checking status:', existingBot.id);
      
      try {
        // Get current status from Recall.ai
        const botStatus = await recallService.getBot(existingBot.id);
        
        // Update our database with current status
        await db.update(bots)
          .set({
            status: botStatus.status,
            updatedAt: new Date(),
          })
          .where(eq(bots.id, existingBot.id));

        bot = { id: existingBot.id, ...botStatus };
        console.log('✅ Reusing existing bot:', existingBot.id, 'Status:', botStatus.status);
      } catch (error) {
        console.log('⚠️ Existing bot not found on Recall.ai, creating new one');
        // Bot doesn't exist on Recall.ai anymore, create a new one
        existingBot.id = null; // Force creation of new bot
      }
    }

    if (!existingBot || !bot) {
      // Create new bot
      console.log('🤖 Creating new bot for meeting URL:', cleanedUrl);
      
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
      
      bot = await recallService.createBot(botConfig);

      // Save the new bot to our database
      const botData = {
        id: bot.id,
        userId: user.id,
        meetingUrl: cleanedUrl,
        botName: botConfig.bot_name,
        status: bot.status,
        platform: meeting.platform,
      };

      console.log('💾 Saving bot to database:', botData);
      
      await db.insert(bots).values(botData);

      console.log('✅ New bot saved to database:', bot.id);
    }

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
        meeting_url: cleanedUrl, // Use the actual URL string
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
