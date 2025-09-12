import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Facebook OAuth for posting (separate from NextAuth.js)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement Facebook OAuth for posting
  // This will be used to connect Facebook accounts for posting content
  return NextResponse.json({ 
    message: 'Facebook OAuth for posting - Coming soon',
    note: 'This is separate from login authentication'
  });
}
