import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { meetings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { RecallAIService } from '@/lib/recall-ai';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID required' }, { status: 400 });
    }

    // Get meeting with this bot ID
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.botId, botId),
      with: {
        transcript: true
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Get raw data from Recall.ai
    const recallService = new RecallAIService();
    
    console.log(`🔍 Debug: Fetching bot data for ${botId}`);
    
    // Get bot status
    const botData = await recallService.getBot(botId);
    console.log(`🔍 Debug: Bot data:`, JSON.stringify(botData, null, 2));
    
    // Check if bot is ready
    const readiness = await recallService.isBotReady(botId);
    console.log(`🔍 Debug: Bot readiness:`, readiness);
    
    // Try to get transcript
    let recallTranscript = null;
    try {
      recallTranscript = await recallService.getBotTranscript(botId);
      console.log(`🔍 Debug: Recall transcript:`, {
        hasTranscript: !!recallTranscript,
        contentLength: recallTranscript?.transcript_text?.length || 0,
        wordsCount: recallTranscript?.words?.length || 0,
        speakersCount: recallTranscript?.speakers?.length || 0
      });
    } catch (error) {
      console.log(`🔍 Debug: Error getting transcript:`, error);
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        botId: meeting.botId
      },
      databaseTranscript: {
        exists: !!meeting.transcript,
        content: meeting.transcript?.content || null,
        contentLength: meeting.transcript?.content?.length || 0,
        attendees: meeting.transcript?.attendees || null,
        duration: meeting.transcript?.duration || null
      },
      recallBotData: {
        status: botData.status,
        statusChanges: botData.status_changes,
        recordings: botData.recordings?.map(r => ({
          id: r.id,
          status: r.status,
          hasMediaShortcuts: !!r.media_shortcuts,
          transcriptStatus: r.media_shortcuts?.transcript?.status,
          transcriptDownloadUrl: r.media_shortcuts?.transcript?.data?.download_url
        })) || []
      },
      recallReadiness: readiness,
      recallTranscript: recallTranscript ? {
        id: recallTranscript.id,
        contentLength: recallTranscript.transcript_text?.length || 0,
        wordsCount: recallTranscript.words?.length || 0,
        speakersCount: recallTranscript.speakers?.length || 0,
        sampleContent: recallTranscript.transcript_text?.substring(0, 200) || null
      } : null
    });

  } catch (error) {
    console.error('❌ Error in transcript debug:', error);
    return NextResponse.json(
      { error: 'Failed to debug transcript data', details: String(error) },
      { status: 500 }
    );
  }
}
