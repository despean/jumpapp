import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, linkedinAccounts, facebookAccounts } from '@/lib/db/schema';
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

    // Get LinkedIn account
    const linkedinAccount = await db.query.linkedinAccounts.findFirst({
      where: eq(linkedinAccounts.userId, user.id)
    });

    // Get Facebook account
    const facebookAccount = await db.query.facebookAccounts.findFirst({
      where: eq(facebookAccounts.userId, user.id)
    });

    const accounts = [
      {
        id: 'linkedin',
        platform: 'linkedin' as const,
        connected: !!linkedinAccount,
        email: linkedinAccount ? user.email : undefined,
        expiresAt: linkedinAccount?.expiresAt?.toISOString()
      },
      {
        id: 'facebook',
        platform: 'facebook' as const,
        connected: !!facebookAccount,
        email: facebookAccount ? user.email : undefined,
        expiresAt: facebookAccount?.expiresAt?.toISOString()
      }
    ];

    return NextResponse.json(accounts);

  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
