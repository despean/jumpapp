import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { meetings, transcripts, bots } from '@/lib/db/schema';
import { RecallAIService } from '@/lib/recall-ai';
import { logger } from '@/lib/logger';

// Webhook payload types from Recall.ai
interface RecallWebhookEvent {
  event: string;
  data: {
    bot_id: string;
    recording_id?: string;
    transcript?: {
      text: string;
      speaker?: string;
      timestamp?: number;
    };
    status_change?: {
      code: string;
      message: string;
    };
  };
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    logger.info('🔗 Received Recall.ai webhook');
    
    // Verify webhook signature if configured
    const signature = request.headers.get('x-recall-signature');
    const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      // TODO: Implement signature verification for production
      logger.info('🔐 Webhook signature verification would go here');
    }

    const payload: RecallWebhookEvent = await request.json();
    logger.info('📨 Webhook event:', 'API', payload.event, 'for bot:', payload.data.bot_id);

    const { event, data } = payload;
    const botId = data.bot_id;

    // Find the meeting associated with this bot
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.botId, botId)
    });

    if (!meeting) {
      logger.info(`⚠️ No meeting found for bot ${botId}`);
      return NextResponse.json({ message: 'Bot not found in database' }, { status: 404 });
    }

    switch (event) {
      case 'bot.status_change':
        await handleBotStatusChange(meeting, data);
        break;
        
      case 'transcript.data':
        await handleTranscriptData(meeting, data);
        break;
        
      case 'transcript.partial_data':
        // Handle partial transcript data (real-time updates)
        logger.info('📝 Partial transcript received:', 'API', data.transcript?.text?.substring(0, 50) + '...');
        break;
        
      default:
        logger.info(`ℹ️ Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    logger.error('❌ Error processing Recall.ai webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleBotStatusChange(meeting: any, data: any) {
  const statusCode = data.status_change?.code;
  logger.info(`🔄 Bot status changed to: ${statusCode}`);

  switch (statusCode) {
    case 'call_ended':
    case 'done':
      logger.info('✅ Meeting ended, updating status and checking for transcript...');
      
      // Update meeting status
      await db.update(meetings)
        .set({
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meeting.id));

      // Try to get transcript immediately
      try {
        const recallService = new RecallAIService();
        const transcript = await recallService.getBotTranscript(meeting.botId);
        
        if (transcript) {
          await saveTranscriptToDatabase(meeting, transcript);
        } else {
          logger.info('⏳ Transcript not ready yet, will be picked up by polling');
        }
      } catch (error) {
        logger.error('❌ Error getting transcript after status change:', error);
      }
      break;
      
    case 'error':
      logger.info('❌ Bot encountered an error');
      await db.update(meetings)
        .set({
          status: 'error',
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meeting.id));
      break;
  }
}

async function handleTranscriptData(meeting: any, data: any) {
  logger.info('📝 Final transcript data received');
  
  // This is called when the full transcript is ready
  try {
    const recallService = new RecallAIService();
    const transcript = await recallService.getBotTranscript(meeting.botId);
    
    if (transcript) {
      await saveTranscriptToDatabase(meeting, transcript);
    }
  } catch (error) {
    logger.error('❌ Error processing transcript data:', error);
  }
}

async function saveTranscriptToDatabase(meeting: any, transcript: any) {
  // Check if transcript already exists
  const existingTranscript = await db.query.transcripts.findFirst({
    where: eq(transcripts.meetingId, meeting.id)
  });

  if (existingTranscript) {
    logger.info('📝 Transcript already exists, skipping save');
    return;
  }

  // Extract attendee information
  const attendees = transcript.speakers.map((speaker: any) => ({
    id: speaker.id,
    name: speaker.name,
  }));

  // Calculate duration from transcript words
  const duration = transcript.words.length > 0 
    ? Math.round(transcript.words[transcript.words.length - 1].end_time / 60)
    : 0;

  // Save transcript to database
  const [savedTranscript] = await db.insert(transcripts).values({
    meetingId: meeting.id,
    botId: meeting.botId,
    content: transcript.transcript_text,
    attendees: JSON.stringify(attendees),
    duration,
    processedAt: new Date(),
  }).returning();

  logger.info('✅ Transcript saved to database:', 'API', savedTranscript.id);
}
