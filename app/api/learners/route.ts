import { desc, eq } from "drizzle-orm";
import { learners } from "../../../db/schema";
import { ApiError, cleanText, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

export async function GET() {
  try {
    const { membership, db } = await requireMember();
    const rows = await db.select().from(learners).where(eq(learners.institutionId, membership.institutionId)).orderBy(desc(learners.createdAt)).limit(100);
    return Response.json({ learners: rows });
  } catch (error) { return routeError(error); }
}

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const payload = await request.json() as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const values = {
      id, institutionId: membership.institutionId,
      studentNumber: cleanText(payload.studentNumber, "Student number", 40).toUpperCase(),
      firstName: cleanText(payload.firstName, "First name", 80),
      lastName: cleanText(payload.lastName, "Last name", 80),
      programme: cleanText(payload.programme, "Programme", 120),
      level: cleanText(payload.level, "Level", 50),
      status: "active" as const, createdAt: now, updatedAt: now,
    };
    try { await db.insert(learners).values(values); }
    catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "That student number already exists in this workspace.");
      throw error;
    }
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "learner.created", entityType: "learner", entityId: id, metadata: { studentNumber: values.studentNumber } });
    return Response.json({ learner: values }, { status: 201 });
  } catch (error) { return routeError(error); }
}
