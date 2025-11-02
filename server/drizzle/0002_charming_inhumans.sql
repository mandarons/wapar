ALTER TABLE `Installation` ADD `last_heartbeat_at` text;--> statement-breakpoint
CREATE INDEX `idx_installation_last_heartbeat_at` ON `Installation` (`last_heartbeat_at`);