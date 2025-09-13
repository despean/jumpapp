import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, linkedinAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
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

    if (!linkedinAccount) {
      return NextResponse.json({ 
        error: 'LinkedIn account not connected. Please connect your LinkedIn account first.' 
      }, { status: 400 });
    }

    // Check if access token is still valid
    if (linkedinAccount.expiresAt && new Date() > linkedinAccount.expiresAt) {
      return NextResponse.json({ 
        error: 'LinkedIn access token expired. Please reconnect your LinkedIn account.' 
      }, { status: 401 });
    }

    try {
      // Post to LinkedIn using their API
      const linkedinResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${linkedinAccount.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          author: `urn:li:person:${linkedinAccount.linkedinId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        })
      });

      if (!linkedinResponse.ok) {
        const errorData = await linkedinResponse.text();
        console.error('LinkedIn API Error:', errorData);
        return NextResponse.json({ 
          error: 'Failed to post to LinkedIn. Please try again or reconnect your account.' 
        }, { status: 400 });
      }

      const responseData = await linkedinResponse.json();

      return NextResponse.json({
        success: true,
        message: 'Successfully posted to LinkedIn',
        postId: responseData.id
      });

    } catch (error) {
      console.error('Error posting to LinkedIn:', error);
      return NextResponse.json({ 
        error: 'Failed to post to LinkedIn. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in LinkedIn post endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
