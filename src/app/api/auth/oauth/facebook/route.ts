import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
    }

    // Check if Facebook OAuth is configured
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/oauth/facebook/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/settings?error=facebook_not_configured', request.url));
    }

    // Facebook OAuth 2.0 authorization URL
    const scope = 'email,pages_manage_posts,pages_read_engagement,publish_to_groups';
    const state = Buffer.from(JSON.stringify({ 
      userId: session.user.email,
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error('Error initiating Facebook OAuth:', error);
    return NextResponse.redirect(new URL('/settings?error=oauth_error', request.url));
  }
}
