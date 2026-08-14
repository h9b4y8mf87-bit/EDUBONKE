import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { announcements, applications, assessmentResults, assessments, attendance, auditEvents, backupSnapshots, enrolments, evidenceDocuments, learners, memberships, privacyRequests, programmes, scheduleEntries, users } from "../../../db/schema";
import { getMembership, requireApiUser, routeError } from "../../../lib/server";
import { getDb } from "../../../db";

export async function GET() {
  try {
    const user = await requireApiUser();
    const membership = await getMembership(user.email);
    if (!membership) return Response.json({ identity: user, workspace: null });
    const db = getDb();
    const institutionId = membership.institutionId;
    const today = new Date().toISOString().slice(0, 10);
    const [learnerTotal, memberTotal, privacyOpen, pendingAdmissions, activeEnrolments, pendingEvidence, todayAttendance, learnerRows, programmeRows, applicationRows, enrolmentRows, scheduleRows, assessmentRows, resultRows, evidenceRows, memberRows, announcementRows, privacyRows, auditRows, backupRows] = await Promise.all([
      db.select({ value: count() }).from(learners).where(and(eq(learners.institutionId, institutionId), eq(learners.status, "active"))),
      db.select({ value: count() }).from(memberships).where(eq(memberships.institutionId, institutionId)),
      db.select({ value: count() }).from(privacyRequests).where(and(eq(privacyRequests.institutionId, institutionId), eq(privacyRequests.status, "open"))),
      db.select({ value: count() }).from(applications).where(and(eq(applications.institutionId, institutionId), inArray(applications.status, ["received", "reviewing"]))),
      db.select({ value: count() }).from(enrolments).where(and(eq(enrolments.institutionId, institutionId), eq(enrolments.status, "active"))),
      db.select({ value: count() }).from(evidenceDocuments).where(and(eq(evidenceDocuments.institutionId, institutionId), eq(evidenceDocuments.status, "received"))),
      db.select({ status: attendance.status, value: count() }).from(attendance).where(and(eq(attendance.institutionId, institutionId), eq(attendance.classDate, today))).groupBy(attendance.status),
      db.select().from(learners).where(eq(learners.institutionId, institutionId)).orderBy(desc(learners.createdAt)).limit(50),
      db.select().from(programmes).where(eq(programmes.institutionId, institutionId)).orderBy(asc(programmes.title)).limit(50),
      db.select().from(applications).where(eq(applications.institutionId, institutionId)).orderBy(desc(applications.createdAt)).limit(50),
      db.select().from(enrolments).where(eq(enrolments.institutionId, institutionId)).orderBy(desc(enrolments.createdAt)).limit(100),
      db.select().from(scheduleEntries).where(and(eq(scheduleEntries.institutionId, institutionId), gte(scheduleEntries.classDate, today))).orderBy(asc(scheduleEntries.classDate), asc(scheduleEntries.startTime)).limit(30),
      db.select().from(assessments).where(eq(assessments.institutionId, institutionId)).orderBy(asc(assessments.dueDate)).limit(100),
      db.select().from(assessmentResults).where(eq(assessmentResults.institutionId, institutionId)).orderBy(desc(assessmentResults.updatedAt)).limit(200),
      db.select({ id: evidenceDocuments.id, learnerId: evidenceDocuments.learnerId, assessmentId: evidenceDocuments.assessmentId, evidenceType: evidenceDocuments.evidenceType, title: evidenceDocuments.title, fileName: evidenceDocuments.fileName, sizeBytes: evidenceDocuments.sizeBytes, status: evidenceDocuments.status, uploadedBy: evidenceDocuments.uploadedBy, createdAt: evidenceDocuments.createdAt, reviewedAt: evidenceDocuments.reviewedAt }).from(evidenceDocuments).where(eq(evidenceDocuments.institutionId, institutionId)).orderBy(desc(evidenceDocuments.createdAt)).limit(100),
      db.select({ userEmail: memberships.userEmail, role: memberships.role, displayName: users.displayName, createdAt: memberships.createdAt }).from(memberships).innerJoin(users, eq(memberships.userEmail, users.email)).where(eq(memberships.institutionId, institutionId)).orderBy(asc(users.displayName)),
      db.select().from(announcements).where(eq(announcements.institutionId, institutionId)).orderBy(desc(announcements.createdAt)).limit(12),
      db.select().from(privacyRequests).where(eq(privacyRequests.institutionId, institutionId)).orderBy(desc(privacyRequests.createdAt)).limit(20),
      db.select().from(auditEvents).where(eq(auditEvents.institutionId, institutionId)).orderBy(desc(auditEvents.createdAt)).limit(30),
      db.select().from(backupSnapshots).where(eq(backupSnapshots.institutionId, institutionId)).orderBy(desc(backupSnapshots.createdAt)).limit(8),
    ]);
    const attendanceCount = todayAttendance.reduce((sum, row) => sum + row.value, 0);
    const presentCount = todayAttendance.filter((row) => row.status === "present" || row.status === "late").reduce((sum, row) => sum + row.value, 0);
    return Response.json({
      identity: user,
      workspace: {
        id: institutionId, name: membership.institutionName, role: membership.role,
        inviteCode: membership.role === "admin" ? membership.inviteCode : null,
        memberCount: memberTotal[0]?.value ?? 0,
      },
      metrics: {
        activeLearners: learnerTotal[0]?.value ?? 0,
        attendanceRecorded: attendanceCount,
        attendanceRate: attendanceCount ? Math.round((presentCount / attendanceCount) * 100) : null,
        openPrivacyRequests: privacyOpen[0]?.value ?? 0,
        pendingAdmissions: pendingAdmissions[0]?.value ?? 0,
        activeEnrolments: activeEnrolments[0]?.value ?? 0,
        evidenceToReview: pendingEvidence[0]?.value ?? 0,
      },
      learners: learnerRows, programmes: programmeRows, applications: applicationRows,
      enrolments: enrolmentRows, scheduleEntries: scheduleRows,
      assessments: assessmentRows, assessmentResults: resultRows,
      evidenceDocuments: evidenceRows, members: memberRows,
      announcements: announcementRows,
      privacyRequests: privacyRows, auditEvents: auditRows, backups: backupRows,
      serverTime: new Date().toISOString(),
    });
  } catch (error) { return routeError(error); }
}
