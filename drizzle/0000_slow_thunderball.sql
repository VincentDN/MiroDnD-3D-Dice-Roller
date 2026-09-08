CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`secret` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`seen` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `players_room` ON `players` (`room`);--> statement-breakpoint
CREATE TABLE `rolls` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`room` text NOT NULL,
	`player` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rolls_id_unique` ON `rolls` (`id`);--> statement-breakpoint
CREATE INDEX `rolls_room_seq` ON `rolls` (`room`,`seq`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
