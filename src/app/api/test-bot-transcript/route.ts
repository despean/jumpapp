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

    console.log('🧪 TESTING: Bot transcript detection for:', botId);

    const recallService = new RecallAIService();
    
    // Test our enhanced detection
    const readinessResult = await recallService.isBotReady(botId);
    console.log('🔍 Readiness result:', readinessResult);
    
    // Try to get the transcript directly
    let transcriptResult = null;
    let transcriptError = null;
    
    try {
      transcriptResult = await recallService.getBotTranscript(botId);
      console.log('📄 Direct transcript fetch result:', transcriptResult ? 'SUCCESS' : 'NULL');
      if (transcriptResult) {
        console.log('📄 Transcript details:', {
          length: transcriptResult.transcript_text.length,
          speakers: transcriptResult.speakers.length,
          words: transcriptResult.words.length
        });
      }
    } catch (error) {
      transcriptError = String(error);
      console.log('❌ Direct transcript fetch error:', transcriptError);
    }

    return NextResponse.json({
      botId,
      timestamp: new Date().toISOString(),
      readinessCheck: readinessResult,
      directTranscriptFetch: {
        success: !!transcriptResult,
        error: transcriptError,
        hasContent: !!transcriptResult?.transcript_text,
        contentLength: transcriptResult?.transcript_text?.length || 0,
        speakersCount: transcriptResult?.speakers?.length || 0,
        wordsCount: transcriptResult?.words?.length || 0
      },
      conclusion: {
        botReady: readinessResult.isReady,
        transcriptDetected: readinessResult.hasTranscript,
        transcriptFetchable: !!transcriptResult,
        shouldSaveTranscript: readinessResult.isReady && !!transcriptResult
      }
    });

  } catch (error) {
    console.error('❌ TEST: Error testing bot transcript:', error);
    
    return NextResponse.json({ 
      error: 'Failed to test bot transcript',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
