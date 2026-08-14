CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`application_reference` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`programme_id` text NOT NULL,
	`intake_date` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_institution_reference_uq` ON `applications` (`institution_id`,`application_reference`);--> statement-breakpoint
CREATE INDEX `applications_institution_status_idx` ON `applications` (`institution_id`,`status`);--> statement-breakpoint
CREATE TABLE `assessment_results` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`outcome` text NOT NULL,
	`score` integer,
	`assessor_email` text NOT NULL,
	`moderator_status` text DEFAULT 'not_required' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_results_assessment_learner_uq` ON `assessment_results` (`assessment_id`,`learner_id`);--> statement-breakpoint
CREATE INDEX `assessment_results_institution_idx` ON `assessment_results` (`institution_id`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`programme_id` text NOT NULL,
	`title` text NOT NULL,
	`unit_standard` text DEFAULT '' NOT NULL,
	`assessment_type` text NOT NULL,
	`due_date` text NOT NULL,
	`max_marks` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assessments_institution_due_idx` ON `assessments` (`institution_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`programme_id` text NOT NULL,
	`start_date` text NOT NULL,
	`expected_end_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_learner_programme_start_uq` ON `enrolments` (`learner_id`,`programme_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `enrolments_institution_status_idx` ON `enrolments` (`institution_id`,`status`);--> statement-breakpoint
CREATE TABLE `evidence_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`assessment_id` text,
	`evidence_type` text NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`content_type` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_documents_object_key_unique` ON `evidence_documents` (`object_key`);--> statement-breakpoint
CREATE INDEX `evidence_institution_learner_idx` ON `evidence_documents` (`institution_id`,`learner_id`);--> statement-breakpoint
CREATE TABLE `programmes` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`nqf_level` text NOT NULL,
	`saqa_id` text,
	`credits` integer DEFAULT 0 NOT NULL,
	`delivery_mode` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programmes_institution_code_uq` ON `programmes` (`institution_id`,`code`);--> statement-breakpoint
CREATE INDEX `programmes_institution_idx` ON `programmes` (`institution_id`);--> statement-breakpoint
CREATE TABLE `schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`programme_id` text,
	`class_date` text NOT NULL,
	`title` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`venue` text NOT NULL,
	`facilitator_email` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `schedule_institution_date_idx` ON `schedule_entries` (`institution_id`,`class_date`);