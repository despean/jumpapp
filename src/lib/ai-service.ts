import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MeetingContext {
  title: string;
  transcript: string;
  attendees: Array<{ id: string; name: string }>;
  duration: number;
  platform: string;
  date: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  tone: 'professional' | 'casual' | 'formal';
}

export interface GeneratedSocialPost {
  platform: 'linkedin' | 'facebook';
  content: string;
  hashtags: string[];
  engagement_hook: string;
}

export interface MeetingSummary {
  key_points: string[];
  decisions_made: string[];
  next_steps: string[];
  overall_summary: string;
}

export class AIContentService {
  private static instance: AIContentService;
  
  public static getInstance(): AIContentService {
    if (!AIContentService.instance) {
      AIContentService.instance = new AIContentService();
    }
    return AIContentService.instance;
  }

  /**
   * Generate a follow-up email based on meeting transcript
   */
  async generateFollowUpEmail(
    context: MeetingContext,
    tone: 'professional' | 'casual' | 'formal' = 'professional'
  ): Promise<GeneratedEmail> {
    const prompt = this.buildEmailPrompt(context, tone);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional assistant that creates follow-up emails based on meeting transcripts. Generate clear, actionable, and well-structured emails."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseEmailResponse(response, tone);
    } catch (error) {
      console.error('Error generating follow-up email:', error);
      throw new Error('Failed to generate follow-up email');
    }
  }

  /**
   * Generate social media posts for LinkedIn and Facebook
   */
  async generateSocialMediaPosts(context: MeetingContext): Promise<GeneratedSocialPost[]> {
    const posts: GeneratedSocialPost[] = [];
    
    // Generate LinkedIn post
    posts.push(await this.generateLinkedInPost(context));
    
    // Generate Facebook post
    posts.push(await this.generateFacebookPost(context));
    
    return posts;
  }

  /**
   * Generate meeting summary with key insights
   */
  async generateMeetingSummary(context: MeetingContext): Promise<MeetingSummary> {
    const prompt = this.buildSummaryPrompt(context);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing meeting transcripts and extracting key insights. Provide structured, actionable summaries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 600
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseSummaryResponse(response);
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      throw new Error('Failed to generate meeting summary');
    }
  }

  private buildEmailPrompt(context: MeetingContext, tone: string): string {
    return `Generate a follow-up email for a meeting with the following details:

Meeting: ${context.title}
Date: ${context.date}
Duration: ${context.duration} minutes
Platform: ${context.platform}
Attendees: ${context.attendees.map(a => a.name).join(', ')}

Transcript:
${context.transcript}

Requirements:
- Tone: ${tone}
- Include key discussion points
- Mention important decisions or outcomes
- Suggest next steps if applicable
- Keep it concise but comprehensive
- Use proper email format with subject line

Format your response as:
SUBJECT: [email subject]
BODY: [email body]`;
  }

  private buildSummaryPrompt(context: MeetingContext): string {
    return `Analyze this meeting transcript and provide a structured summary:

Meeting: ${context.title}
Duration: ${context.duration} minutes
Attendees: ${context.attendees.map(a => a.name).join(', ')}

Transcript:
${context.transcript}

Please provide:
1. KEY_POINTS: 3-5 main discussion points
2. DECISIONS_MADE: Any concrete decisions or agreements
3. NEXT_STEPS: Follow-up actions or future meetings planned
4. OVERALL_SUMMARY: 2-3 sentence overview

Format as JSON with these exact keys: key_points, decisions_made, next_steps, overall_summary`;
  }

  private async generateLinkedInPost(context: MeetingContext): Promise<GeneratedSocialPost> {
    const prompt = `Create a professional LinkedIn post about this meeting:

Meeting: ${context.title}
Key insights from transcript: ${context.transcript.substring(0, 500)}...

Requirements:
- Professional tone suitable for LinkedIn
- Highlight key insights or learnings
- Include relevant business hashtags
- Engage the professional network
- Keep under 300 characters for better engagement
- Include an engagement hook/question`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a LinkedIn content expert. Create engaging, professional posts that drive engagement."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    });

    const content = completion.choices[0]?.message?.content || '';
    
    return {
      platform: 'linkedin',
      content: content,
      hashtags: this.extractHashtags(content),
      engagement_hook: this.extractEngagementHook(content)
    };
  }

  private async generateFacebookPost(context: MeetingContext): Promise<GeneratedSocialPost> {
    const prompt = `Create a Facebook post about this meeting:

Meeting: ${context.title}
Key insights: ${context.transcript.substring(0, 400)}...

Requirements:
- Casual, friendly tone
- Share interesting insights or learnings
- Include relevant hashtags
- Encourage comments and discussion
- Keep it conversational and relatable`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Facebook content creator. Make posts engaging, conversational, and shareable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 180
    });

    const content = completion.choices[0]?.message?.content || '';
    
    return {
      platform: 'facebook',
      content: content,
      hashtags: this.extractHashtags(content),
      engagement_hook: this.extractEngagementHook(content)
    };
  }


  private parseEmailResponse(response: string, tone: string): GeneratedEmail {
    const lines = response.split('\n');
    let subject = '';
    let body = '';
    let inBody = false;

    for (const line of lines) {
      if (line.startsWith('SUBJECT:')) {
        subject = line.replace('SUBJECT:', '').trim();
      } else if (line.startsWith('BODY:')) {
        inBody = true;
        body = line.replace('BODY:', '').trim();
      } else if (inBody) {
        body += '\n' + line;
      }
    }

    // Fallback parsing if format is different
    if (!subject && !body) {
      const parts = response.split('\n\n');
      subject = parts[0]?.replace(/^(Subject:|SUBJECT:)/i, '').trim() || 'Follow-up from our meeting';
      body = parts.slice(1).join('\n\n').trim() || response;
    }

    return {
      subject: subject || `Follow-up: ${response.substring(0, 50)}...`,
      body: body || response,
      tone: tone as 'professional' | 'casual' | 'formal'
    };
  }

  private parseSummaryResponse(response: string): MeetingSummary {
    try {
      const parsed = JSON.parse(response);
      return {
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
        decisions_made: Array.isArray(parsed.decisions_made) ? parsed.decisions_made : [],
        next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
        overall_summary: parsed.overall_summary || ''
      };
    } catch (error) {
      // Fallback parsing if JSON format fails
      return {
        key_points: [response.substring(0, 200) + '...'],
        decisions_made: [],
        next_steps: [],
        overall_summary: response.substring(0, 300) + '...'
      };
    }
  }

  private extractHashtags(content: string): string[] {
    const hashtags = content.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.toLowerCase());
  }

  private extractEngagementHook(content: string): string {
    // Look for questions or calls to action
    const sentences = content.split(/[.!?]+/);
    const hook = sentences.find(s => 
      s.includes('?') || 
      s.toLowerCase().includes('what do you think') ||
      s.toLowerCase().includes('share your') ||
      s.toLowerCase().includes('let me know')
    );
    return hook?.trim() || '';
  }
}

export const aiService = AIContentService.getInstance();
