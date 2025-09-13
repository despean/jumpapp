import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // Get user settings
    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id)
    });

    // Create default settings if they don't exist
    if (!settings) {
      const [newSettings] = await db.insert(userSettings).values({
        userId: user.id,
        botJoinMinutes: 2,
        defaultNotetaker: true,
        notifications: true
      }).returning();
      
      settings = newSettings;
    }

    return NextResponse.json({
      botJoinMinutes: settings.botJoinMinutes,
      defaultNotetaker: settings.defaultNotetaker,
      notifications: settings.notifications
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
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
    const { botJoinMinutes, defaultNotetaker, notifications } = body;

    // Validate bot join minutes
    if (botJoinMinutes < 1 || botJoinMinutes > 15) {
      return NextResponse.json({ 
        error: 'Bot join minutes must be between 1 and 15' 
      }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update or create user settings
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id)
    });

    if (existingSettings) {
      await db.update(userSettings)
        .set({
          botJoinMinutes,
          defaultNotetaker,
          notifications,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, user.id));
    } else {
      await db.insert(userSettings).values({
        userId: user.id,
        botJoinMinutes,
        defaultNotetaker,
        notifications
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
