import { and, eq } from "drizzle-orm";
import { enrolments } from "../../../db/schema";
import { ApiError, cleanText, isLearnerInInstitution, isProgrammeInInstitution, requireDate, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const enrolmentStatuses = new Set(["planned", "active", "completed", "withdrawn"]);

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const payload = await request.json() as Record<string, unknown>;
    const action = payload.action === "updateStatus" ? "updateStatus" : "create";
    const { user, membership, db } = await requireMember(action === "updateStatus" ? ["admin"] : ["admin", "lecturer"]);

    if (action === "updateStatus") {
      const id = cleanText(payload.id, "Enrolment", 80);
      const status = typeof payload.status === "string" ? payload.status : "";
      if (!enrolmentStatuses.has(status)) throw new ApiError(400, "Choose a valid enrolment status.");
      const existing = await db.select({ id: enrolments.id }).from(enrolments)
        .where(and(eq(enrolments.id, id), eq(enrolments.institutionId, membership.institutionId))).limit(1);
      if (!existing[0]) throw new ApiError(404, "Enrolment not found in this workspace.");
      await db.update(enrolments).set({ status: status as "planned" | "active" | "completed" | "withdrawn", updatedAt: new Date().toISOString() })
        .where(and(eq(enrolments.id, id), eq(enrolments.institutionId, membership.institutionId)));
      await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "enrolment.status_updated", entityType: "enrolment", entityId: id, metadata: { status } });
      return Response.json({ ok: true });
    }

    const learnerId = cleanText(payload.learnerId, "Learner", 80);
    const programmeId = cleanText(payload.programmeId, "Programme", 80);
    if (!(await isLearnerInInstitution(learnerId, membership.institutionId))) throw new ApiError(404, "Learner not found in this workspace.");
    if (!(await isProgrammeInInstitution(programmeId, membership.institutionId))) throw new ApiError(404, "Programme not found in this workspace.");
    const startDate = requireDate(payload.startDate, "Start date");
    const expectedEndDate = requireDate(payload.expectedEndDate, "Expected end date");
    if (expectedEndDate < startDate) throw new ApiError(400, "Expected end date cannot be before the start date.");
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row = { id, institutionId: membership.institutionId, learnerId, programmeId, startDate, expectedEndDate, status: "active" as const, createdAt: now, updatedAt: now };
    try { await db.insert(enrolments).values(row); }
    catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "This learner already has an enrolment with the same programme and start date.");
      throw error;
    }
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "enrolment.created", entityType: "enrolment", entityId: id, metadata: { learnerId, programmeId } });
    return Response.json({ enrolment: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
