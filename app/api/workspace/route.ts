import { eq } from "drizzle-orm";
import { institutions, memberships } from "../../../db/schema";
import { ApiError, cleanText, getMembership, requireApiUser, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

function inviteCode() {
  return `EB-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const user = await requireApiUser();
    if (await getMembership(user.email)) throw new ApiError(409, "This account already belongs to a workspace.");
    const payload = await request.json() as { action?: string; institutionName?: string; inviteCode?: string };
    const db = (await import("../../../db")).getDb();
    const now = new Date().toISOString();

    if (payload.action === "create") {
      const institutionName = cleanText(payload.institutionName, "College name", 120);
      const institutionId = crypto.randomUUID();
      const code = inviteCode();
      await db.insert(institutions).values({
        id: institutionId, name: institutionName, inviteCode: code,
        createdByEmail: user.email, createdAt: now,
      });
      await db.insert(memberships).values({
        institutionId, userEmail: user.email, role: "admin", createdAt: now,
      });
      await writeAudit({ institutionId, actorEmail: user.email, action: "workspace.created", entityType: "institution", entityId: institutionId });
      return Response.json({ ok: true, inviteCode: code }, { status: 201 });
    }

    if (payload.action === "join") {
      const code = cleanText(payload.inviteCode, "Invite code", 20).toUpperCase();
      const found = await db.select({ id: institutions.id }).from(institutions)
        .where(eq(institutions.inviteCode, code)).limit(1);
      if (!found[0]) throw new ApiError(404, "That invite code was not found.");
      await db.insert(memberships).values({
        institutionId: found[0].id, userEmail: user.email, role: "lecturer", createdAt: now,
      });
      await writeAudit({ institutionId: found[0].id, actorEmail: user.email, action: "member.joined", entityType: "membership", entityId: user.email });
      return Response.json({ ok: true }, { status: 201 });
    }

    throw new ApiError(400, "Choose create or join.");
  } catch (error) { return routeError(error); }
}
