CREATE TABLE `Heartbeat` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`data` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`installation_id`) REFERENCES `Installation`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_heartbeat_installation_id` ON `Heartbeat` (`installation_id`);--> statement-breakpoint
CREATE INDEX `idx_heartbeat_created_at` ON `Heartbeat` (`created_at`);--> statement-breakpoint
CREATE TABLE `Installation` (
	`id` text PRIMARY KEY NOT NULL,
	`app_name` text NOT NULL,
	`app_version` text NOT NULL,
	`ip_address` text NOT NULL,
	`previous_id` text,
	`data` text,
	`country_code` text,
	`region` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_installation_app_name` ON `Installation` (`app_name`);--> statement-breakpoint
CREATE INDEX `idx_installation_app_version` ON `Installation` (`app_version`);--> statement-breakpoint
CREATE INDEX `idx_installation_country_code` ON `Installation` (`country_code`);