import { eq } from "drizzle-orm";
import { assessmentResults, assessments, enrolments, evidenceDocuments, learners, programmes } from "../../../db/schema";
import { ApiError, requireMember, routeError, writeAudit } from "../../../lib/server";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  try {
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const type = new URL(request.url).searchParams.get("type") ?? "progress";
    if (type !== "progress") throw new ApiError(400, "Choose a valid report type.");
    const institutionId = membership.institutionId;
    const [learnerRows, programmeRows, enrolmentRows, assessmentRows, resultRows, evidenceRows] = await Promise.all([
      db.select().from(learners).where(eq(learners.institutionId, institutionId)),
      db.select().from(programmes).where(eq(programmes.institutionId, institutionId)),
      db.select().from(enrolments).where(eq(enrolments.institutionId, institutionId)),
      db.select().from(assessments).where(eq(assessments.institutionId, institutionId)),
      db.select().from(assessmentResults).where(eq(assessmentResults.institutionId, institutionId)),
      db.select().from(evidenceDocuments).where(eq(evidenceDocuments.institutionId, institutionId)),
    ]);
    const programmeById = new Map(programmeRows.map((row) => [row.id, row]));
    const assessmentById = new Map(assessmentRows.map((row) => [row.id, row]));
    const lines = [["Student number", "Learner", "Programme", "NQF level", "Enrolment status", "Competent outcomes", "Assessment results", "Verified evidence", "Progress indicator"]];
    for (const learner of learnerRows) {
      const learnerEnrolment = enrolmentRows.find((row) => row.learnerId === learner.id && row.status !== "withdrawn");
      const programme = learnerEnrolment ? programmeById.get(learnerEnrolment.programmeId) : null;
      const relevantResults = resultRows.filter((row) => row.learnerId === learner.id && (!programme || assessmentById.get(row.assessmentId)?.programmeId === programme.id));
      const competent = relevantResults.filter((row) => row.outcome === "competent").length;
      const verifiedEvidence = evidenceRows.filter((row) => row.learnerId === learner.id && row.status === "verified").length;
      const progress = relevantResults.length ? Math.round((competent / relevantResults.length) * 100) : 0;
      lines.push([learner.studentNumber, `${learner.firstName} ${learner.lastName}`, programme?.title ?? learner.programme, programme?.nqfLevel ?? learner.level, learnerEnrolment?.status ?? "not enrolled", String(competent), String(relevantResults.length), String(verifiedEvidence), `${progress}%`]);
    }
    await writeAudit({ institutionId, actorEmail: user.email, action: "report.progress_generated", entityType: "institution", entityId: institutionId, metadata: { learnerCount: learnerRows.length } });
    const csv = `${lines.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="edubonke-progress-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
        "x-edubonke-report": "software-generated-prototype",
      },
    });
  } catch (error) { return routeError(error); }
}
