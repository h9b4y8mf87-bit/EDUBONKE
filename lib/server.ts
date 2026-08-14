import { and, eq } from "drizzle-orm";
import { getChatGPTUser, type ChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "../db";
import { assessments, auditEvents, institutions, learners, memberships, programmes, users } from "../db/schema";

export type Role = "admin" | "lecturer" | "viewer";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireApiUser(): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) throw new ApiError(401, "Sign in is required.");
  const now = new Date().toISOString();
  const db = getDb();
  await db.insert(users).values({
    email: user.email.toLowerCase(), displayName: user.displayName,
    createdAt: now, lastSeenAt: now,
  }).onConflictDoUpdate({
    target: users.email,
    set: { displayName: user.displayName, lastSeenAt: now },
  });
  return { ...user, email: user.email.toLowerCase() };
}

export async function getMembership(email: string) {
  const rows = await getDb().select({
    membershipId: memberships.id,
    institutionId: institutions.id,
    institutionName: institutions.name,
    inviteCode: institutions.inviteCode,
    role: memberships.role,
  }).from(memberships)
    .innerJoin(institutions, eq(memberships.institutionId, institutions.id))
    .where(eq(memberships.userEmail, email)).limit(1);
  return rows[0] ?? null;
}

export async function requireMember(roles?: Role[]) {
  const user = await requireApiUser();
  const membership = await getMembership(user.email);
  if (!membership) throw new ApiError(403, "Join or create a college workspace first.");
  if (roles && !roles.includes(membership.role as Role)) {
    throw new ApiError(403, "Your role does not allow this action.");
  }
  return { user, membership, db: getDb() };
}

export function requireWriteRequest(request: Request) {
  if (request.headers.get("x-edubonke-request") !== "prototype") {
    throw new ApiError(403, "The request could not be verified.");
  }
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "JSON is required.");
}

export async function writeAudit(input: {
  institutionId: string; actorEmail: string; action: string;
  entityType: string; entityId: string; metadata?: Record<string, unknown>;
}) {
  await getDb().insert(auditEvents).values({
    id: crypto.randomUUID(), institutionId: input.institutionId,
    actorEmail: input.actorEmail, action: input.action,
    entityType: input.entityType, entityId: input.entityId,
    metadataJson: JSON.stringify(input.metadata ?? {}), createdAt: new Date().toISOString(),
  });
}

export function routeError(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[EduBonke] route error", message);
  return Response.json({ error: "The request could not be completed." }, { status: 500 });
}

export function cleanText(value: unknown, field: string, max = 120): string {
  const textValue = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!textValue) throw new ApiError(400, `${field} is required.`);
  if (textValue.length > max) throw new ApiError(400, `${field} is too long.`);
  return textValue;
}

export function cleanOptionalText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function requireDate(value: unknown, field: string): string {
  const date = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new ApiError(400, `Choose a valid ${field.toLowerCase()}.`);
  }
  return date;
}

export function requireInteger(value: unknown, field: string, minimum = 0, maximum = 1000): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new ApiError(400, `${field} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

export async function isLearnerInInstitution(learnerId: string, institutionId: string) {
  const row = await getDb().select({ id: learners.id }).from(learners)
    .where(and(eq(learners.id, learnerId), eq(learners.institutionId, institutionId))).limit(1);
  return Boolean(row[0]);
}

export async function isProgrammeInInstitution(programmeId: string, institutionId: string) {
  const row = await getDb().select({ id: programmes.id }).from(programmes)
    .where(and(eq(programmes.id, programmeId), eq(programmes.institutionId, institutionId))).limit(1);
  return Boolean(row[0]);
}

export async function isAssessmentInInstitution(assessmentId: string, institutionId: string) {
  const row = await getDb().select({ id: assessments.id }).from(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.institutionId, institutionId))).limit(1);
  return Boolean(row[0]);
}
