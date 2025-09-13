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
      // Get all meetings with active bots (including completed ones without transcripts)
      const activeMeetings = await db.query.meetings.findMany({
        where: and(
          isNotNull(meetings.botId),
          inArray(meetings.status, ['scheduled', 'in_progress', 'completed'])
        )
      });

      if (activeMeetings.length === 0) {
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
        }
      }

      if (meetingsNeedingPoll.length === 0) {
        return;
      }

      const recallService = new RecallAIService();
      const results = [];

      for (const meeting of meetingsNeedingPoll) {
        if (!meeting.botId) continue; // Skip meetings without bot IDs
        
        try {
          const result = await this.pollSingleBot(recallService, meeting as { id: string; botId: string; status: string; title: string });
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

    } catch (error) {
      console.error('❌ Error in bot polling service:', error);
    }
  }

  /**
   * Poll a single bot for updates
   */
  private async pollSingleBot(
    recallService: RecallAIService, 
    meeting: { id: string; botId: string; status: string; title: string }
  ): Promise<{ meetingId: string; botId: string; status: string; transcriptSaved?: boolean }> {
    
    // Check bot status and transcript availability
    const { isReady, hasTranscript, status } = await recallService.isBotReady(meeting.botId);
    
    // Update meeting status if bot finished
    if (isReady && meeting.status !== 'completed') {
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
        try {
          const recallTranscript = await recallService.getBotTranscript(meeting.botId);
          
          if (recallTranscript) {
            // Extract attendee information
            const attendees = recallTranscript.speakers?.map(speaker => ({
              id: speaker.id,
              name: speaker.name,
            })) || [];

            // Calculate duration from transcript words
            let duration = 0;
            if (recallTranscript.words && recallTranscript.words.length > 0) {
              const lastWord = recallTranscript.words[recallTranscript.words.length - 1];
              if (lastWord && typeof lastWord.end_time === 'number' && !isNaN(lastWord.end_time)) {
                duration = Math.round(lastWord.end_time / 60);
              }
            }

            // Save transcript to database
            await db.insert(transcripts).values({
              meetingId: meeting.id,
              botId: meeting.botId,
              content: recallTranscript.transcript_text,
              attendees: JSON.stringify(attendees),
              duration,
              processedAt: new Date(),
            });

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
