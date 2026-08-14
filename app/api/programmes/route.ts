import { programmes } from "../../../db/schema";
import { ApiError, cleanOptionalText, cleanText, requireInteger, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const deliveryModes = new Set(["classroom", "blended", "online", "workplace"]);

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin"]);
    const payload = await request.json() as Record<string, unknown>;
    const deliveryMode = typeof payload.deliveryMode === "string" ? payload.deliveryMode : "";
    if (!deliveryModes.has(deliveryMode)) throw new ApiError(400, "Choose a valid delivery mode.");
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row = {
      id,
      institutionId: membership.institutionId,
      code: cleanText(payload.code, "Programme code", 30).toUpperCase(),
      title: cleanText(payload.title, "Programme title", 140),
      nqfLevel: cleanText(payload.nqfLevel, "NQF level", 40),
      saqaId: cleanOptionalText(payload.saqaId, 30) || null,
      credits: requireInteger(payload.credits, "Credits", 0, 1000),
      deliveryMode: deliveryMode as "classroom" | "blended" | "online" | "workplace",
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    };
    try { await db.insert(programmes).values(row); }
    catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) throw new ApiError(409, "That programme code already exists in this workspace.");
      throw error;
    }
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "programme.created", entityType: "programme", entityId: id, metadata: { code: row.code } });
    return Response.json({ programme: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
