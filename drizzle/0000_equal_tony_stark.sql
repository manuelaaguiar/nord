CREATE TABLE `revisions` (
	`version` integer PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL,
	`label` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revisions_operation_unique` ON `revisions` (`operation_id`);