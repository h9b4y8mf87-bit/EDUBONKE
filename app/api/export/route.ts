import { desc, eq } from "drizzle-orm";
import { announcements, attendance, auditEvents, learners, memberships, privacyRequests } from "../../../db/schema";
import { requireMember, routeError, writeAudit } from "../../../lib/server";

export async function GET() {
  try {
    const { user, membership, db } = await requireMember(["admin"]);
    const institutionId = membership.institutionId;
    const [learnerRows, attendanceRows, announcementRows, privacyRows, memberRows, auditRows] = await Promise.all([
      db.select().from(learners).where(eq(learners.institutionId, institutionId)),
      db.select().from(attendance).where(eq(attendance.institutionId, institutionId)),
      db.select().from(announcements).where(eq(announcements.institutionId, institutionId)),
      db.select().from(privacyRequests).where(eq(privacyRequests.institutionId, institutionId)),
      db.select({ userEmail: memberships.userEmail, role: memberships.role, createdAt: memberships.createdAt }).from(memberships).where(eq(memberships.institutionId, institutionId)),
      db.select().from(auditEvents).where(eq(auditEvents.institutionId, institutionId)).orderBy(desc(auditEvents.createdAt)).limit(1000),
    ]);
    const exportedAt = new Date().toISOString();
    await writeAudit({ institutionId, actorEmail: user.email, action: "data.exported", entityType: "institution", entityId: institutionId });
    const payload = JSON.stringify({
      exportVersion: 1, prototype: true, institution: { id: institutionId, name: membership.institutionName },
      exportedAt, learners: learnerRows, attendance: attendanceRows,
      announcements: announcementRows, privacyRequests: privacyRows, members: memberRows, auditEvents: auditRows,
    }, null, 2);
    return new Response(payload, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="edubonke-export-${exportedAt.slice(0, 10)}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) { return routeError(error); }
}
