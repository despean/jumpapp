import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    nodeEnv: process.env.NODE_ENV,
    nextauthUrl: process.env.NEXTAUTH_URL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasRecallApiKey: !!process.env.RECALL_AI_API_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    // Don't expose actual secrets, just their presence/length
  };

  return NextResponse.json(config);
}
