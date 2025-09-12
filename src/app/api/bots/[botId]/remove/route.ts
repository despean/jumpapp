import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { meetings, users } from '@/lib/db/schema';

interface RouteParams {
  params: {
    botId: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botId } = params;

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    console.log('🗑️ Delete bot request for:', botId);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      console.log('❌ User not found for email:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify this bot belongs to the user
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.botId, botId),
        eq(meetings.userId, user.id)
      )
    });

    if (!meeting) {
      console.log('❌ Bot not found or access denied for bot:', botId);
      return NextResponse.json({ error: 'Bot not found or access denied' }, { status: 404 });
    }

    console.log('📋 Found meeting for bot deletion:', {
      meetingId: meeting.id,
      title: meeting.title,
      botId: meeting.botId
    });

    // Remove bot tracking from our database (don't delete the actual bot from Recall.ai)
    console.log('🔄 Removing bot tracking from meeting (keeping bot active on Recall.ai)');
    
    await db.update(meetings)
      .set({
        botId: null,
        notetakerEnabled: false,
        status: 'scheduled', // Reset to scheduled
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));

    console.log('✅ Bot tracking removed from meeting');

    return NextResponse.json({
      success: true,
      message: 'Bot removed from meeting tracking',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        botRemoved: true
      },
      note: 'Bot is still active on Recall.ai but no longer tracked for this meeting'
    });

  } catch (error) {
    console.error('❌ Error in bot deletion:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete bot',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
