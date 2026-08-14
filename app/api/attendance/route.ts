import { attendance } from "../../../db/schema";
import { ApiError, isLearnerInInstitution, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const validStatus = new Set(["present", "absent", "late", "excused"]);

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const payload = await request.json() as { learnerId?: string; classDate?: string; status?: string };
    if (!payload.learnerId || !(await isLearnerInInstitution(payload.learnerId, membership.institutionId))) throw new ApiError(404, "Learner not found in this workspace.");
    if (!payload.classDate || !/^\d{4}-\d{2}-\d{2}$/.test(payload.classDate)) throw new ApiError(400, "Choose a valid class date.");
    if (!payload.status || !validStatus.has(payload.status)) throw new ApiError(400, "Choose a valid attendance status.");
    const now = new Date().toISOString();
    await db.insert(attendance).values({
      id: crypto.randomUUID(), institutionId: membership.institutionId,
      learnerId: payload.learnerId, classDate: payload.classDate,
      status: payload.status as "present" | "absent" | "late" | "excused",
      recordedBy: user.email, createdAt: now, updatedAt: now,
    }).onConflictDoUpdate({
      target: [attendance.learnerId, attendance.classDate],
      set: { status: payload.status as "present" | "absent" | "late" | "excused", recordedBy: user.email, updatedAt: now },
    });
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "attendance.recorded", entityType: "learner", entityId: payload.learnerId, metadata: { classDate: payload.classDate, status: payload.status } });
    return Response.json({ ok: true });
  } catch (error) { return routeError(error); }
}
