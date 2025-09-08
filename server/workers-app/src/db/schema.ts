import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const installations = sqliteTable('Installation', {
  id: text('id').primaryKey(),
  appName: text('app_name').notNull(),
  appVersion: text('app_version').notNull(),
  ipAddress: text('ip_address').notNull(),
  previousId: text('previous_id'),
  data: text('data'),
  countryCode: text('country_code'),
  region: text('region'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
}, (table) => ({
  appNameIdx: index('idx_installation_app_name').on(table.appName),
  countryCodeIdx: index('idx_installation_country_code').on(table.countryCode),
}));

export const heartbeats = sqliteTable('Heartbeat', {
  id: text('id').primaryKey(),
  installationId: text('installation_id').notNull().references(() => installations.id),
  data: text('data'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
}, (table) => ({
  installationIdIdx: index('idx_heartbeat_installation_id').on(table.installationId),
  createdAtIdx: index('idx_heartbeat_created_at').on(table.createdAt),
}));

export type Installation = typeof installations.$inferSelect;
export type NewInstallation = typeof installations.$inferInsert;
export type Heartbeat = typeof heartbeats.$inferSelect;
export type NewHeartbeat = typeof heartbeats.$inferInsert;
