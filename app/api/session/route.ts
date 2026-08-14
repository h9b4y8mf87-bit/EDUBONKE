import { and, count, desc, eq } from "drizzle-orm";
import { announcements, attendance, auditEvents, backupSnapshots, learners, memberships, privacyRequests } from "../../../db/schema";
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
    const [learnerTotal, memberTotal, privacyOpen, todayAttendance, learnerRows, announcementRows, privacyRows, auditRows, backupRows] = await Promise.all([
      db.select({ value: count() }).from(learners).where(and(eq(learners.institutionId, institutionId), eq(learners.status, "active"))),
      db.select({ value: count() }).from(memberships).where(eq(memberships.institutionId, institutionId)),
      db.select({ value: count() }).from(privacyRequests).where(and(eq(privacyRequests.institutionId, institutionId), eq(privacyRequests.status, "open"))),
      db.select({ status: attendance.status, value: count() }).from(attendance).where(and(eq(attendance.institutionId, institutionId), eq(attendance.classDate, today))).groupBy(attendance.status),
      db.select().from(learners).where(eq(learners.institutionId, institutionId)).orderBy(desc(learners.createdAt)).limit(50),
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
      },
      learners: learnerRows, announcements: announcementRows,
      privacyRequests: privacyRows, auditEvents: auditRows, backups: backupRows,
      serverTime: new Date().toISOString(),
    });
  } catch (error) { return routeError(error); }
}
