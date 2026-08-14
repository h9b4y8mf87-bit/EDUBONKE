CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text NOT NULL,
	`author_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `announcements_institution_idx` ON `announcements` (`institution_id`);--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`class_date` text NOT NULL,
	`status` text NOT NULL,
	`recorded_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_learner_date_uq` ON `attendance` (`learner_id`,`class_date`);--> statement-breakpoint
CREATE INDEX `attendance_institution_date_idx` ON `attendance` (`institution_id`,`class_date`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_events_institution_idx` ON `audit_events` (`institution_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `backup_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`object_key` text NOT NULL,
	`record_count` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `backup_snapshots_object_key_unique` ON `backup_snapshots` (`object_key`);--> statement-breakpoint
CREATE INDEX `backup_snapshots_institution_idx` ON `backup_snapshots` (`institution_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `institutions_invite_code_unique` ON `institutions` (`invite_code`);--> statement-breakpoint
CREATE TABLE `learners` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_number` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`programme` text NOT NULL,
	`level` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learners_institution_number_uq` ON `learners` (`institution_id`,`student_number`);--> statement-breakpoint
CREATE INDEX `learners_institution_idx` ON `learners` (`institution_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`institution_id` text NOT NULL,
	`user_email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_institution_user_uq` ON `memberships` (`institution_id`,`user_email`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`user_email`);--> statement-breakpoint
CREATE TABLE `privacy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`requester_reference` text NOT NULL,
	`request_type` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `privacy_requests_institution_idx` ON `privacy_requests` (`institution_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
