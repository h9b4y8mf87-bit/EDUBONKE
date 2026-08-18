"use client";

import { getSupabase } from "./supabase";

export type WorkspaceRow = Record<string, unknown>;

export const workspaceTables = [
  "campuses", "academic_periods", "programmes", "modules", "programme_modules", "classes",
  "applications", "students", "student_status_history", "student_documents", "enrolments", "workplace_placements",
  "timetable_entries", "attendance_sessions", "attendance_records", "assessments", "assessment_results",
  "evidence_documents", "moderation_records", "invoices", "invoice_items", "payments", "funding_records",
  "announcements", "notifications", "support_tickets", "support_ticket_comments", "privacy_requests",
  "consent_records", "data_incidents", "institution_invites", "subscriptions", "audit_logs",
] as const;

const PAGE_SIZE = 250;
const QUERY_CONCURRENCY = 6;

async function loadInstitutionTable(table: string, institutionId: string): Promise<WorkspaceRow[]> {
  const supabase = getSupabase();
  const rows: WorkspaceRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("institution_id", institutionId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data ?? []) as unknown as WorkspaceRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function loadWorkspaceTables(institutionId: string) {
  const results: Array<readonly [string, WorkspaceRow[]]> = [];

  for (let index = 0; index < workspaceTables.length; index += QUERY_CONCURRENCY) {
    const batch = workspaceTables.slice(index, index + QUERY_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (table) => [table, await loadInstitutionTable(table, institutionId)] as const),
    );
    results.push(...batchResults);
  }

  return results;
}

export async function loadInstitutionMembers(institutionId: string): Promise<WorkspaceRow[]> {
  const supabase = getSupabase();
  const rows: WorkspaceRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("institution_memberships")
      .select("id,institution_id,profile_id,role,status,created_at,profiles(id,full_name,email)")
      .eq("institution_id", institutionId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as unknown as WorkspaceRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function loadPlatformInstitutions(): Promise<WorkspaceRow[]> {
  const supabase = getSupabase();
  const rows: WorkspaceRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("institutions")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as unknown as WorkspaceRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}
