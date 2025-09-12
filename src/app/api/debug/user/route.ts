import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
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
      return NextResponse.json({ 
        error: 'User not found in database',
        sessionUser: session.user 
      });
    }

    // Get all accounts for this user
    const userAccounts = await db.query.accounts.findMany({
      where: eq(accounts.userId, user.id)
    });

    return NextResponse.json({
      session: {
        user: session.user,
        expires: session.expires
      },
      database: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        },
        accounts: userAccounts.map(account => ({
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
          scope: account.scope
        }))
      }
    });
    
  } catch (error) {
    console.error('Debug user error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user debug info',
      details: error.message 
    }, { status: 500 });
  }
}
