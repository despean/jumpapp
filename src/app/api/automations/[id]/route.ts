import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, automations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, platform, template, enabled } = body;

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

    // Check if automation exists and belongs to user
    const existingAutomation = await db.query.automations.findFirst({
      where: and(
        eq(automations.id, id),
        eq(automations.userId, user.id)
      )
    });

    if (!existingAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Update automation
    const [updatedAutomation] = await db.update(automations)
      .set({
        name,
        platform,
        template,
        enabled,
        autoPost: false,
        updatedAt: new Date()
      })
      .where(eq(automations.id, id))
      .returning();

    return NextResponse.json(updatedAutomation);

  } catch (error) {
    console.error('Error updating automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if automation exists and belongs to user
    const existingAutomation = await db.query.automations.findFirst({
      where: and(
        eq(automations.id, id),
        eq(automations.userId, user.id)
      )
    });

    if (!existingAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Update only provided fields
    const [updatedAutomation] = await db.update(automations)
      .set({
        ...body,
        updatedAt: new Date()
      })
      .where(eq(automations.id, id))
      .returning();

    return NextResponse.json(updatedAutomation);

  } catch (error) {
    console.error('Error updating automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if automation exists and belongs to user
    const existingAutomation = await db.query.automations.findFirst({
      where: and(
        eq(automations.id, id),
        eq(automations.userId, user.id)
      )
    });

    if (!existingAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Delete automation
    await db.delete(automations)
      .where(eq(automations.id, id));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting automation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
