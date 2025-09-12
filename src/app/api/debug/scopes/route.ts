import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { accounts, users } from '@/lib/db/schema';

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

    // Get Google account
    const googleAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, 'google')
      )
    });

    if (!googleAccount) {
      return NextResponse.json({ error: 'Google account not found' }, { status: 404 });
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = googleAccount.expires_at ? now >= googleAccount.expires_at : false;

    return NextResponse.json({
      scopes: googleAccount.scope ? googleAccount.scope.split(' ') : [],
      rawScope: googleAccount.scope,
      hasCalendarScope: googleAccount.scope?.includes('calendar') || false,
      hasCalendarReadonlyScope: googleAccount.scope?.includes('calendar.readonly') || false,
      hasCalendarEventsScope: googleAccount.scope?.includes('calendar.events.readonly') || false,
      tokenInfo: {
        hasAccessToken: !!googleAccount.access_token,
        hasRefreshToken: !!googleAccount.refresh_token,
        expiresAt: googleAccount.expires_at,
        isExpired,
        expiresInMinutes: googleAccount.expires_at ? Math.floor((googleAccount.expires_at - now) / 60) : null
      }
    });
    
  } catch (error) {
    console.error('Debug scopes error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch scope info',
      details: error.message 
    }, { status: 500 });
  }
}
