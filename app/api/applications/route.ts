import { and, eq } from "drizzle-orm";
import { applications } from "../../../db/schema";
import { ApiError, cleanOptionalText, cleanText, isProgrammeInInstitution, requireDate, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const applicationStatuses = new Set(["received", "reviewing", "accepted", "declined"]);

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const payload = await request.json() as Record<string, unknown>;
    const action = payload.action === "updateStatus" ? "updateStatus" : "create";
    const { user, membership, db } = await requireMember(action === "updateStatus" ? ["admin"] : ["admin", "lecturer"]);

    if (action === "updateStatus") {
      const id = cleanText(payload.id, "Application", 80);
      const status = typeof payload.status === "string" ? payload.status : "";
      if (!applicationStatuses.has(status)) throw new ApiError(400, "Choose a valid application status.");
      const existing = await db.select({ id: applications.id }).from(applications)
        .where(and(eq(applications.id, id), eq(applications.institutionId, membership.institutionId))).limit(1);
      if (!existing[0]) throw new ApiError(404, "Application not found in this workspace.");
      await db.update(applications).set({ status: status as "received" | "reviewing" | "accepted" | "declined", updatedAt: new Date().toISOString() })
        .where(and(eq(applications.id, id), eq(applications.institutionId, membership.institutionId)));
      await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "application.status_updated", entityType: "application", entityId: id, metadata: { status } });
      return Response.json({ ok: true });
    }

    const programmeId = cleanText(payload.programmeId, "Programme", 80);
    if (!(await isProgrammeInInstitution(programmeId, membership.institutionId))) throw new ApiError(404, "Programme not found in this workspace.");
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row = {
      id,
      institutionId: membership.institutionId,
      applicationReference: cleanText(payload.applicationReference, "Application reference", 40).toUpperCase(),
      firstName: cleanText(payload.firstName, "First name", 80),
      lastName: cleanText(payload.lastName, "Last name", 80),
      programmeId,
      intakeDate: requireDate(payload.intakeDate, "Intake date"),
      status: "received" as const,
      notes: cleanOptionalText(payload.notes, 500),
      createdBy: user.email,
      createdAt: now,
      updatedAt: now,
    };
    try { await db.insert(applications).values(row); }
    catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "That application reference already exists.");
      throw error;
    }
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "application.created", entityType: "application", entityId: id, metadata: { reference: row.applicationReference } });
    return Response.json({ application: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
