import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { meetings, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { aiService, MeetingContext } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, tone = 'professional' } = body;

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

    // Fetch the meeting with its transcript
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      with: {
        transcript: true
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Verify the meeting belongs to the current user
    if (meeting.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!meeting.transcript?.content) {
      return NextResponse.json({ error: 'No transcript available for this meeting' }, { status: 400 });
    }

    // Parse attendees
    let attendees: Array<{ id: string; name: string }> = [];
    try {
      const attendeesData = JSON.parse(meeting.transcript.attendees || '[]');
      attendees = Array.isArray(attendeesData) ? attendeesData : [];
    } catch {
      attendees = [];
    }

    // Prepare meeting context for AI
    const context: MeetingContext = {
      title: meeting.title,
      transcript: meeting.transcript.content,
      attendees: attendees,
      duration: meeting.transcript.duration || 0,
      platform: meeting.platform || 'unknown',
      date: meeting.startTime.toISOString()
    };

    // Generate follow-up email using AI
    const generatedEmail = await aiService.generateFollowUpEmail(context, tone);

    return NextResponse.json({
      success: true,
      email: generatedEmail
    });

  } catch (error) {
    console.error('Error generating follow-up email:', error);
    return NextResponse.json(
      { error: 'Failed to generate follow-up email' },
      { status: 500 }
    );
  }
}
