/**
 * Application startup initialization
 * 
 * This module handles startup tasks like initializing the bot polling service
 */

import { botPollingService } from './bot-poller';
import { logger } from '@/lib/logger';

let initialized = false;

export function initializeApp(): void {
  if (initialized) {
    return;
  }

  logger.info('🚀 Initializing JumpApp services...');

  // Start the bot polling service for shared Recall.ai account
  try {
    botPollingService.start();
    logger.info('✅ Bot polling service initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize bot polling service:', error);
  }

  initialized = true;
  logger.info('✅ JumpApp initialization complete');
}

// Auto-initialize in server environment
if (typeof window === 'undefined') {
  // Only run on server side
  initializeApp();
}
