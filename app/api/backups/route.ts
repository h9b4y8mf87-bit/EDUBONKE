import { count, desc, eq } from "drizzle-orm";
import { getRuntimeEnv } from "../../../db";
import { announcements, attendance, auditEvents, backupSnapshots, learners, memberships, privacyRequests } from "../../../db/schema";
import { ApiError, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin"]);
    const env = getRuntimeEnv();
    if (!env.BUCKET) throw new ApiError(503, "Backup storage is not available.");
    const institutionId = membership.institutionId;
    const [learnerRows, attendanceRows, announcementRows, privacyRows, memberRows, auditRows] = await Promise.all([
      db.select().from(learners).where(eq(learners.institutionId, institutionId)),
      db.select().from(attendance).where(eq(attendance.institutionId, institutionId)),
      db.select().from(announcements).where(eq(announcements.institutionId, institutionId)),
      db.select().from(privacyRequests).where(eq(privacyRequests.institutionId, institutionId)),
      db.select().from(memberships).where(eq(memberships.institutionId, institutionId)),
      db.select().from(auditEvents).where(eq(auditEvents.institutionId, institutionId)).orderBy(desc(auditEvents.createdAt)).limit(5000),
    ]);
    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const objectKey = `prototype-backups/${institutionId}/${createdAt.replaceAll(":", "-")}-${id}.json`;
    const data = { exportVersion: 1, prototype: true, institution: { id: institutionId, name: membership.institutionName }, createdAt, learners: learnerRows, attendance: attendanceRows, announcements: announcementRows, privacyRequests: privacyRows, members: memberRows, auditEvents: auditRows };
    const recordCount = learnerRows.length + attendanceRows.length + announcementRows.length + privacyRows.length + memberRows.length + auditRows.length;
    await env.BUCKET.put(objectKey, JSON.stringify(data), { httpMetadata: { contentType: "application/json" }, customMetadata: { institutionId, createdBy: user.email } });
    await db.insert(backupSnapshots).values({ id, institutionId, objectKey, recordCount, createdBy: user.email, createdAt });
    await writeAudit({ institutionId, actorEmail: user.email, action: "backup.created", entityType: "backup", entityId: id, metadata: { recordCount } });
    return Response.json({ backup: { id, recordCount, createdAt } }, { status: 201 });
  } catch (error) { return routeError(error); }
}

export async function GET() {
  try {
    const { membership, db } = await requireMember(["admin"]);
    const [rows, total] = await Promise.all([
      db.select({ id: backupSnapshots.id, recordCount: backupSnapshots.recordCount, createdBy: backupSnapshots.createdBy, createdAt: backupSnapshots.createdAt }).from(backupSnapshots).where(eq(backupSnapshots.institutionId, membership.institutionId)).orderBy(desc(backupSnapshots.createdAt)).limit(20),
      db.select({ value: count() }).from(backupSnapshots).where(eq(backupSnapshots.institutionId, membership.institutionId)),
    ]);
    return Response.json({ backups: rows, total: total[0]?.value ?? 0 });
  } catch (error) { return routeError(error); }
}
