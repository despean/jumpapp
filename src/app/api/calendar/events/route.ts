import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { accounts, users, meetings } from '@/lib/db/schema';
import { secureAPI, apiRateLimiter, addSecurityHeaders } from '@/lib/security';
import { logger } from '@/lib/logger';

async function handleCalendarEvents(request: NextRequest, context: { session: { user: { email: string } }; userId: string }) {
  const { session, userId } = context;
  
  logger.info('Calendar API request started', 'CALENDAR', undefined, userId);

  // Get user's Google account tokens from NextAuth accounts table
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email)
  });

  if (!user) {
    logger.warn('User not found in database', 'CALENDAR', { email: session.user.email }, userId);
    return NextResponse.json({ 
      error: 'User not found',
      needsConnection: true 
    }, { status: 400 });
  }

  const googleAccount = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, user.id),
      eq(accounts.provider, 'google')
    )
  });

  if (!googleAccount) {
    logger.warn('Google account not connected', 'CALENDAR', undefined, userId);
    return NextResponse.json({ 
      error: 'Google account not connected',
      needsConnection: true 
    }, { status: 400 });
  }

  // Check if token needs refresh and refresh if needed
  const now = Math.floor(Date.now() / 1000); // Unix timestamp
  let accessToken = googleAccount.access_token;
  
  if (googleAccount.expires_at && now >= (googleAccount.expires_at - 300)) { // Refresh 5 minutes before expiry
    logger.info('Token expired or expiring soon, attempting refresh', 'CALENDAR', undefined, userId);
    
    if (!googleAccount.refresh_token) {
      logger.warn('No refresh token available', 'CALENDAR', undefined, userId);
      return NextResponse.json({ 
        error: 'Token expired and no refresh token available, please reconnect',
        needsConnection: true 
      }, { status: 400 });
    }

    try {
      // Use Google's OAuth2Client to refresh the token
      const { OAuth2Client } = await import('google-auth-library');
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: googleAccount.refresh_token,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      accessToken = credentials.access_token || null;

      logger.info('Token refreshed successfully', 'CALENDAR', undefined, userId);

      // Update the token in database
      await db.update(accounts)
        .set({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null,
        })
        .where(and(
          eq(accounts.userId, user.id),
          eq(accounts.provider, 'google')
        ));

    } catch (refreshError) {
      logger.error('Token refresh failed', 'CALENDAR', refreshError, userId);
      return NextResponse.json({ 
        error: 'Token refresh failed, please reconnect',
        needsConnection: true 
      }, { status: 400 });
    }
  }

  if (!accessToken) {
    logger.warn('No access token available', 'CALENDAR', undefined, userId);
    return NextResponse.json({ 
      error: 'No access token available',
      needsConnection: true 
    }, { status: 400 });
  }

  logger.debug('Token info retrieved', 'CALENDAR', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!googleAccount.refresh_token,
    expiresAt: googleAccount.expires_at,
    tokenExpired: googleAccount.expires_at ? now >= googleAccount.expires_at : false
  }, userId);

    const calendarService = new GoogleCalendarService(
      accessToken,
      googleAccount.refresh_token || undefined
    );

    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get('maxResults') || '10');

    const events = await calendarService.getUpcomingEvents(maxResults);

    // Process events and save/update them in database
    const processedEvents = [];

    for (const event of events) {
      const meetingPlatform = GoogleCalendarService.detectMeetingPlatform(event);
      
      // Only process events with meeting links
      if (meetingPlatform) {
        // Check if meeting already exists in database
        const existingMeeting = await db.query.meetings.findFirst({
          where: and(
            eq(meetings.userId, user.id),
            eq(meetings.calendarEventId, event.id)
          )
        });

        let meetingId = existingMeeting?.id;

        if (!existingMeeting) {
          // Create new meeting record
          const [newMeeting] = await db.insert(meetings).values({
            userId: user.id,
            calendarEventId: event.id,
            title: event.summary,
            description: event.description || null,
            startTime: new Date(event.start.dateTime || event.start.date || ''),
            endTime: new Date(event.end.dateTime || event.end.date || ''),
            platform: meetingPlatform.platform,
            meetingUrl: meetingPlatform.url,
            attendeesCount: GoogleCalendarService.getAttendeeCount(event),
            notetakerEnabled: false, // Default to false
            status: 'scheduled',
          }).returning();

          meetingId = newMeeting.id;
          logger.info('New meeting saved', 'CALENDAR', { title: newMeeting.title, meetingId }, userId);
        } else {
          // Update existing meeting
          await db.update(meetings)
            .set({
              title: event.summary,
              description: event.description || null,
              startTime: new Date(event.start.dateTime || event.start.date || ''),
              endTime: new Date(event.end.dateTime || event.end.date || ''),
              platform: meetingPlatform.platform,
              meetingUrl: meetingPlatform.url,
              attendeesCount: GoogleCalendarService.getAttendeeCount(event),
              updatedAt: new Date(),
            })
            .where(eq(meetings.id, existingMeeting.id));

          logger.info('Meeting updated', 'CALENDAR', { title: existingMeeting.title, meetingId: existingMeeting.id }, userId);
        }

        processedEvents.push({
          ...event,
          meetingId, // Add our database meeting ID
          meetingPlatform,
          attendeeCount: GoogleCalendarService.getAttendeeCount(event),
          duration: GoogleCalendarService.getEventDuration(event),
          formattedTime: GoogleCalendarService.formatEventTime(event),
          isStartingSoon: GoogleCalendarService.isEventStartingSoon(event),
          notetakerEnabled: !!existingMeeting?.botId, // True only if bot is currently associated
          botId: existingMeeting?.botId || null,
        });
      }
    }

  logger.info('Calendar events processed', 'CALENDAR', { 
    totalEvents: processedEvents.length,
    eventsWithVideoLinks: processedEvents.length 
  }, userId);

  const response = NextResponse.json({ events: processedEvents });
  return addSecurityHeaders(response);
}

// Export the secure API wrapper
export const GET = secureAPI(handleCalendarEvents, {
  requireAuth: true,
  rateLimiter: apiRateLimiter.general,
  allowedMethods: ['GET']
});
