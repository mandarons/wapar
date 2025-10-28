import { sql } from 'drizzle-orm';
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

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
});

export const heartbeats = sqliteTable('Heartbeat', {
  id: text('id').primaryKey(),
  installationId: text('installation_id').notNull().references(() => installations.id),
  data: text('data'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// Define indexes separately
export const installationAppNameIdx = index('idx_installation_app_name').on(installations.appName);
export const installationAppVersionIdx = index('idx_installation_app_version').on(installations.appVersion);
export const installationCountryCodeIdx = index('idx_installation_country_code').on(installations.countryCode);
export const installationUpdatedAtIdx = index('idx_installation_updated_at').on(installations.updatedAt);
export const heartbeatInstallationIdIdx = index('idx_heartbeat_installation_id').on(heartbeats.installationId);
export const heartbeatCreatedAtIdx = index('idx_heartbeat_created_at').on(heartbeats.createdAt);

export type Installation = typeof installations.$inferSelect;
export type NewInstallation = typeof installations.$inferInsert;
export type Heartbeat = typeof heartbeats.$inferSelect;
export type NewHeartbeat = typeof heartbeats.$inferInsert;
