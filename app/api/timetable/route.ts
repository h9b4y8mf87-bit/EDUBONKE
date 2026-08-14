import { scheduleEntries } from "../../../db/schema";
import { ApiError, cleanText, isProgrammeInInstitution, requireDate, requireMember, requireWriteRequest, routeError, writeAudit } from "../../../lib/server";

export async function POST(request: Request) {
  try {
    requireWriteRequest(request);
    const { user, membership, db } = await requireMember(["admin", "lecturer"]);
    const payload = await request.json() as Record<string, unknown>;
    const programmeId = cleanText(payload.programmeId, "Programme", 80);
    if (!(await isProgrammeInInstitution(programmeId, membership.institutionId))) throw new ApiError(404, "Programme not found in this workspace.");
    const startTime = typeof payload.startTime === "string" ? payload.startTime : "";
    const endTime = typeof payload.endTime === "string" ? payload.endTime : "";
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime) throw new ApiError(400, "Choose a valid start and end time.");
    const id = crypto.randomUUID();
    const row = {
      id,
      institutionId: membership.institutionId,
      programmeId,
      classDate: requireDate(payload.classDate, "Class date"),
      title: cleanText(payload.title, "Session title", 140),
      startTime,
      endTime,
      venue: cleanText(payload.venue, "Venue", 120),
      facilitatorEmail: user.email,
      createdBy: user.email,
      createdAt: new Date().toISOString(),
    };
    await db.insert(scheduleEntries).values(row);
    await writeAudit({ institutionId: membership.institutionId, actorEmail: user.email, action: "timetable.session_created", entityType: "schedule_entry", entityId: id, metadata: { classDate: row.classDate, programmeId } });
    return Response.json({ scheduleEntry: row }, { status: 201 });
  } catch (error) { return routeError(error); }
}
