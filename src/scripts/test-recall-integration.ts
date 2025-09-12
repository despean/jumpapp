/**
 * Test script to validate Recall.ai integration matches official documentation
 * 
 * This script follows the exact quickstart guide from Recall.ai docs:
 * 1. Create a bot
 * 2. Wait for completion  
 * 3. Retrieve recording and transcript
 * 
 * Usage: npx tsx src/scripts/test-recall-integration.ts <meeting_url>
 */

import { RecallAIService } from '../lib/recall-ai';

async function testRecallIntegration() {
  const meetingUrl = process.argv[2];
  
  if (!meetingUrl) {
    console.log('❌ Usage: npx tsx src/scripts/test-recall-integration.ts <meeting_url>');
    console.log('📝 Example: npx tsx src/scripts/test-recall-integration.ts https://meet.google.com/abc-defg-hij');
    process.exit(1);
  }

  console.log('🧪 Testing Recall.ai Integration');
  console.log('📋 Following official quickstart guide...\n');

  try {
    // Initialize service
    const recallService = new RecallAIService();
    
    // Step 1: Create a bot (matches docs exactly)
    console.log('🤖 Step 1: Creating bot...');
    const bot = await recallService.createBot({
      meeting_url: meetingUrl,
      bot_name: 'JumpApp Test Bot',
      recording_config: {
        transcript: {
          provider: {
            meeting_captions: {}
          }
        }
      }
    });
    
    console.log('✅ Bot created:', bot.id);
    console.log('📊 Initial status:', bot.status);
    console.log('🔗 Meeting URL:', bot.meeting_url);
    
    // Step 2: Wait for bot to finish (polling as per docs)
    console.log('\n⏳ Step 2: Waiting for bot to finish...');
    console.log('💡 Join the meeting and talk for a bit, then end the meeting');
    console.log('🔄 Polling every 30 seconds...\n');
    
    let attempts = 0;
    const maxAttempts = 40; // 20 minutes max
    
    while (attempts < maxAttempts) {
      try {
        const { isReady, hasTranscript, status } = await recallService.isBotReady(bot.id);
        
        console.log(`📊 Attempt ${attempts + 1}: Status = ${status}, Ready = ${isReady}, Has Transcript = ${hasTranscript}`);
        
        if (status === 'error') {
          console.log('❌ Bot encountered an error');
          break;
        }
        
        if (status === 'done') {
          console.log('✅ Bot finished with status: done');
          
          // Step 3: Retrieve recording and transcript
          console.log('\n📥 Step 3: Retrieving bot data...');
          const finalBot = await recallService.getBot(bot.id);
          
          console.log('🎥 Recordings found:', finalBot.recordings?.length || 0);
          
          if (finalBot.recordings && finalBot.recordings.length > 0) {
            const recording = finalBot.recordings[0];
            console.log('📹 Recording ID:', recording.id);
            
            // Check for video
            const videoData = recording.media_shortcuts?.video_mixed_mp4;
            if (videoData?.data?.download_url) {
              console.log('🎬 Video available at:', videoData.data.download_url.substring(0, 100) + '...');
            }
            
            // Check for transcript
            const transcriptData = recording.media_shortcuts?.transcript;
            if (transcriptData?.status?.code === 'done' && transcriptData?.data?.download_url) {
              console.log('📝 Transcript available at:', transcriptData.data.download_url.substring(0, 100) + '...');
              
              // Try to get transcript content
              const transcript = await recallService.getBotTranscript(bot.id);
              if (transcript) {
                console.log('📄 Transcript length:', transcript.transcript_text.length, 'characters');
                console.log('👥 Speakers found:', transcript.speakers.length);
                console.log('📝 Sample text:', transcript.transcript_text.substring(0, 200) + '...');
              }
            } else {
              console.log('⏳ Transcript still processing...');
            }
          }
          
          console.log('\n✅ Test completed successfully!');
          break;
        }
        
        // Wait 30 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 30000));
        attempts++;
        
      } catch (error) {
        console.error('❌ Error during polling:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Timeout reached. Bot may still be processing.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('📋 Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testRecallIntegration().catch(console.error);
