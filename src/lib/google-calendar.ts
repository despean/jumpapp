import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  htmlLink: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  conferenceData?: {
    conferenceSolution?: {
      name?: string;
    };
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
  hangoutLink?: string;
}

export interface MeetingPlatform {
  platform: 'zoom' | 'teams' | 'meet' | 'other';
  url: string;
  meetingId?: string;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  async getUpcomingEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
    console.log('🔍 GoogleCalendarService: Starting to fetch events...');
    console.log('📊 OAuth2Client credentials set:', {
      hasAccessToken: !!this.oauth2Client.credentials.access_token,
      hasRefreshToken: !!this.oauth2Client.credentials.refresh_token,
      expiresAt: this.oauth2Client.credentials.expiry_date
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      console.log('📅 Making Calendar API request...');
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log('✅ Calendar API response received:', {
        statusCode: response.status,
        itemCount: response.data.items?.length || 0
      });

      const items = response.data.items || [];
      const filteredItems = items.filter((item): item is CalendarEvent => 
        item.id != null && item.summary != null
      ) as CalendarEvent[];

      console.log('🎯 Filtered events:', filteredItems.length);
      return filteredItems;
    } catch (error) {
      console.error('❌ Error in GoogleCalendarService:', error);
      
      // More specific error handling
      if (error.response) {
        console.error('📄 API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Google Calendar API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        console.error('🌐 Network Error:', error.request);
        throw new Error('Network error connecting to Google Calendar API');
      } else {
        console.error('⚙️ Setup Error:', error.message);
        throw new Error(`Calendar service error: ${error.message}`);
      }
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      const event = response.data;
      if (!event.id || !event.summary) {
        return null;
      }

      return event as CalendarEvent;
    } catch (error) {
      console.error('Error fetching calendar event:', error);
      return null;
    }
  }

  /**
   * Detect meeting platform and extract meeting URL from calendar event
   */
  static detectMeetingPlatform(event: CalendarEvent): MeetingPlatform | null {
    const sources = [
      event.location,
      event.description,
      event.hangoutLink,
      ...(event.conferenceData?.entryPoints?.map(ep => ep.uri) || [])
    ].filter(Boolean);

    for (const source of sources) {
      if (!source) continue;

      // Zoom detection
      const zoomMatch = source.match(/zoom\.us\/j\/(\d+)/i);
      if (zoomMatch) {
        return {
          platform: 'zoom',
          url: source.includes('http') ? source : `https://zoom.us/j/${zoomMatch[1]}`,
          meetingId: zoomMatch[1]
        };
      }

      // Microsoft Teams detection
      if (source.includes('teams.microsoft.com') || source.includes('teams.live.com')) {
        return {
          platform: 'teams',
          url: source
        };
      }

      // Google Meet detection
      if (source.includes('meet.google.com')) {
        return {
          platform: 'meet',
          url: source
        };
      }

      // Generic meeting URL detection
      const urlMatch = source.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch && this.isMeetingUrl(urlMatch[1])) {
        return {
          platform: 'other',
          url: urlMatch[1]
        };
      }
    }

    return null;
  }

  private static isMeetingUrl(url: string): boolean {
    const meetingDomains = [
      'zoom.us',
      'teams.microsoft.com',
      'teams.live.com',
      'meet.google.com',
      'webex.com',
      'gotomeeting.com',
      'join.me',
      'bluejeans.com',
      'whereby.com',
      'jitsi.org'
    ];

    return meetingDomains.some(domain => url.toLowerCase().includes(domain));
  }

  /**
   * Get attendee count from calendar event
   */
  static getAttendeeCount(event: CalendarEvent): number {
    if (!event.attendees) return 0;
    return event.attendees.filter(attendee => 
      attendee.responseStatus !== 'declined'
    ).length;
  }

  /**
   * Check if event is happening soon (within X minutes)
   */
  static isEventStartingSoon(event: CalendarEvent, minutesBefore: number = 5): boolean {
    if (!event.start.dateTime) return false;

    const eventStart = new Date(event.start.dateTime);
    const now = new Date();
    const timeDiff = eventStart.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff <= minutesBefore && minutesDiff > -60; // Starting soon or started within last hour
  }

  /**
   * Format event time for display
   */
  static formatEventTime(event: CalendarEvent): string {
    if (!event.start.dateTime || !event.end.dateTime) {
      return 'All day';
    }

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${startTime} - ${endTime}`;
  }

  /**
   * Get event duration in minutes
   */
  static getEventDuration(event: CalendarEvent): number {
    if (!event.start.dateTime || !event.end.dateTime) return 0;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }
}
