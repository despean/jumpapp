import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { googleAccounts } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Google account tokens
    const googleAccount = await db.query.googleAccounts.findFirst({
      where: eq(googleAccounts.email, session.user.email)
    });

    if (!googleAccount) {
      return NextResponse.json({ 
        error: 'Google account not connected',
        needsConnection: true 
      }, { status: 400 });
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = googleAccount.expiresAt;
    
    if (expiresAt && now >= expiresAt) {
      // TODO: Implement token refresh logic
      return NextResponse.json({ 
        error: 'Token expired, please reconnect',
        needsConnection: true 
      }, { status: 400 });
    }

    const calendarService = new GoogleCalendarService(
      googleAccount.accessToken,
      googleAccount.refreshToken
    );

    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get('maxResults') || '10');

    const events = await calendarService.getUpcomingEvents(maxResults);

    // Process events to add meeting platform detection
    const processedEvents = events.map(event => ({
      ...event,
      meetingPlatform: GoogleCalendarService.detectMeetingPlatform(event),
      attendeeCount: GoogleCalendarService.getAttendeeCount(event),
      duration: GoogleCalendarService.getEventDuration(event),
      formattedTime: GoogleCalendarService.formatEventTime(event),
      isStartingSoon: GoogleCalendarService.isEventStartingSoon(event)
    }));

    return NextResponse.json({ events: processedEvents });
    
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch calendar events' 
    }, { status: 500 });
  }
}
