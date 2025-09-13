import axios, { AxiosResponse } from 'axios';

// Recall.ai API types
export interface RecallBot {
  id: string;
  meeting_url: string;
  status: 'starting' | 'joining_call' | 'in_call_not_recording' | 'in_call_recording' | 'call_ended' | 'done' | 'error';
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
  recordings?: RecallRecording[]; // Added recordings array
  created_at: string;
  updated_at: string;
}

export interface RecallRecording {
  id: string;
  bot_id: string;
  status: 'processing' | 'done' | 'error';
  media_shortcuts?: {
    transcript?: {
      status: {
        code: 'processing' | 'done' | 'error';
      };
      data?: {
        download_url: string;
      };
    };
    video_mixed_mp4?: {
      status: {
        code: 'processing' | 'done' | 'error';
      };
      data?: {
        download_url: string;
      };
    };
  };
  created_at: string;
  updated_at: string;
}

export interface RecallBotCreate {
  meeting_url: string;
  bot_name?: string;
  join_at?: string; // ISO timestamp for when bot should join
  recording_config?: {
    transcript?: {
      provider: {
        meeting_captions: Record<string, unknown>;
      };
    };
    participant_events?: Record<string, unknown>;
    video_mixed_mp4?: Record<string, unknown>;
    meeting_metadata?: Record<string, unknown>;
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
  private region: string;
  private baseURL: string;

  constructor(apiKey?: string, region?: string) {
    this.apiKey = apiKey || process.env.RECALL_AI_API_KEY || '';
    this.region = region || process.env.RECALL_AI_REGION || 'us-east-1'; // Default to us-west-2
    this.baseURL = `https://${this.region}.recall.ai/api/v1`;
    
    if (!this.apiKey) {
      throw new Error('Recall.ai API key is required');
    }
    
    console.log('🌍 Recall.ai service initialized:', {
      region: this.region,
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey
    });
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
      
      const { recording_config, meeting_url, ...configWithoutMeetingUrl } = config;
      
      const requestBody = {
        meeting_url,
        bot_name: config.bot_name || 'JumpApp Meeting Bot',
        recording_config: {
          // Use meeting captions for real-time transcription
          transcript: {
            provider: {
              meeting_captions: {}
            }
          },
          // Enable participant events to track speakers
          participant_events: {},
          // Record video for later processing
          video_mixed_mp4: {},
          // Capture meeting metadata
          meeting_metadata: {},
          // Note: Webhooks disabled for shared account - using polling instead
          // realtime_endpoints: [],
          ...recording_config,
        },
        ...configWithoutMeetingUrl,
      };
      
      const response: AxiosResponse<RecallBot> = await axios.post(
        `${this.baseURL}/bot`,
        requestBody,
        { headers: this.headers }
      );

      console.log('✅ Bot created successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create bot:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Recall.ai error response:', error.response?.data);
        console.error('❌ Recall.ai error status:', error.response?.status);
        console.error('❌ Recall.ai error headers:', error.response?.headers);
        const message = error.response?.data?.message || error.response?.data?.detail || error.message;
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
        `${this.baseURL}/bot/${botId}`,
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
        `${this.baseURL}/bot`,
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
   * Delete/cancel a bot from Recall.ai (use with caution - this actually deletes the bot)
   * Note: We typically don't use this in the app, we just remove tracking instead
   */
  async deleteBot(botId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting bot from Recall.ai:', botId);
      console.warn('⚠️ This will permanently delete the bot from Recall.ai!');
      
      await axios.delete(
        `${this.baseURL}/bot/${botId}`,
        { headers: this.headers }
      );

      console.log('✅ Bot deleted from Recall.ai:', botId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete bot from Recall.ai:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Delete error response:', error.response?.data);
        console.error('❌ Delete error status:', error.response?.status);
        
        // Some bots might not be deletable (e.g., already finished)
        if (error.response?.status === 404) {
          console.log('ℹ️ Bot not found on Recall.ai (might already be deleted)');
          return true; // Consider it deleted
        }
        
        const message = error.response?.data?.message || error.response?.data?.detail || error.message;
        throw new Error(`Failed to delete bot from Recall.ai: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get transcript for a bot (using correct API structure from documentation)
   */
  async getBotTranscript(botId: string): Promise<RecallTranscript | null> {
    try {
      // First, get the bot data which includes recordings
      const botResponse: AxiosResponse<RecallBot> = await axios.get(
        `${this.baseURL}/bot/${botId}`,
        { headers: this.headers }
      );

      const bot = botResponse.data;
      console.log('🤖 Bot data:', bot);
      // Check if there are recordings
      if (!bot.recordings || bot.recordings.length === 0) {
        return null;
      }

      // Find a recording with transcript data
      const recording = bot.recordings.find(r => 
        r.media_shortcuts?.transcript?.status?.code === 'done'
      );
      
      if (!recording) {
        return null;
      }

      const transcriptData = recording.media_shortcuts?.transcript;
      if (!transcriptData?.data?.download_url) {
        return null;
      }
      
      // Fetch the actual transcript content
      const transcriptResponse = await axios.get(transcriptData.data.download_url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Parse the transcript data (format varies by provider)
      let transcriptText = '';
      let words: Array<{ start_time: number; end_time: number; text: string }> = [];
      let speakers: Array<{ id: string; name: string }> = [];
      
      if (typeof transcriptResponse.data === 'string') {
        transcriptText = transcriptResponse.data;
      } else if (transcriptResponse.data.transcript) {
        transcriptText = transcriptResponse.data.transcript;
        words = transcriptResponse.data.words || [];
        speakers = transcriptResponse.data.speakers || [];
      } else if (Array.isArray(transcriptResponse.data)) {
        // Check if it's the participant-based format
        const firstItem = transcriptResponse.data[0];
        if (firstItem && firstItem.participant && firstItem.words) {
          // Participant-based format: [{ participant: {...}, words: [...] }]
          
          // Extract unique speakers
          const speakerMap = new Map();
          transcriptResponse.data.forEach((segment: { participant?: { id: number; name?: string } }) => {
            if (segment.participant) {
              speakerMap.set(segment.participant.id, {
                id: String(segment.participant.id),
                name: segment.participant.name || `Speaker ${segment.participant.id}`
              });
            }
          });
          speakers = Array.from(speakerMap.values());
          
          // Extract all words with proper timestamps
          words = [];
          const textParts: string[] = [];
          
          transcriptResponse.data.forEach((segment: { words?: Array<{ text?: string; start_timestamp?: { relative?: number }; end_timestamp?: { relative?: number } }> }) => {
            if (segment.words && Array.isArray(segment.words)) {
              segment.words.forEach((word: { text?: string; start_timestamp?: { relative?: number }; end_timestamp?: { relative?: number } }) => {
                if (word.text) {
                  textParts.push(word.text);
                  
                  // Convert timestamps to seconds (from relative seconds)
                  words.push({
                    text: word.text,
                    start_time: word.start_timestamp?.relative || 0,
                    end_time: word.end_timestamp?.relative || 0
                  });
                }
              });
            }
          });
          
          transcriptText = textParts.join(' ');
          
        } else {
          // Legacy array format: sometimes it's an array of transcript segments
          transcriptText = transcriptResponse.data.map((segment: { text?: string; transcript?: string }) => segment.text || segment.transcript).join(' ');
          words = transcriptResponse.data.flatMap((segment: { words?: { start_time: number; end_time: number; text: string }[] }) => segment.words || []);
        }
      }
      
      // Return in our expected format
      return {
        id: recording.id,
        bot_id: botId,
        transcript_text: transcriptText,
        words: words,
        speakers: speakers,
        created_at: recording.created_at || new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Transcript not ready yet
        return null;
      }
      console.error(`❌ Failed to get transcript for bot ${botId}:`, error);
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
  async isBotReady(botId: string): Promise<{ isReady: boolean; hasTranscript: boolean; status: string }> {
    try {
      const bot = await this.getBot(botId);
      
      // Get the actual status from status_changes array (latest entry)
      const latestStatusChange = bot.status_changes?.[bot.status_changes.length - 1];
      const actualStatus = latestStatusChange?.code || bot.status;
      
      // Bot is ready when it has finished the call
      const isReady = actualStatus === 'call_ended' || actualStatus === 'done';
      
      // Check if transcript is available
      let hasTranscript = false;

      if (isReady && bot.recordings && bot.recordings.length > 0) {
        // Check for transcript availability in recordings
        for (const recording of bot.recordings) {
          const transcriptData = recording.media_shortcuts?.transcript;
          
          if (transcriptData) {
            // Method 1: Check if transcript status is 'done'
            if (transcriptData.status?.code === 'done') {
              hasTranscript = true;
              break;
            }
            
            // Method 2: Check if download_url exists (indicates transcript is ready)
            if (transcriptData.data?.download_url) {
              hasTranscript = true;
              break;
            }
          }
        }
        
        // Method 3: If bot is ready but transcript not detected in recordings, try direct fetch
        if (!hasTranscript) {
          try {
            const transcript = await this.getBotTranscript(botId);
            if (transcript && transcript.transcript_text && transcript.transcript_text.length > 0) {
              hasTranscript = true;
            }
          } catch {
            // Transcript not available yet
          }
        }
      }
      
      return {
        isReady,
        hasTranscript,
        status: actualStatus
      };
    } catch (error) {
      console.error(`❌ Failed to check if bot ${botId} is ready:`, error);
      return {
        isReady: false,
        hasTranscript: false,
        status: 'error'
      };
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
        const { isReady, hasTranscript, status } = await this.isBotReady(botId);

        if (status === 'error') {
          return null;
        }

        if (isReady && hasTranscript) {
          const transcript = await this.getBotTranscript(botId);
          if (transcript) {
            return transcript;
          }
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

  /**
   * Clean and validate a meeting URL for Recall.ai
   */
  static cleanMeetingUrl(meetingUrl: string): string {
    try {
      const url = new URL(meetingUrl);
      
      // For Google Meet, remove unnecessary parameters
      if (url.hostname === 'meet.google.com') {
        // Keep only the meeting code path
        return `https://meet.google.com${url.pathname}`;
      }
      
      // For Zoom, clean up the URL
      if (url.hostname.includes('zoom.us')) {
        // Remove tracking parameters but keep essential ones
        const cleanUrl = new URL(url.origin + url.pathname);
        if (url.searchParams.has('pwd')) {
          cleanUrl.searchParams.set('pwd', url.searchParams.get('pwd')!);
        }
        return cleanUrl.toString();
      }
      
      // For Teams, keep as is for now
      if (url.hostname.includes('teams.microsoft.com') || url.hostname.includes('teams.live.com')) {
        return meetingUrl;
      }
      
      return meetingUrl;
    } catch {
      console.warn('⚠️ Could not parse meeting URL, using as-is:', meetingUrl);
      return meetingUrl;
    }
  }
}
