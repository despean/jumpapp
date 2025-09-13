import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if OAuth credentials are configured
    const linkedinConfigured = !!(
      process.env.LINKEDIN_CLIENT_ID && 
      process.env.LINKEDIN_CLIENT_SECRET
    );

    const facebookConfigured = !!(
      process.env.FACEBOOK_CLIENT_ID && 
      process.env.FACEBOOK_CLIENT_SECRET
    );

    return NextResponse.json({
      linkedin: linkedinConfigured,
      facebook: facebookConfigured
    });

  } catch (error) {
    logger.error('Error checking OAuth status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
