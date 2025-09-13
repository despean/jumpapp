import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, automations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

    // Get user's automations
    const userAutomations = await db.query.automations.findMany({
      where: eq(automations.userId, user.id),
      orderBy: (automations, { desc }) => [desc(automations.createdAt)]
    });

    return NextResponse.json(userAutomations);

  } catch (error) {
    logger.error('Error fetching automations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, platform, template, enabled = true } = body;

    // Validate required fields
    if (!name || !platform || !template) {
      return NextResponse.json({ 
        error: 'Name, platform, and template are required' 
      }, { status: 400 });
    }

    // Validate platform
    if (platform !== 'linkedin' && platform !== 'facebook') {
      return NextResponse.json({ 
        error: 'Platform must be either "linkedin" or "facebook"' 
      }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create automation
    const [newAutomation] = await db.insert(automations).values({
      userId: user.id,
      name,
      platform,
      template,
      enabled,
      autoPost: false
    }).returning();

    return NextResponse.json(newAutomation, { status: 201 });

  } catch (error) {
    logger.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
