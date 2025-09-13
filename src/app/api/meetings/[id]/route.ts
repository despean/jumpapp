import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { meetings, transcripts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;

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
    if (meeting.userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        platform: meeting.platform,
        startTime: meeting.startTime,
        duration: meeting.duration,
        attendees: meeting.attendees,
        status: meeting.status,
        transcript: meeting.transcript ? {
          content: meeting.transcript.content,
          duration: meeting.transcript.duration,
          attendees: meeting.transcript.attendees
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching meeting details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
