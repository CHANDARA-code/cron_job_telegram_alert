import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const schedules = sqliteTable('schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cronExpression: text('cron_expression').notNull(),
  timezone: text('timezone').notNull().default('Asia/Phnom_Penh'),
  message: text('message').notNull(),
  parseMode: text('parse_mode').notNull().default('HTML'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: integer('last_run_at', { mode: 'timestamp_ms' }),
  lastStatus: text('last_status'),
  lastError: text('last_error'),
  lastSentAt: integer('last_sent_at', { mode: 'timestamp_ms' }),
  failureCount: integer('failure_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type ScheduleRecord = typeof schedules.$inferSelect;
export type NewScheduleRecord = typeof schedules.$inferInsert;
