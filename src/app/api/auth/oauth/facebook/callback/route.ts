import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, facebookAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/settings?error=facebook_${error}`, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', request.url));
    }

    // Decode state to get user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url));
    }

    const { userId: userEmail } = stateData;

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail)
    });

    if (!user) {
      return NextResponse.redirect(new URL('/settings?error=user_not_found', request.url));
    }

    // Exchange code for access token
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/oauth/facebook/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/settings?error=facebook_not_configured', request.url));
    }

    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Facebook token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    // Get Facebook profile info
    const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,email&access_token=${access_token}`);

    if (!profileResponse.ok) {
      console.error('Failed to fetch Facebook profile');
      return NextResponse.redirect(new URL('/settings?error=profile_fetch_failed', request.url));
    }

    const profileData = await profileResponse.json();
    const facebookId = profileData.id;

    // Calculate expiry date (Facebook tokens typically expire in 60 days)
    const expiresAt = new Date(Date.now() + (expires_in ? expires_in * 1000 : 60 * 24 * 60 * 60 * 1000));

    // Save or update Facebook account
    const existingAccount = await db.query.facebookAccounts.findFirst({
      where: eq(facebookAccounts.userId, user.id)
    });

    if (existingAccount) {
      await db.update(facebookAccounts)
        .set({
          facebookId,
          accessToken: access_token,
          expiresAt,
          updatedAt: new Date()
        })
        .where(eq(facebookAccounts.userId, user.id));
    } else {
      await db.insert(facebookAccounts).values({
        userId: user.id,
        facebookId,
        accessToken: access_token,
        expiresAt
      });
    }

    return NextResponse.redirect(new URL('/settings?success=facebook_connected', request.url));

  } catch (error) {
    console.error('Error in Facebook OAuth callback:', error);
    return NextResponse.redirect(new URL('/settings?error=oauth_callback_error', request.url));
  }
}
