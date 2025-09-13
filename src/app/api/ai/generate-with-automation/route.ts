import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, meetings, automations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { aiService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, automationId } = body;

    if (!meetingId || !automationId) {
      return NextResponse.json({ 
        error: 'Meeting ID and automation ID are required' 
      }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get meeting and verify ownership
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, user.id)
      ),
      with: {
        transcript: true
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (!meeting.transcript?.content) {
      return NextResponse.json({ 
        error: 'No transcript available for this meeting' 
      }, { status: 400 });
    }

    // Get automation and verify ownership
    const automation = await db.query.automations.findFirst({
      where: and(
        eq(automations.id, automationId),
        eq(automations.userId, user.id),
        eq(automations.enabled, true)
      )
    });

    if (!automation) {
      return NextResponse.json({ 
        error: 'Automation not found or disabled' 
      }, { status: 404 });
    }

    // Prepare meeting context
    const meetingContext = {
      title: meeting.title,
      transcript: meeting.transcript.content,
      duration: meeting.transcript.duration || 0,
      attendees: meeting.transcript.attendees ? JSON.parse(meeting.transcript.attendees) : [],
      summary: meeting.transcript.summary
    };

    // Generate post using automation template
    const generatedPost = await aiService.generatePostWithAutomation(
      meetingContext,
      {
        platform: automation.platform,
        template: automation.template,
        name: automation.name
      }
    );

    return NextResponse.json({
      post: generatedPost,
      automation: {
        id: automation.id,
        name: automation.name,
        platform: automation.platform
      }
    });

  } catch (error) {
    console.error('Error generating post with automation:', error);
    return NextResponse.json(
      { error: 'Failed to generate post with automation' },
      { status: 500 }
    );
  }
}
