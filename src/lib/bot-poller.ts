/**
 * Background polling service for Recall.ai bots
 * 
 * Since we're using a shared Recall.ai account, we can't use webhooks.
 * This service polls active bots to check for transcript availability.
 */

import { RecallAIService } from './recall-ai';
import { db } from './db';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { meetings, transcripts } from './db/schema';

export class BotPollingService {
  private static instance: BotPollingService;
  private polling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_POLL_ATTEMPTS = 240; // 2 hours max (240 * 30s)
  
  private constructor() {}

  static getInstance(): BotPollingService {
    if (!BotPollingService.instance) {
      BotPollingService.instance = new BotPollingService();
    }
    return BotPollingService.instance;
  }

  /**
   * Start the background polling service
   */
  start(): void {
    if (this.polling) {
      console.log('📊 Bot polling service already running');
      return;
    }

    console.log('🚀 Starting bot polling service...');
    this.polling = true;
    
    // Poll immediately, then every 30 seconds
    this.pollActiveBots();
    this.pollInterval = setInterval(() => {
      this.pollActiveBots();
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Stop the background polling service
   */
  stop(): void {
    if (!this.polling) {
      return;
    }

    console.log('🛑 Stopping bot polling service...');
    this.polling = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Poll all active bots for status and transcript updates
   */
  private async pollActiveBots(): Promise<void> {
    try {
      console.log('🔍 Polling active bots...');

      // Get all meetings with active bots (including completed ones without transcripts)
      const activeMeetings = await db.query.meetings.findMany({
        where: and(
          isNotNull(meetings.botId),
          inArray(meetings.status, ['scheduled', 'in_progress', 'completed'])
        )
      });

      console.log(`📊 Query found ${activeMeetings.length} meetings with bots:`, 
        activeMeetings.map(m => ({ id: m.id, title: m.title, status: m.status, botId: m.botId })));

      if (activeMeetings.length === 0) {
        console.log('📊 No active bots to poll');
        return;
      }

      // Filter out meetings that already have transcripts
      const meetingsNeedingPoll = [];
      for (const meeting of activeMeetings) {
        if (!meeting.botId) continue;
        
        // Check if transcript already exists
        const existingTranscript = await db.query.transcripts.findFirst({
          where: eq(transcripts.meetingId, meeting.id)
        });
        
        if (!existingTranscript) {
          meetingsNeedingPoll.push(meeting);
        } else {
          console.log(`📝 Meeting "${meeting.title}" already has transcript, skipping`);
        }
      }

      console.log(`📊 Found ${meetingsNeedingPoll.length} meetings needing polling (${activeMeetings.length - meetingsNeedingPoll.length} already have transcripts)`);

      if (meetingsNeedingPoll.length === 0) {
        console.log('📊 No meetings need polling');
        return;
      }

      const recallService = new RecallAIService();
      const results = [];

      for (const meeting of meetingsNeedingPoll) {
        try {
          console.log(`🤖 Polling bot ${meeting.botId} for meeting: "${meeting.title}"`);
          const result = await this.pollSingleBot(recallService, meeting);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error polling bot ${meeting.botId}:`, error);
          results.push({
            meetingId: meeting.id,
            botId: meeting.botId,
            status: 'error',
            error: String(error)
          });
        }
      }

      // Log summary
      const completed = results.filter(r => r.status === 'completed').length;
      const processing = results.filter(r => r.status === 'processing').length;
      const errors = results.filter(r => r.status === 'error').length;

      console.log(`📊 Polling summary: ${completed} completed, ${processing} processing, ${errors} errors`);

    } catch (error) {
      console.error('❌ Error in bot polling service:', error);
    }
  }

  /**
   * Poll a single bot for updates
   */
  private async pollSingleBot(
    recallService: RecallAIService, 
    meeting: any
  ): Promise<{ meetingId: string; botId: string; status: string; transcriptSaved?: boolean }> {
    
    console.log(`🔍 Checking bot ${meeting.botId} status...`);

    // Check bot status and transcript availability
    const { isReady, hasTranscript, status } = await recallService.isBotReady(meeting.botId);
    
    console.log(`📊 Bot ${meeting.botId} results: status="${status}", isReady=${isReady}, hasTranscript=${hasTranscript}`);
    
    // Update meeting status if bot finished
    if (isReady && meeting.status !== 'completed') {
      console.log(`✅ Bot ${meeting.botId} finished, updating meeting status`);
      
      await db.update(meetings)
        .set({
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meeting.id));
    }

    // Handle transcript if available
    if (isReady && hasTranscript) {
      // Check if we already have the transcript
      const existingTranscript = await db.query.transcripts.findFirst({
        where: eq(transcripts.meetingId, meeting.id)
      });

      if (!existingTranscript) {
        console.log(`📝 New transcript available for bot ${meeting.botId}, saving...`);
        
        try {
          const recallTranscript = await recallService.getBotTranscript(meeting.botId);
          
          if (recallTranscript) {
            // Extract attendee information
            const attendees = recallTranscript.speakers.map(speaker => ({
              id: speaker.id,
              name: speaker.name,
            }));

            // Calculate duration from transcript words
            const duration = recallTranscript.words.length > 0 
              ? Math.round(recallTranscript.words[recallTranscript.words.length - 1].end_time / 60)
              : 0;

            // Save transcript to database
            await db.insert(transcripts).values({
              meetingId: meeting.id,
              botId: meeting.botId,
              content: recallTranscript.transcript_text,
              attendees: JSON.stringify(attendees),
              duration,
              processedAt: new Date(),
            });

            console.log(`✅ Transcript saved for meeting: ${meeting.title}`);
            
            return {
              meetingId: meeting.id,
              botId: meeting.botId,
              status: 'completed',
              transcriptSaved: true
            };
          }
        } catch (error) {
          console.error(`❌ Error saving transcript for bot ${meeting.botId}:`, error);
        }
      } else {
        console.log(`📝 Transcript already exists for meeting: ${meeting.title}`);
      }
    }

    // Return current status
    if (status === 'error') {
      // Mark meeting as error if bot failed
      await db.update(meetings)
        .set({
          status: 'error',
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meeting.id));
    }

    return {
      meetingId: meeting.id,
      botId: meeting.botId,
      status: isReady ? 'completed' : 'processing'
    };
  }

  /**
   * Get polling service status
   */
  getStatus(): { running: boolean; intervalMs: number } {
    return {
      running: this.polling,
      intervalMs: this.POLL_INTERVAL_MS
    };
  }

  /**
   * Force a single poll cycle (for testing/manual triggers)
   */
  async forcePoll(): Promise<void> {
    console.log('🔄 Force polling all active bots...');
    await this.pollActiveBots();
  }
}

// Export singleton instance
export const botPollingService = BotPollingService.getInstance();
