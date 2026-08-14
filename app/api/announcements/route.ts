import { announcements } from "../../../db/schema";
import { ApiError, cleanText, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const payload = await request.json() as Record<string, unknown>;
    const audience = typeof payload.audience === "string" ? payload.audience : "";
    if (!new Set(["all", "staff", "learners"]).has(audience)) throw new ApiError(400, "Choose a valid audience.");
    const id = crypto.randomUUID();
    const row = {
      id, institutionId: membership.institutionId,
      title: cleanText(payload.title, "Title", 120), body: cleanText(payload.body, "Message", 800),
      audience: audience as "all" | "staff" | "learners", authorEmail: user.email,
      createdAt: new Date().toISOString(),
    };
    await db.insert(announcements).values(row);
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "announcement.published", entityType: "announcement", entityId: id, metadata: { audience } });
    return Response.json({ announcement: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
