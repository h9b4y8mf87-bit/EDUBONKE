import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const institutions = sqliteTable("institutions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: text("created_at").notNull(),
});

export const memberships = sqliteTable("memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  userEmail: text("user_email").notNull().references(() => users.email),
  role: text("role", { enum: ["admin", "lecturer", "viewer"] }).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("memberships_institution_user_uq").on(table.institutionId, table.userEmail),
  index("memberships_user_idx").on(table.userEmail),
]);

export const learners = sqliteTable("learners", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  studentNumber: text("student_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  programme: text("programme").notNull(),
  level: text("level").notNull(),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("learners_institution_number_uq").on(table.institutionId, table.studentNumber),
  index("learners_institution_idx").on(table.institutionId),
]);

export const programmes = sqliteTable("programmes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  code: text("code").notNull(),
  title: text("title").notNull(),
  nqfLevel: text("nqf_level").notNull(),
  saqaId: text("saqa_id"),
  credits: integer("credits").notNull().default(0),
  deliveryMode: text("delivery_mode", { enum: ["classroom", "blended", "online", "workplace"] }).notNull(),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("programmes_institution_code_uq").on(table.institutionId, table.code),
  index("programmes_institution_idx").on(table.institutionId),
]);

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  applicationReference: text("application_reference").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  programmeId: text("programme_id").notNull().references(() => programmes.id),
  intakeDate: text("intake_date").notNull(),
  status: text("status", { enum: ["received", "reviewing", "accepted", "declined"] }).notNull().default("received"),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("applications_institution_reference_uq").on(table.institutionId, table.applicationReference),
  index("applications_institution_status_idx").on(table.institutionId, table.status),
]);

export const enrolments = sqliteTable("enrolments", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  learnerId: text("learner_id").notNull().references(() => learners.id),
  programmeId: text("programme_id").notNull().references(() => programmes.id),
  startDate: text("start_date").notNull(),
  expectedEndDate: text("expected_end_date").notNull(),
  status: text("status", { enum: ["planned", "active", "completed", "withdrawn"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("enrolments_learner_programme_start_uq").on(table.learnerId, table.programmeId, table.startDate),
  index("enrolments_institution_status_idx").on(table.institutionId, table.status),
]);

export const scheduleEntries = sqliteTable("schedule_entries", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  programmeId: text("programme_id").references(() => programmes.id),
  classDate: text("class_date").notNull(),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  venue: text("venue").notNull(),
  facilitatorEmail: text("facilitator_email").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("schedule_institution_date_idx").on(table.institutionId, table.classDate)]);

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  programmeId: text("programme_id").notNull().references(() => programmes.id),
  title: text("title").notNull(),
  unitStandard: text("unit_standard").notNull().default(""),
  assessmentType: text("assessment_type", { enum: ["formative", "summative", "practical", "poe", "workplace"] }).notNull(),
  dueDate: text("due_date").notNull(),
  maxMarks: integer("max_marks").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("assessments_institution_due_idx").on(table.institutionId, table.dueDate)]);

export const assessmentResults = sqliteTable("assessment_results", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id),
  learnerId: text("learner_id").notNull().references(() => learners.id),
  outcome: text("outcome", { enum: ["not_started", "submitted", "competent", "not_yet_competent"] }).notNull(),
  score: integer("score"),
  assessorEmail: text("assessor_email").notNull(),
  moderatorStatus: text("moderator_status", { enum: ["not_required", "pending", "upheld", "changed"] }).notNull().default("not_required"),
  feedback: text("feedback").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("assessment_results_assessment_learner_uq").on(table.assessmentId, table.learnerId),
  index("assessment_results_institution_idx").on(table.institutionId),
]);

export const evidenceDocuments = sqliteTable("evidence_documents", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  learnerId: text("learner_id").notNull().references(() => learners.id),
  assessmentId: text("assessment_id").references(() => assessments.id),
  evidenceType: text("evidence_type", { enum: ["poe", "workplace", "logbook", "assessment_support"] }).notNull(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull().unique(),
  sizeBytes: integer("size_bytes").notNull(),
  contentType: text("content_type").notNull(),
  status: text("status", { enum: ["received", "verified", "rejected"] }).notNull().default("received"),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
}, (table) => [index("evidence_institution_learner_idx").on(table.institutionId, table.learnerId)]);

export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  learnerId: text("learner_id").notNull().references(() => learners.id),
  classDate: text("class_date").notNull(),
  status: text("status", { enum: ["present", "absent", "late", "excused"] }).notNull(),
  recordedBy: text("recorded_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("attendance_learner_date_uq").on(table.learnerId, table.classDate),
  index("attendance_institution_date_idx").on(table.institutionId, table.classDate),
]);

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience", { enum: ["all", "staff", "learners"] }).notNull(),
  authorEmail: text("author_email").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("announcements_institution_idx").on(table.institutionId)]);

export const privacyRequests = sqliteTable("privacy_requests", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  requesterReference: text("requester_reference").notNull(),
  requestType: text("request_type", { enum: ["access", "correction", "deletion", "objection"] }).notNull(),
  status: text("status", { enum: ["open", "reviewing", "resolved", "declined"] }).notNull().default("open"),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("privacy_requests_institution_idx").on(table.institutionId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("audit_events_institution_idx").on(table.institutionId, table.createdAt)]);

export const backupSnapshots = sqliteTable("backup_snapshots", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  objectKey: text("object_key").notNull().unique(),
  recordCount: integer("record_count").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("backup_snapshots_institution_idx").on(table.institutionId, table.createdAt)]);
