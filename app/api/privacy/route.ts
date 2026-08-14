import { privacyRequests } from "../../../db/schema";
import { ApiError, cleanText, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const payload = await request.json() as Record<string, unknown>;
    const requestType = typeof payload.requestType === "string" ? payload.requestType : "";
    if (!new Set(["access", "correction", "deletion", "objection"]).has(requestType)) throw new ApiError(400, "Choose a valid request type.");
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row = {
      id, institutionId: membership.institutionId,
      requesterReference: cleanText(payload.requesterReference, "Requester reference", 80),
      requestType: requestType as "access" | "correction" | "deletion" | "objection",
      status: "open" as const,
      notes: typeof payload.notes === "string" ? payload.notes.trim().slice(0, 500) : "",
      createdBy: user.email, createdAt: now, updatedAt: now,
    };
    await db.insert(privacyRequests).values(row);
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "privacy_request.created", entityType: "privacy_request", entityId: id, metadata: { requestType } });
    return Response.json({ request: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
