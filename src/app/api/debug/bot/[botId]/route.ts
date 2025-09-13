import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';

interface RouteParams {
  params: {
    botId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botId } = await params;

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    console.log('🔍 DEBUG: Detailed bot analysis for:', botId);

    const recallService = new RecallAIService();
    
    // Get raw bot data
    const rawBot = await recallService.getBot(botId);
    console.log('🤖 Raw bot data:', JSON.stringify(rawBot, null, 2));
    
    // Check bot readiness
    const readinessCheck = await recallService.isBotReady(botId);
    console.log('📊 Readiness check:', JSON.stringify(readinessCheck, null, 2));
    
    // Try to get transcript
    let transcriptResult = null;
    let transcriptError = null;
    try {
      transcriptResult = await recallService.getBotTranscript(botId);
      console.log('📄 Transcript result:', transcriptResult ? 'SUCCESS' : 'NULL');
      if (transcriptResult) {
        console.log('📄 Transcript length:', transcriptResult.transcript_text.length);
      }
    } catch (error) {
      transcriptError = String(error);
      console.log('❌ Transcript error:', transcriptError);
    }

    const debugResponse = {
      timestamp: new Date().toISOString(),
      botId,
      rawBot: {
        id: rawBot.id,
        status: rawBot.status,
        meeting_url: rawBot.meeting_url,
        status_changes: rawBot.status_changes,
        recordings: rawBot.recordings,
        created_at: rawBot.created_at,
        updated_at: rawBot.updated_at
      },
      readinessCheck,
      transcript: {
        available: !!transcriptResult,
        error: transcriptError,
        length: transcriptResult?.transcript_text?.length || 0,
        speakers: transcriptResult?.speakers?.length || 0,
        words: transcriptResult?.words?.length || 0
      },
      analysis: {
        botCompleted: rawBot.status === 'done',
        hasRecordings: !!(rawBot.recordings && rawBot.recordings.length > 0),
        recordingCount: rawBot.recordings?.length || 0,
        latestStatusChange: rawBot.status_changes?.[rawBot.status_changes.length - 1],
        shouldHaveTranscript: rawBot.status === 'done' && rawBot.recordings && rawBot.recordings.length > 0
      }
    };

    console.log('🔍 Complete debug analysis:', JSON.stringify(debugResponse, null, 2));

    return NextResponse.json(debugResponse);

  } catch (error) {
    console.error('❌ DEBUG: Error in bot debug endpoint:', error);
    
    return NextResponse.json({ 
      error: 'Failed to debug bot',
      botId: (await params).botId,
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
