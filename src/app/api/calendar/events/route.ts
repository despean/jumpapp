import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { accounts, users, meetings } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  console.log('🚀 Calendar API route called');
  
  try {
    console.log('🔐 Getting server session...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No session or user email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found for user:', session.user.email);

    // Get user's Google account tokens from NextAuth accounts table
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
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
      return NextResponse.json({ 
        error: 'Google account not connected',
        needsConnection: true 
      }, { status: 400 });
    }

    // Check if token needs refresh and refresh if needed
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    let accessToken = googleAccount.access_token;
    
    if (googleAccount.expires_at && now >= (googleAccount.expires_at - 300)) { // Refresh 5 minutes before expiry
      console.log('🔄 Token expired or expiring soon, attempting refresh...');
      
      if (!googleAccount.refresh_token) {
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
        accessToken = credentials.access_token;

        console.log('✅ Token refreshed successfully');

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
        console.error('❌ Token refresh failed:', refreshError);
        return NextResponse.json({ 
          error: 'Token refresh failed, please reconnect',
          needsConnection: true 
        }, { status: 400 });
      }
    }

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token available',
        needsConnection: true 
      }, { status: 400 });
    }

    console.log('🔑 Token info:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!googleAccount.refresh_token,
      expiresAt: googleAccount.expires_at,
      scope: googleAccount.scope,
      tokenType: googleAccount.token_type,
      currentTime: now,
      tokenExpired: googleAccount.expires_at ? now >= googleAccount.expires_at : false
    });

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
            startTime: new Date(event.start.dateTime || event.start.date),
            endTime: new Date(event.end.dateTime || event.end.date),
            platform: meetingPlatform.platform,
            meetingUrl: meetingPlatform.url,
            attendeesCount: GoogleCalendarService.getAttendeeCount(event),
            notetakerEnabled: false, // Default to false
            status: 'scheduled',
          }).returning();

          meetingId = newMeeting.id;
          console.log('📅 New meeting saved:', newMeeting.title);
        } else {
          // Update existing meeting
          await db.update(meetings)
            .set({
              title: event.summary,
              description: event.description || null,
              startTime: new Date(event.start.dateTime || event.start.date),
              endTime: new Date(event.end.dateTime || event.end.date),
              platform: meetingPlatform.platform,
              meetingUrl: meetingPlatform.url,
              attendeesCount: GoogleCalendarService.getAttendeeCount(event),
              updatedAt: new Date(),
            })
            .where(eq(meetings.id, existingMeeting.id));

          console.log('📅 Meeting updated:', existingMeeting.title);
        }

        processedEvents.push({
          ...event,
          meetingId, // Add our database meeting ID
          meetingPlatform,
          attendeeCount: GoogleCalendarService.getAttendeeCount(event),
          duration: GoogleCalendarService.getEventDuration(event),
          formattedTime: GoogleCalendarService.formatEventTime(event),
          isStartingSoon: GoogleCalendarService.isEventStartingSoon(event),
          notetakerEnabled: existingMeeting?.notetakerEnabled || false,
          botId: existingMeeting?.botId || null,
        });
      }
    }

    console.log(`📊 Processed ${processedEvents.length} meetings with video links`);

    return NextResponse.json({ events: processedEvents });
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in calendar API:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to fetch calendar events';
    let errorDetails = null;
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
      errorType = error.constructor.name;
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    } else {
      console.error('❌ Non-Error object thrown:', error);
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      errorType,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      rawError: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
