import { and, eq } from "drizzle-orm";
import { assessmentResults, assessments, enrolments } from "../../../db/schema";
import { ApiError, cleanOptionalText, cleanText, isAssessmentInInstitution, isLearnerInInstitution, isProgrammeInInstitution, requireDate, requireInteger, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

const assessmentTypes = new Set(["formative", "summative", "practical", "poe", "workplace"]);
const outcomes = new Set(["not_started", "submitted", "competent", "not_yet_competent"]);
const moderatorStatuses = new Set(["not_required", "pending", "upheld", "changed"]);

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const payload = await request.json() as Record<string, unknown>;
    const action = payload.action === "recordResult" ? "recordResult" : "create";
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);

    if (action === "recordResult") {
      const assessmentId = cleanText(payload.assessmentId, "Assessment", 80);
      const learnerId = cleanText(payload.learnerId, "Learner", 80);
      if (!(await isAssessmentInInstitution(assessmentId, membership.institutionId))) throw new ApiError(404, "Assessment not found in this workspace.");
      if (!(await isLearnerInInstitution(learnerId, membership.institutionId))) throw new ApiError(404, "Learner not found in this workspace.");
      const outcome = typeof payload.outcome === "string" ? payload.outcome : "";
      const moderatorStatus = typeof payload.moderatorStatus === "string" ? payload.moderatorStatus : "";
      if (!outcomes.has(outcome)) throw new ApiError(400, "Choose a valid assessment outcome.");
      if (!moderatorStatuses.has(moderatorStatus)) throw new ApiError(400, "Choose a valid moderation status.");
      const assessment = await db.select({ maxMarks: assessments.maxMarks, programmeId: assessments.programmeId }).from(assessments)
        .where(and(eq(assessments.id, assessmentId), eq(assessments.institutionId, membership.institutionId))).limit(1);
      const learnerEnrolment = await db.select({ id: enrolments.id }).from(enrolments)
        .where(and(eq(enrolments.institutionId, membership.institutionId), eq(enrolments.learnerId, learnerId), eq(enrolments.programmeId, assessment[0].programmeId))).limit(1);
      if (!learnerEnrolment[0]) throw new ApiError(409, "Enrol the learner in this assessment’s programme before recording an outcome.");
      const rawScore = payload.score === "" || payload.score === null || payload.score === undefined ? null : requireInteger(payload.score, "Score", 0, assessment[0]?.maxMarks || 1000);
      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(), institutionId: membership.institutionId, assessmentId, learnerId,
        outcome: outcome as "not_started" | "submitted" | "competent" | "not_yet_competent",
        score: rawScore, assessorEmail: user.email,
        moderatorStatus: moderatorStatus as "not_required" | "pending" | "upheld" | "changed",
        feedback: cleanOptionalText(payload.feedback, 800), createdAt: now, updatedAt: now,
      };
      await db.insert(assessmentResults).values(row).onConflictDoUpdate({
        target: [assessmentResults.assessmentId, assessmentResults.learnerId],
        set: { outcome: row.outcome, score: row.score, assessorEmail: row.assessorEmail, moderatorStatus: row.moderatorStatus, feedback: row.feedback, updatedAt: now },
      });
      await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "assessment.result_recorded", entityType: "assessment_result", entityId: row.id, metadata: { assessmentId, learnerId, outcome } });
      return Response.json({ result: row });
    }

    const programmeId = cleanText(payload.programmeId, "Programme", 80);
    if (!(await isProgrammeInInstitution(programmeId, membership.institutionId))) throw new ApiError(404, "Programme not found in this workspace.");
    const assessmentType = typeof payload.assessmentType === "string" ? payload.assessmentType : "";
    if (!assessmentTypes.has(assessmentType)) throw new ApiError(400, "Choose a valid assessment type.");
    const id = crypto.randomUUID();
    const row = {
      id, institutionId: membership.institutionId, programmeId,
      title: cleanText(payload.title, "Assessment title", 160),
      unitStandard: cleanOptionalText(payload.unitStandard, 80),
      assessmentType: assessmentType as "formative" | "summative" | "practical" | "poe" | "workplace",
      dueDate: requireDate(payload.dueDate, "Due date"),
      maxMarks: requireInteger(payload.maxMarks, "Maximum marks", 0, 1000),
      createdBy: user.email, createdAt: new Date().toISOString(),
    };
    await db.insert(assessments).values(row);
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "assessment.created", entityType: "assessment", entityId: id, metadata: { assessmentType, programmeId } });
    return Response.json({ assessment: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
