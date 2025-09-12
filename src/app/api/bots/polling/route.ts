import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { botPollingService } from '@/lib/bot-poller';

// GET - Get polling service status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = botPollingService.getStatus();
    
    return NextResponse.json({
      polling: status,
      message: status.running ? 'Polling service is active' : 'Polling service is stopped'
    });

  } catch (error) {
    console.error('❌ Error getting polling status:', error);
    return NextResponse.json(
      { error: 'Failed to get polling status' },
      { status: 500 }
    );
  }
}

// POST - Control polling service (start/stop/force-poll)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case 'start':
        botPollingService.start();
        return NextResponse.json({ 
          message: 'Polling service started',
          status: botPollingService.getStatus()
        });

      case 'stop':
        botPollingService.stop();
        return NextResponse.json({ 
          message: 'Polling service stopped',
          status: botPollingService.getStatus()
        });

      case 'force-poll':
        await botPollingService.forcePoll();
        return NextResponse.json({ 
          message: 'Force poll completed',
          status: botPollingService.getStatus()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or force-poll' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Error controlling polling service:', error);
    return NextResponse.json(
      { error: 'Failed to control polling service' },
      { status: 500 }
    );
  }
}
