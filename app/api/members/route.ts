import { and, count, eq } from "drizzle-orm";
import { memberships } from "../../../db/schema";
import { ApiError, cleanText, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const roles = new Set(["admin", "lecturer", "viewer"]);

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin"]);
    const payload = await request.json() as Record<string, unknown>;
    const userEmail = cleanText(payload.userEmail, "Member email", 254).toLowerCase();
    const role = typeof payload.role === "string" ? payload.role : "";
    if (!roles.has(role)) throw new ApiError(400, "Choose a valid member role.");
    const target = await db.select({ id: memberships.id, role: memberships.role }).from(memberships)
      .where(and(eq(memberships.institutionId, membership.institutionId), eq(memberships.userEmail, userEmail))).limit(1);
    if (!target[0]) throw new ApiError(404, "Member not found in this workspace.");
    if (target[0].role === "admin" && role !== "admin") {
      const adminTotal = await db.select({ value: count() }).from(memberships)
        .where(and(eq(memberships.institutionId, membership.institutionId), eq(memberships.role, "admin")));
      if ((adminTotal[0]?.value ?? 0) <= 1) throw new ApiError(409, "Assign another administrator before changing the final administrator’s role.");
    }
    await db.update(memberships).set({ role: role as "admin" | "lecturer" | "viewer" })
      .where(and(eq(memberships.institutionId, membership.institutionId), eq(memberships.userEmail, userEmail)));
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "member.role_updated", entityType: "membership", entityId: String(target[0].id), metadata: { userEmail, role } });
    return Response.json({ ok: true });
  } catch (error) { return routeError(error); }
}
