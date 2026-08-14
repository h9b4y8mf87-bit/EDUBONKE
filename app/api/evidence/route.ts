import { and, eq } from "drizzle-orm";
import { getRuntimeEnv } from "../../../db";
import { evidenceDocuments } from "../../../db/schema";
import { ApiError, cleanText, isAssessmentInInstitution, isLearnerInInstitution, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const evidenceTypes = new Set(["poe", "workplace", "logbook", "assessment_support"]);
const reviewStatuses = new Set(["verified", "rejected"]);
const allowedTypes = new Set([
  "application/pdf", "image/jpeg", "image/png", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      requireWriteRequest(request);
      const { user, membership, db } = await requireMember(["admin"]);
      const payload = await request.json() as Record<string, unknown>;
      if (payload.action !== "review") throw new ApiError(400, "Choose a valid evidence action.");
      const id = cleanText(payload.id, "Evidence record", 80);
      const status = typeof payload.status === "string" ? payload.status : "";
      if (!reviewStatuses.has(status)) throw new ApiError(400, "Choose a valid review status.");
      const existing = await db.select({ id: evidenceDocuments.id }).from(evidenceDocuments)
        .where(and(eq(evidenceDocuments.id, id), eq(evidenceDocuments.institutionId, membership.institutionId))).limit(1);
      if (!existing[0]) throw new ApiError(404, "Evidence record not found in this workspace.");
      await db.update(evidenceDocuments).set({ status: status as "verified" | "rejected", reviewedAt: new Date().toISOString() })
        .where(and(eq(evidenceDocuments.id, id), eq(evidenceDocuments.institutionId, membership.institutionId)));
      await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "evidence.reviewed", entityType: "evidence", entityId: id, metadata: { status } });
      return Response.json({ ok: true });
    }

    if (request.headers.get("x-edubonke-request") !== "prototype") throw new ApiError(403, "The request could not be verified.");
    if (!contentType.includes("multipart/form-data")) throw new ApiError(415, "A form-data upload is required.");
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const form = await request.formData();
    const learnerId = cleanText(form.get("learnerId"), "Learner", 80);
    const assessmentId = typeof form.get("assessmentId") === "string" ? String(form.get("assessmentId")) : "";
    const evidenceType = typeof form.get("evidenceType") === "string" ? String(form.get("evidenceType")) : "";
    const title = cleanText(form.get("title"), "Evidence title", 160);
    const file = form.get("file");
    if (!(await isLearnerInInstitution(learnerId, membership.institutionId))) throw new ApiError(404, "Learner not found in this workspace.");
    if (assessmentId && !(await isAssessmentInInstitution(assessmentId, membership.institutionId))) throw new ApiError(404, "Assessment not found in this workspace.");
    if (!evidenceTypes.has(evidenceType)) throw new ApiError(400, "Choose a valid evidence type.");
    if (!(file instanceof File) || !file.size) throw new ApiError(400, "Choose a file to upload.");
    if (file.size > 5 * 1024 * 1024) throw new ApiError(413, "Evidence files are limited to 5 MB in the prototype.");
    if (!allowedTypes.has(file.type)) throw new ApiError(415, "Use a PDF, image, text or Microsoft Office document.");
    const env = getRuntimeEnv();
    if (!env.BUCKET) throw new ApiError(503, "Evidence storage is not available.");
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "evidence-file";
    const objectKey = `prototype-evidence/${membership.institutionId}/${learnerId}/${id}-${safeName}`;
    await env.BUCKET.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { institutionId: membership.institutionId, learnerId, uploadedBy: user.email },
    });
    const row = {
      id, institutionId: membership.institutionId, learnerId, assessmentId: assessmentId || null,
      evidenceType: evidenceType as "poe" | "workplace" | "logbook" | "assessment_support",
      title, fileName: safeName, objectKey, sizeBytes: file.size, contentType: file.type,
      status: "received" as const, uploadedBy: user.email, createdAt: new Date().toISOString(), reviewedAt: null,
    };
    await db.insert(evidenceDocuments).values(row);
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "evidence.uploaded", entityType: "evidence", entityId: id, metadata: { learnerId, evidenceType, sizeBytes: file.size } });
    return Response.json({ evidence: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}

export async function GET(request: Request) {
  try {
    const { membership, db } = await requireMember();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) throw new ApiError(400, "Evidence id is required.");
    const rows = await db.select().from(evidenceDocuments)
      .where(and(eq(evidenceDocuments.id, id), eq(evidenceDocuments.institutionId, membership.institutionId))).limit(1);
    const row = rows[0];
    if (!row) throw new ApiError(404, "Evidence record not found.");
    const object = await getRuntimeEnv().BUCKET?.get(row.objectKey);
    if (!object) throw new ApiError(404, "Evidence file is unavailable.");
    return new Response(object.body, {
      headers: {
        "content-type": row.contentType,
        "content-disposition": `attachment; filename="${row.fileName.replaceAll('"', '')}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) { return routeError(error); }
}
