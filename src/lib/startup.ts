/**
 * Application startup initialization
 * 
 * This module handles startup tasks like initializing the bot polling service
 */

import { botPollingService } from './bot-poller';

let initialized = false;

export function initializeApp(): void {
  if (initialized) {
    return;
  }

  console.log('🚀 Initializing JumpApp services...');

  // Start the bot polling service for shared Recall.ai account
  try {
    botPollingService.start();
    console.log('✅ Bot polling service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize bot polling service:', error);
  }

  initialized = true;
  console.log('✅ JumpApp initialization complete');
}

// Auto-initialize in server environment
if (typeof window === 'undefined') {
  // Only run on server side
  initializeApp();
}
