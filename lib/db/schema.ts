import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ========== API Call History ==========
// Persists what's currently ephemeral useState in app/page.tsx
export const apiCallHistory = sqliteTable('api_call_history', {
  id: text('id').primaryKey(),
  name: text('name'),
  method: text('method').notNull(),
  path: text('path').notNull(),
  status: text('status', { enum: ['pending', 'success', 'error'] }).notNull(),
  httpStatus: integer('http_status'),
  httpStatusText: text('http_status_text'),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  responseHeaders: text('response_headers'),
  correlationId: text('correlation_id'),
  idempotencyKey: text('idempotency_key'),
  fullUrl: text('full_url'),
  error: text('error'),
  duration: integer('duration'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  sessionId: text('session_id'),
});

// ========== Environment Variables ==========
// Replaces localStorage for 'user' and 'response' sourced variables
export const environmentVariables = sqliteTable('environment_variables', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
  source: text('source', { enum: ['user', 'response'] }).notNull().default('user'),
  description: text('description'),
  isSecret: integer('is_secret', { mode: 'boolean' }).default(false),
  usageCount: integer('usage_count').default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  lastUsedAt: text('last_used_at'),
  // Response metadata fields (for source='response')
  metadataEndpoint: text('metadata_endpoint'),
  metadataMethod: text('metadata_method'),
  metadataTimestamp: text('metadata_timestamp'),
  metadataResponseStatus: integer('metadata_response_status'),
  metadataJsonPath: text('metadata_json_path'),
});

// ========== Saved Requests ==========
// New feature enabled by database
export const savedRequests = sqliteTable('saved_requests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  method: text('method').notNull(),
  path: text('path').notNull(),
  headers: text('headers'), // JSON
  body: text('body'),
  pathParams: text('path_params'), // JSON
  presetId: text('preset_id'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  tags: text('tags'), // JSON array
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  lastUsedAt: text('last_used_at'),
  usageCount: integer('usage_count').default(0),
});

// ========== User Preferences ==========
// Key-value store for settings
export const userPreferences = sqliteTable('user_preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON text
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
