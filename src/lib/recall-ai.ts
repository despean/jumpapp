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
        meeting_captions: Record<string, any>;
      };
    };
    participant_events?: Record<string, any>;
    video_mixed_mp4?: Record<string, any>;
    meeting_metadata?: Record<string, any>;
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
      
      const requestBody = {
        meeting_url: config.meeting_url,
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
          ...config.recording_config,
        },
        ...config,
      };
      
      console.log('📤 Recall.ai request body:', JSON.stringify(requestBody, null, 2));
      console.log('📤 Recall.ai headers:', this.headers);
      
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
      
      const response = await axios.delete(
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
      console.log(`📝 Getting transcript for bot ${botId}...`);
      
      // First, get the bot data which includes recordings
      const botResponse: AxiosResponse<RecallBot> = await axios.get(
        `${this.baseURL}/bot/${botId}`,
        { headers: this.headers }
      );

      const bot = botResponse.data;
      
      // Check if there are recordings
      if (!bot.recordings || bot.recordings.length === 0) {
        console.log(`📝 No recordings found for bot ${botId}`);
        return null;
      }

      // Find a recording with transcript data
      const recording = bot.recordings.find(r => 
        r.media_shortcuts?.transcript?.status?.code === 'done'
      );
      
      if (!recording) {
        console.log(`📝 No completed transcript found for bot ${botId}`);
        return null;
      }

      const transcriptData = recording.media_shortcuts?.transcript;
      if (!transcriptData?.data?.download_url) {
        console.log(`📝 Transcript download URL not available for bot ${botId}`);
        return null;
      }

      console.log(`📥 Downloading transcript from: ${transcriptData.data.download_url}`);
      
      // Fetch the actual transcript content
      const transcriptResponse = await axios.get(transcriptData.data.download_url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Parse the transcript data (format varies by provider)
      let transcriptText = '';
      let words: any[] = [];
      let speakers: any[] = [];
      
      if (typeof transcriptResponse.data === 'string') {
        transcriptText = transcriptResponse.data;
      } else if (transcriptResponse.data.transcript) {
        transcriptText = transcriptResponse.data.transcript;
        words = transcriptResponse.data.words || [];
        speakers = transcriptResponse.data.speakers || [];
      } else if (Array.isArray(transcriptResponse.data)) {
        // Sometimes it's an array of transcript segments
        transcriptText = transcriptResponse.data.map(segment => segment.text || segment.transcript).join(' ');
        words = transcriptResponse.data.flatMap(segment => segment.words || []);
      }
      
      console.log(`✅ Transcript retrieved: ${transcriptText.length} characters`);
      
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
      console.error(`❌ Failed to get transcript for bot ${botId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Response status:', error.response?.status);
        console.error('❌ Response data:', error.response?.data);
        
        if (error.response?.status === 404) {
          // Transcript not ready yet
          return null;
        }
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
  async isBotReady(botId: string): Promise<{ isReady: boolean; hasTranscript: boolean; status: string; debug?: any }> {
    try {
      const bot = await this.getBot(botId);
      
      // Bot is ready when it has finished the call
      const isReady = bot.status === 'call_ended' || bot.status === 'done';
      
      // Check if transcript is available
      let hasTranscript = false;
      let debugInfo: any = {
        botStatus: bot.status,
        recordingsCount: bot.recordings?.length || 0,
        recordings: []
      };

      if (isReady && bot.recordings && bot.recordings.length > 0) {
        // Log detailed recording information for debugging
        for (const recording of bot.recordings) {
          const recordingDebug = {
            id: recording.id,
            status: recording.status,
            hasMediaShortcuts: !!recording.media_shortcuts,
            transcriptInfo: recording.media_shortcuts?.transcript
          };
          debugInfo.recordings.push(recordingDebug);
          
          // Check multiple conditions for transcript availability
          const transcriptData = recording.media_shortcuts?.transcript;
          
          if (transcriptData) {
            // Method 1: Check if transcript status is 'done'
            if (transcriptData.status?.code === 'done') {
              hasTranscript = true;
              console.log(`✅ Transcript ready via status check for bot ${botId}`);
              break;
            }
            
            // Method 2: Check if download_url exists (indicates transcript is ready)
            if (transcriptData.data?.download_url) {
              hasTranscript = true;
              console.log(`✅ Transcript ready via download_url for bot ${botId}`);
              break;
            }
          }
        }
        
        // Method 3: If bot status is 'done' and we have recordings, assume transcript will be ready
        // This is more aggressive but matches the Recall.ai documentation behavior
        if (bot.status === 'done' && !hasTranscript) {
          console.log(`🔄 Bot ${botId} is 'done' but transcript not detected yet, trying to fetch...`);
          
          // Try to actually fetch the transcript to see if it's available
          try {
            const transcript = await this.getBotTranscript(botId);
            if (transcript && transcript.transcript_text) {
              hasTranscript = true;
              console.log(`✅ Transcript confirmed available via direct fetch for bot ${botId}`);
            }
          } catch (fetchError) {
            console.log(`⏳ Transcript not yet available for bot ${botId}:`, fetchError);
          }
        }
      }
      
      console.log(`🔍 Bot ${botId} final result: status="${bot.status}", ready=${isReady}, hasTranscript=${hasTranscript}`);
      console.log(`📊 Debug info for bot ${botId}:`, JSON.stringify(debugInfo, null, 2));
      
      return {
        isReady,
        hasTranscript,
        status: bot.status,
        debug: debugInfo
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
        console.log(`📊 Bot ${botId} status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (status === 'error') {
          console.log('❌ Bot encountered an error');
          return null;
        }

        if (isReady) {
          if (hasTranscript) {
            // Bot finished and transcript is ready
            const transcript = await this.getBotTranscript(botId);
            if (transcript) {
              console.log('✅ Transcript ready for bot:', botId);
              return transcript;
            }
          }
          console.log('⏳ Bot finished but transcript still processing, continuing to poll...');
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
    } catch (error) {
      console.warn('⚠️ Could not parse meeting URL, using as-is:', meetingUrl);
      return meetingUrl;
    }
  }
}
