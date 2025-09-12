import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { meetings, users, transcripts } from '@/lib/db/schema';

interface RouteParams {
  params: {
    meetingId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    console.log('📄 Fetching transcript for meeting:', meetingId);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify meeting belongs to user and get meeting info
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, user.id)
      )
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
    }

    // Get transcript
    const transcript = await db.query.transcripts.findFirst({
      where: eq(transcripts.meetingId, meetingId)
    });

    if (!transcript) {
      return NextResponse.json({ 
        error: 'Transcript not found',
        meeting: {
          id: meeting.id,
          title: meeting.title,
          status: meeting.status,
          hasBot: !!meeting.botId
        }
      }, { status: 404 });
    }

    // Parse attendees
    const attendees = transcript.attendees 
      ? JSON.parse(transcript.attendees) 
      : [];

    console.log('✅ Transcript found:', {
      meetingId,
      contentLength: transcript.content?.length || 0,
      attendeeCount: attendees.length,
      duration: transcript.duration
    });

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        platform: meeting.platform,
        attendeesCount: meeting.attendeesCount
      },
      transcript: {
        id: transcript.id,
        content: transcript.content,
        summary: transcript.summary,
        attendees: attendees,
        duration: transcript.duration,
        processedAt: transcript.processedAt,
        createdAt: transcript.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch transcript',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
