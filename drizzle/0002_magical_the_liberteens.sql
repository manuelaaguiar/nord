CREATE TABLE `journal_media` (
	`id` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`kind` text NOT NULL,
	`size` integer NOT NULL,
	`digest` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_revisions` (
	`entry_id` text NOT NULL,
	`version` integer NOT NULL,
	`operation_id` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entry_version` ON `journal_revisions` (`entry_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `journal_operation` ON `journal_revisions` (`operation_id`);