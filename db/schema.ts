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
