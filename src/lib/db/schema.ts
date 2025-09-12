import { pgTable, text, timestamp, boolean, integer, uuid, varchar, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (NextAuth.js compatible)
export const users = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

// NextAuth.js required tables
export const accounts = pgTable('account', {
  userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => ({
  compoundKey: primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
}));

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// Additional OAuth accounts for extended functionality
export const googleAccounts = pgTable('google_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  googleId: text('google_id').notNull(),
  email: text('email').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// LinkedIn accounts for posting
export const linkedinAccounts = pgTable('linkedin_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  linkedinId: text('linkedin_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Facebook accounts for posting
export const facebookAccounts = pgTable('facebook_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  facebookId: text('facebook_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Meetings from calendar events
export const meetings = pgTable('meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  calendarEventId: text('calendar_event_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  platform: varchar('platform', { length: 50 }), // 'zoom', 'teams', 'meet'
  meetingUrl: text('meeting_url'),
  botId: text('bot_id'), // Recall.ai bot ID
  status: varchar('status', { length: 20 }).default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  attendeesCount: integer('attendees_count').default(0),
  notetakerEnabled: boolean('notetaker_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Recall.ai bots - tracked separately from meetings
export const bots = pgTable('bots', {
  id: text('id').primaryKey(), // Recall.ai bot ID
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  meetingUrl: text('meeting_url').notNull(),
  botName: text('bot_name'),
  status: varchar('status', { length: 50 }), // recall.ai status
  platform: varchar('platform', { length: 20 }), // 'zoom', 'teams', 'meet'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Meeting transcripts from Recall.ai
export const transcripts = pgTable('transcripts', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  botId: text('bot_id').references(() => bots.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  summary: text('summary'),
  attendees: text('attendees'), // JSON string of attendee names
  duration: integer('duration'), // in minutes
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI-generated social media posts
export const socialMediaPosts = pgTable('social_media_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(), // 'linkedin', 'facebook'
  content: text('content').notNull(),
  hashtags: text('hashtags'), // comma-separated hashtags
  status: varchar('status', { length: 20 }).default('draft'), // 'draft', 'posted', 'failed'
  postedAt: timestamp('posted_at'),
  platformPostId: text('platform_post_id'), // ID from social media platform
  automationId: uuid('automation_id').references(() => automations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User automation rules for generating posts
export const automations = pgTable('automations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  platform: varchar('platform', { length: 20 }).notNull(), // 'linkedin', 'facebook'
  template: text('template').notNull(), // AI prompt template
  enabled: boolean('enabled').default(true),
  autoPost: boolean('auto_post').default(false), // automatically post or just generate draft
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User settings
export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  botJoinMinutes: integer('bot_join_minutes').default(2), // minutes before meeting to join bot
  defaultNotetaker: boolean('default_notetaker').default(true),
  notifications: boolean('notifications').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  googleAccounts: many(googleAccounts),
  linkedinAccounts: many(linkedinAccounts),
  facebookAccounts: many(facebookAccounts),
  meetings: many(meetings),
  bots: many(bots),
  socialMediaPosts: many(socialMediaPosts),
  automations: many(automations),
  settings: one(userSettings),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
  transcript: one(transcripts),
  socialMediaPosts: many(socialMediaPosts),
}));

export const botsRelations = relations(bots, ({ one, many }) => ({
  user: one(users, {
    fields: [bots.userId],
    references: [users.id],
  }),
  transcripts: many(transcripts),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  meeting: one(meetings, {
    fields: [transcripts.meetingId],
    references: [meetings.id],
  }),
  bot: one(bots, {
    fields: [transcripts.botId],
    references: [bots.id],
  }),
}));

export const socialMediaPostsRelations = relations(socialMediaPosts, ({ one }) => ({
  meeting: one(meetings, {
    fields: [socialMediaPosts.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [socialMediaPosts.userId],
    references: [users.id],
  }),
  automation: one(automations, {
    fields: [socialMediaPosts.automationId],
    references: [automations.id],
  }),
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  user: one(users, {
    fields: [automations.userId],
    references: [users.id],
  }),
  posts: many(socialMediaPosts),
}));

export const googleAccountsRelations = relations(googleAccounts, ({ one }) => ({
  user: one(users, {
    fields: [googleAccounts.userId],
    references: [users.id],
  }),
}));

export const linkedinAccountsRelations = relations(linkedinAccounts, ({ one }) => ({
  user: one(users, {
    fields: [linkedinAccounts.userId],
    references: [users.id],
  }),
}));

export const facebookAccountsRelations = relations(facebookAccounts, ({ one }) => ({
  user: one(users, {
    fields: [facebookAccounts.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));
