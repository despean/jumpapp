import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { meetings, users, bots, userSettings } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, joinMinutesBefore } = body;

    logger.info('🤖 Bot creation request:', 'API', { meetingId, joinMinutesBefore });

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      logger.info('❌ User not found for email:', 'API', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    logger.info('👤 User found:', 'API', user.id);

    // Get user settings for bot join timing
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id)
    });

    // Use provided joinMinutesBefore or user settings or default to 2
    const actualJoinMinutesBefore = joinMinutesBefore ?? settings?.botJoinMinutes ?? 2;
    
    logger.info('⚙️ Bot join timing:', 'API', { 
      provided: joinMinutesBefore, 
      userSetting: settings?.botJoinMinutes, 
      actual: actualJoinMinutesBefore 
    });

    // Get meeting from database
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, user.id)
      )
    });

    logger.info('📅 Meeting lookup:', 'API', { meetingId, userId: user.id, found: !!meeting });

    if (!meeting) {
      // Let's also check if the meetingId exists at all
      const anyMeeting = await db.query.meetings.findFirst({
        where: eq(meetings.id, meetingId)
      });
      
      logger.info('🔍 Meeting exists anywhere:', 'API', !!anyMeeting);
      if (anyMeeting) {
        logger.info('📋 Meeting details:', 'API', {
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

    logger.info('📋 Meeting details:', 'API', {
      id: meeting.id,
      title: meeting.title,
      meetingUrl: meeting.meetingUrl,
      platform: meeting.platform,
      startTime: meeting.startTime
    });

    if (!meeting.meetingUrl) {
      logger.info('❌ No meeting URL found');
      return NextResponse.json({ 
        error: 'Meeting URL not found - cannot create bot' 
      }, { status: 400 });
    }

    // Check if meeting URL is supported
    const isSupported = RecallAIService.isSupportedMeetingUrl(meeting.meetingUrl);
    logger.info('🔍 Meeting URL support check:', 'API', {
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
    const joinTime = new Date(meetingStart.getTime() - (actualJoinMinutesBefore * 60 * 1000));
    const now = new Date();

    logger.info('🕐 Meeting timing:', 'API', {
      meetingStart: meetingStart.toISOString(),
      joinTime: joinTime.toISOString(),
      now: now.toISOString(),
      shouldJoinNow: now >= joinTime
    });

    // Clean the meeting URL for Recall.ai
    const cleanedUrl = RecallAIService.cleanMeetingUrl(meeting.meetingUrl);
    logger.info('🧹 URL cleaning:', 'API', {
      original: meeting.meetingUrl,
      cleaned: cleanedUrl
    });

    // Check if we already have a bot for this meeting URL
    logger.info('🔍 Searching for existing bot:', 'API', {
      userId: user.id,
      cleanedUrl: cleanedUrl
    });

    let existingBot = await db.query.bots.findFirst({
      where: and(
        eq(bots.userId, user.id),
        eq(bots.meetingUrl, cleanedUrl)
      )
    });

    logger.info('🔍 Existing bot search result:', 'API', existingBot);

    // Also check all bots for this user to see what we have
    const allUserBots = await db.query.bots.findMany({
      where: eq(bots.userId, user.id)
    });
    logger.info('📋 All user bots:', 'API', allUserBots.map(b => ({
      id: b.id,
      meetingUrl: b.meetingUrl,
      status: b.status
    })));

    let bot;
    const recallService = new RecallAIService();

    if (existingBot) {
      logger.info('🔄 Found existing bot, checking status:', 'API', existingBot.id);
      
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

        bot = { ...botStatus, id: existingBot.id };
        logger.info('✅ Reusing existing bot:', 'API', existingBot.id, 'Status:', botStatus.status);
        logger.info('🔄 Bot reuse successful - no duplicate created');
      } catch {
        logger.info('⚠️ Existing bot not found on Recall.ai, creating new one');
        // Bot doesn't exist on Recall.ai anymore, we'll create a new one
        // Set existingBot to undefined to force creation of new bot
        existingBot = undefined;
      }
    }

    if (!existingBot || !bot) {
      // Create new bot
      logger.info('🤖 Creating new bot for meeting URL:', 'API', cleanedUrl);
      
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

      logger.info('🤖 Final bot configuration:', 'API', JSON.stringify(botConfig, null, 2));
      
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

      logger.info('💾 Saving bot to database:', 'API', botData);
      
      await db.insert(bots).values(botData);

      logger.info('✅ New bot saved to database:', 'API', bot.id);
    }

    // Update meeting with bot ID
    await db.update(meetings)
      .set({
        botId: bot.id,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    logger.info('✅ Bot created and meeting updated:', 'API', {
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
    logger.error('❌ Error creating bot:', error);
    
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
