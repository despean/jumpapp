import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { bots, users, meetings } from '@/lib/db/schema';
import { RecallAIService } from '@/lib/recall-ai';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 });
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get meeting
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, user.id)
      )
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Clean URL
    const cleanedUrl = RecallAIService.cleanMeetingUrl(meeting.meetingUrl);

    // Search for existing bot
    const existingBot = await db.query.bots.findFirst({
      where: and(
        eq(bots.userId, user.id),
        eq(bots.meetingUrl, cleanedUrl)
      )
    });

    // Get all user bots
    const allUserBots = await db.query.bots.findMany({
      where: eq(bots.userId, user.id)
    });

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        originalUrl: meeting.meetingUrl,
        cleanedUrl: cleanedUrl,
        currentBotId: meeting.botId
      },
      existingBot: existingBot ? {
        id: existingBot.id,
        meetingUrl: existingBot.meetingUrl,
        status: existingBot.status,
        createdAt: existingBot.createdAt
      } : null,
      allUserBots: allUserBots.map(bot => ({
        id: bot.id,
        meetingUrl: bot.meetingUrl,
        status: bot.status,
        createdAt: bot.createdAt
      })),
      searchCriteria: {
        userId: user.id,
        cleanedUrl: cleanedUrl
      },
      urlComparison: allUserBots.map(bot => ({
        botId: bot.id,
        storedUrl: bot.meetingUrl,
        searchUrl: cleanedUrl,
        matches: bot.meetingUrl === cleanedUrl
      }))
    });

  } catch (error) {
    console.error('❌ Debug bot reuse error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: String(error)
    }, { status: 500 });
  }
}
