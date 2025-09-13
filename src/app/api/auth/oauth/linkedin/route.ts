import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
    }

    // Check if LinkedIn OAuth is configured
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/oauth/linkedin/callback`;

    if (!clientId) {
      return NextResponse.redirect(new URL('/settings?error=linkedin_not_configured', request.url));
    }

    // LinkedIn OAuth 2.0 authorization URL
    const scope = 'r_liteprofile r_emailaddress w_member_social';
    const state = Buffer.from(JSON.stringify({ 
      userId: session.user.email,
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scope);

    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error('Error initiating LinkedIn OAuth:', error);
    return NextResponse.redirect(new URL('/settings?error=oauth_error', request.url));
  }
}
