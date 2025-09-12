import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { meetings, users } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
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

    // Get all meetings for this user
    const userMeetings = await db.query.meetings.findMany({
      where: eq(meetings.userId, user.id),
      orderBy: (meetings, { desc }) => [desc(meetings.createdAt)]
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      meetings: userMeetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        calendarEventId: meeting.calendarEventId,
        meetingUrl: meeting.meetingUrl,
        platform: meeting.platform,
        startTime: meeting.startTime,
        notetakerEnabled: meeting.notetakerEnabled,
        botId: meeting.botId,
        status: meeting.status,
        createdAt: meeting.createdAt
      })),
      total: userMeetings.length
    });

  } catch (error) {
    console.error('❌ Error in meetings debug:', error);
    
    return NextResponse.json({ 
      error: 'Failed to get meetings',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
