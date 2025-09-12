import axios, { AxiosResponse } from 'axios';

// Recall.ai API types
export interface RecallBot {
  id: string;
  meeting_url: string;
  status: 'starting' | 'joining_call' | 'in_call_not_recording' | 'in_call_recording' | 'call_ended' | 'error';
  status_changes: Array<{
    code: string;
    message: string;
    created_at: string;
  }>;
  media_retention_end: string;
  recording_config: {
    participant_events?: boolean;
    transcription?: boolean;
    chat?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface RecallBotCreate {
  meeting_url: string;
  bot_name?: string;
  recording_config?: {
    participant_events?: boolean;
    transcription?: boolean;
    chat?: boolean;
  };
  real_time_transcription?: {
    destination_url?: string;
  };
}

export interface RecallTranscript {
  id: string;
  bot_id: string;
  transcript_text: string;
  words: Array<{
    text: string;
    start_time: number;
    end_time: number;
    speaker?: string;
  }>;
  speakers: Array<{
    id: string;
    name: string;
  }>;
  created_at: string;
}

export interface RecallMedia {
  id: string;
  bot_id: string;
  media_url: string;
  media_type: 'audio' | 'video';
  duration: number;
  created_at: string;
}

export class RecallAIService {
  private apiKey: string;
  private baseURL: string = 'https://api.recall.ai/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RECALL_AI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Recall.ai API key is required');
    }
  }

  private get headers() {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new bot to join a meeting
   */
  async createBot(config: RecallBotCreate): Promise<RecallBot> {
    try {
      console.log('🤖 Creating Recall.ai bot for:', config.meeting_url);
      
      const response: AxiosResponse<RecallBot> = await axios.post(
        `${this.baseURL}/bot/`,
        {
          meeting_url: config.meeting_url,
          bot_name: config.bot_name || 'JumpApp Meeting Bot',
          recording_config: {
            participant_events: true,
            transcription: true,
            chat: true,
            ...config.recording_config,
          },
          ...config,
        },
        { headers: this.headers }
      );

      console.log('✅ Bot created successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create bot:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Recall.ai bot creation failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get bot status and information
   */
  async getBot(botId: string): Promise<RecallBot> {
    try {
      const response: AxiosResponse<RecallBot> = await axios.get(
        `${this.baseURL}/bot/${botId}/`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get bot ${botId}:`, error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to get bot: ${message}`);
      }
      throw error;
    }
  }

  /**
   * List all bots (filtered by our API key)
   */
  async listBots(): Promise<{ results: RecallBot[] }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/bot/`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Failed to list bots:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to list bots: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get transcript for a bot
   */
  async getBotTranscript(botId: string): Promise<RecallTranscript | null> {
    try {
      const response: AxiosResponse<{ results: RecallTranscript[] }> = await axios.get(
        `${this.baseURL}/bot/${botId}/transcript/`,
        { headers: this.headers }
      );

      // Return the first (and usually only) transcript
      return response.data.results[0] || null;
    } catch (error) {
      console.error(`❌ Failed to get transcript for bot ${botId}:`, error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Transcript not ready yet
        return null;
      }
      throw error;
    }
  }

  /**
   * Get media (audio/video) for a bot
   */
  async getBotMedia(botId: string): Promise<RecallMedia[]> {
    try {
      const response: AxiosResponse<{ results: RecallMedia[] }> = await axios.get(
        `${this.baseURL}/bot/${botId}/media/`,
        { headers: this.headers }
      );

      return response.data.results;
    } catch (error) {
      console.error(`❌ Failed to get media for bot ${botId}:`, error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Media not ready yet
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if a bot has finished recording and has transcript available
   */
  async isBotReady(botId: string): Promise<boolean> {
    try {
      const bot = await this.getBot(botId);
      return bot.status === 'call_ended';
    } catch (error) {
      console.error(`❌ Failed to check if bot ${botId} is ready:`, error);
      return false;
    }
  }

  /**
   * Wait for a bot to finish and return transcript
   * This uses polling since we can't use webhooks with shared API key
   */
  async waitForBotCompletion(
    botId: string, 
    maxWaitMinutes: number = 120,
    pollIntervalSeconds: number = 30
  ): Promise<RecallTranscript | null> {
    const maxAttempts = Math.floor((maxWaitMinutes * 60) / pollIntervalSeconds);
    let attempts = 0;

    console.log(`⏳ Waiting for bot ${botId} to complete (max ${maxWaitMinutes} minutes)...`);

    while (attempts < maxAttempts) {
      try {
        const bot = await this.getBot(botId);
        console.log(`📊 Bot ${botId} status: ${bot.status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (bot.status === 'call_ended') {
          // Bot finished, try to get transcript
          const transcript = await this.getBotTranscript(botId);
          if (transcript) {
            console.log('✅ Transcript ready for bot:', botId);
            return transcript;
          }
          console.log('⏳ Bot finished but transcript not ready yet, continuing to poll...');
        } else if (bot.status === 'error') {
          console.log('❌ Bot encountered an error:', bot.status_changes);
          return null;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
        attempts++;
      } catch (error) {
        console.error(`❌ Error polling bot ${botId}:`, error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
      }
    }

    console.log(`⏰ Timeout waiting for bot ${botId} to complete`);
    return null;
  }

  /**
   * Utility to extract meeting ID from various meeting URLs
   */
  static extractMeetingId(meetingUrl: string): string | null {
    // Zoom
    const zoomMatch = meetingUrl.match(/zoom\.us\/j\/(\d+)/);
    if (zoomMatch) return zoomMatch[1];

    // Google Meet
    const meetMatch = meetingUrl.match(/meet\.google\.com\/([a-z-]+)/);
    if (meetMatch) return meetMatch[1];

    // Microsoft Teams
    const teamsMatch = meetingUrl.match(/teams\.microsoft\.com.*meetup-join\/([^?]+)/);
    if (teamsMatch) return teamsMatch[1];

    return null;
  }

  /**
   * Validate if a meeting URL is supported by Recall.ai
   */
  static isSupportedMeetingUrl(meetingUrl: string): boolean {
    const supportedDomains = [
      'zoom.us',
      'meet.google.com',
      'teams.microsoft.com',
      'teams.live.com'
    ];

    return supportedDomains.some(domain => meetingUrl.includes(domain));
  }
}
