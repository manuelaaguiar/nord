CREATE TABLE `assistant_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`created_at` text NOT NULL,
	`question` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`state_version` integer NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assistant_messages_day_idx` ON `assistant_messages` (`day`);