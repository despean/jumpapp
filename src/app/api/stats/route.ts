import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, meetings, socialMediaPosts, automations } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
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

    // Get total meetings count
    const totalMeetingsResult = await db
      .select({ count: count() })
      .from(meetings)
      .where(eq(meetings.userId, user.id));

    // Get posts generated count
    const postsGeneratedResult = await db
      .select({ count: count() })
      .from(socialMediaPosts)
      .where(eq(socialMediaPosts.userId, user.id));

    // Get active automations count
    const automationsResult = await db
      .select({ count: count() })
      .from(automations)
      .where(and(
        eq(automations.userId, user.id),
        eq(automations.enabled, true)
      ));

    const stats = {
      totalMeetings: totalMeetingsResult[0]?.count || 0,
      postsGenerated: postsGeneratedResult[0]?.count || 0,
      automations: automationsResult[0]?.count || 0
    };

    return NextResponse.json(stats);

  } catch (error) {
    logger.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
