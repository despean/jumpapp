import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, linkedinAccounts, facebookAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = params;

    if (platform !== 'linkedin' && platform !== 'facebook') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the appropriate account
    if (platform === 'linkedin') {
      await db.delete(linkedinAccounts)
        .where(eq(linkedinAccounts.userId, user.id));
    } else if (platform === 'facebook') {
      await db.delete(facebookAccounts)
        .where(eq(facebookAccounts.userId, user.id));
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`Error disconnecting ${params.platform} account:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
