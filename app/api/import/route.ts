import { learners } from "../../../db/schema";
import { ApiError, cleanText, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin"]);
    const payload = await request.json() as Record<string, unknown>;
    const csv = typeof payload.csv === "string" ? payload.csv.replace(/^\uFEFF/, "").trim() : "";
    if (!csv) throw new ApiError(400, "Paste CSV learner data before importing.");
    const lines = csv.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new ApiError(400, "The CSV must contain a header and at least one learner row.");
    if (lines.length > 101) throw new ApiError(400, "The prototype imports a maximum of 100 learners at a time.");
    const expected = ["student_number", "first_name", "last_name", "programme", "level"];
    const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
    if (expected.some((value, index) => header[index] !== value)) throw new ApiError(400, `Use this exact header: ${expected.join(",")}`);
    const now = new Date().toISOString();
    let imported = 0;
    const skipped: string[] = [];
    for (const [offset, line] of lines.slice(1).entries()) {
      const values = parseCsvLine(line);
      try {
        const row = {
          id: crypto.randomUUID(), institutionId: membership.institutionId,
          studentNumber: cleanText(values[0], "Student number", 40).toUpperCase(),
          firstName: cleanText(values[1], "First name", 80), lastName: cleanText(values[2], "Last name", 80),
          programme: cleanText(values[3], "Programme", 120), level: cleanText(values[4], "Level", 50),
          status: "active" as const, createdAt: now, updatedAt: now,
        };
        await db.insert(learners).values(row);
        imported += 1;
      } catch { skipped.push(`row ${offset + 2}`); }
    }
    if (!imported) throw new ApiError(409, "No rows were imported. Check required values and duplicate student numbers.");
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "learners.bulk_imported", entityType: "learner", entityId: membership.institutionId, metadata: { imported, skipped: skipped.length } });
    return Response.json({ imported, skipped });
  } catch (error) { return routeError(error); }
}

export async function GET() {
  const template = "student_number,first_name,last_name,programme,level\nTEST-0001,Lerato,Mokoena,Technical Support,NQF Level 4\n";
  return new Response(template, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=edubonke-learner-import-template.csv" } });
}
