import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, linkedinAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/settings?error=linkedin_${error}`, request.url));
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
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/oauth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/settings?error=linkedin_not_configured', request.url));
    }

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    // Get LinkedIn profile info
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,emailAddress)', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch LinkedIn profile');
      return NextResponse.redirect(new URL('/settings?error=profile_fetch_failed', request.url));
    }

    const profileData = await profileResponse.json();
    const linkedinId = profileData.id;

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Save or update LinkedIn account
    const existingAccount = await db.query.linkedinAccounts.findFirst({
      where: eq(linkedinAccounts.userId, user.id)
    });

    if (existingAccount) {
      await db.update(linkedinAccounts)
        .set({
          linkedinId,
          accessToken: access_token,
          expiresAt,
          updatedAt: new Date()
        })
        .where(eq(linkedinAccounts.userId, user.id));
    } else {
      await db.insert(linkedinAccounts).values({
        userId: user.id,
        linkedinId,
        accessToken: access_token,
        expiresAt
      });
    }

    return NextResponse.redirect(new URL('/settings?success=linkedin_connected', request.url));

  } catch (error) {
    console.error('Error in LinkedIn OAuth callback:', error);
    return NextResponse.redirect(new URL('/settings?error=oauth_callback_error', request.url));
  }
}
