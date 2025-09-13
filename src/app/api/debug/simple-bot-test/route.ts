import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecallAIService } from '@/lib/recall-ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botId } = await request.json();

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    console.log('🧪 SIMPLE TEST: Testing bot', botId);

    const recallService = new RecallAIService();
    
    // Step 1: Get raw bot data
    console.log('Step 1: Getting raw bot data...');
    const rawBot = await recallService.getBot(botId);
    
    // Step 2: Check what status we actually get
    console.log('Step 2: Bot status analysis...');
    const statusAnalysis = {
      status: rawBot.status,
      isCallEnded: rawBot.status === 'call_ended',
      isDone: rawBot.status === 'done',
      shouldBeReady: rawBot.status === 'call_ended' || rawBot.status === 'done'
    };
    
    // Step 3: Try direct transcript fetch
    console.log('Step 3: Direct transcript fetch...');
    let transcriptResult = null;
    let transcriptError = null;
    
    try {
      transcriptResult = await recallService.getBotTranscript(botId);
    } catch (error) {
      transcriptError = String(error);
    }
    
    // Step 4: Simple conclusion
    const conclusion = {
      botStatus: rawBot.status,
      shouldBeReady: statusAnalysis.shouldBeReady,
      canFetchTranscript: !!transcriptResult,
      transcriptLength: transcriptResult?.transcript_text?.length || 0,
      hasContent: transcriptResult?.transcript_text && transcriptResult.transcript_text.length > 0,
      recommendation: statusAnalysis.shouldBeReady && !!transcriptResult ? 'SAVE_TRANSCRIPT' : 'WAIT_OR_ERROR'
    };

    return NextResponse.json({
      botId,
      timestamp: new Date().toISOString(),
      rawBotStatus: rawBot.status,
      statusAnalysis,
      transcriptFetch: {
        success: !!transcriptResult,
        error: transcriptError,
        contentLength: transcriptResult?.transcript_text?.length || 0,
        hasContent: conclusion.hasContent
      },
      conclusion
    });

  } catch (error) {
    console.error('❌ SIMPLE TEST: Error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to test bot',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
