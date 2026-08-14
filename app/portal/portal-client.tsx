"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "admin" | "lecturer" | "viewer";
type Learner = { id: string; studentNumber: string; firstName: string; lastName: string; programme: string; level: string; status: string };
type Announcement = { id: string; title: string; body: string; audience: string; authorEmail: string; createdAt: string };
type PrivacyRequest = { id: string; requesterReference: string; requestType: string; status: string; createdAt: string };
type AuditEvent = { id: string; actorEmail: string; action: string; entityType: string; createdAt: string };
type Backup = { id: string; recordCount: number; createdBy: string; createdAt: string };
type SessionData = {
  identity: { displayName: string; email: string };
  workspace: null | { id: string; name: string; role: Role; inviteCode: string | null; memberCount: number };
  metrics?: { activeLearners: number; attendanceRecorded: number; attendanceRate: number | null; openPrivacyRequests: number };
  learners?: Learner[];
  announcements?: Announcement[];
  privacyRequests?: PrivacyRequest[];
  auditEvents?: AuditEvent[];
  backups?: Backup[];
};

const nav = [
  ["overview", "Overview", "OV"], ["learners", "Learners", "LR"],
  ["attendance", "Attendance", "AT"], ["announcements", "Announcements", "AN"],
  ["privacy", "POPIA desk", "PD"], ["security", "Security & backups", "SB"],
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (value: string) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function PortalClient({ initialUser }: { initialUser: { displayName: string; email: string } }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [active, setActive] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<"checking" | "healthy" | "degraded">("checking");

  const load = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store" });
    const payload = await response.json() as SessionData & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to load the workspace.");
    setData(payload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/session", { cache: "no-store" }),
      fetch("/api/health", { cache: "no-store" }),
    ]).then(async ([sessionResponse, healthResponse]) => {
      const payload = await sessionResponse.json() as SessionData & { error?: string };
      if (!sessionResponse.ok) throw new Error(payload.error ?? "Unable to load the workspace.");
      if (!cancelled) { setData(payload); setHealth(healthResponse.ok ? "healthy" : "degraded"); }
    }).catch((reason: Error) => { if (!cancelled) { setError(reason.message); setHealth("degraded"); } });
    return () => { cancelled = true; };
  }, []);

  async function post(endpoint: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-edubonke-request": "prototype" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The action could not be completed.");
      await load(); setNotice(success);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }

  const fullName = data?.identity.displayName ?? initialUser.displayName;
  const initials = useMemo(() => fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [fullName]);

  if (!data) return <main className="portal-loading"><span className="loader" /><p>Preparing your secure workspace…</p>{error && <p className="form-error">{error}</p>}</main>;
  if (!data.workspace) return <Onboarding user={data.identity} busy={busy} error={error} post={post} />;

  const { workspace } = data;
  const canWrite = workspace.role !== "viewer";
  const canAdmin = workspace.role === "admin";

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand"><span>EB</span><div><b>EduBonke</b><small>Prototype portal</small></div></div>
        <div className="college-switch"><small>Current workspace</small><b>{workspace.name}</b><span>{workspace.memberCount} pilot member{workspace.memberCount === 1 ? "" : "s"}</span></div>
        <nav aria-label="Portal navigation">
          {nav.map(([id, label, icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="prototype-guard"><b>Synthetic data only</b><span>Do not enter real learner information during prototype testing.</span></div>
        <Link className="sidebar-home" href="/">← Public site</Link>
      </aside>

      <section className="portal-main">
        <header className="portal-topbar">
          <div><small>{workspace.name}</small><h1>{nav.find(([id]) => id === active)?.[1]}</h1></div>
          <div className="user-chip"><span>{initials}</span><div><b>{fullName}</b><small>{workspace.role}</small></div><a href="/signout-with-chatgpt?return_to=/">Sign out</a></div>
        </header>
        <div className="mobile-nav">{nav.map(([id, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>{label}</button>)}</div>
        {(notice || error) && <div className={`portal-notice ${error ? "error" : "success"}`}>{error || notice}<button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">×</button></div>}

        {active === "overview" && <Overview data={data} setActive={setActive} />}
        {active === "learners" && <LearnersPanel learners={data.learners ?? []} canWrite={canWrite} busy={busy} post={post} />}
        {active === "attendance" && <AttendancePanel learners={data.learners ?? []} canWrite={canWrite} busy={busy} post={post} />}
        {active === "announcements" && <AnnouncementsPanel items={data.announcements ?? []} canWrite={canWrite} busy={busy} post={post} />}
        {active === "privacy" && <PrivacyPanel items={data.privacyRequests ?? []} canWrite={canWrite} busy={busy} post={post} />}
        {active === "security" && <SecurityPanel data={data} health={health} canAdmin={canAdmin} busy={busy} post={post} />}
      </section>
    </main>
  );
}

function Onboarding({ user, busy, error, post }: { user: SessionData["identity"]; busy: boolean; error: string; post: (endpoint: string, payload: Record<string, unknown>, success: string) => Promise<void> }) {
  return <main className="onboarding-shell">
    <Link className="portal-brand" href="/"><span>EB</span><div><b>EduBonke</b><small>Prototype portal</small></div></Link>
    <section className="onboarding-card">
      <p className="onboarding-step">Signed in as {user.email}</p>
      <h1>Set up your pilot workspace</h1>
      <p>Create a new test college or join an existing pilot team. Only synthetic data may be used.</p>
      {error && <div className="form-error box">{error}</div>}
      <div className="onboarding-grid">
        <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); post("/api/workspace", { action: "create", institutionName: form.get("institutionName") }, "Workspace created."); }}>
          <span className="choice-number">01</span><h2>Create a workspace</h2><p>The creator becomes the pilot administrator and receives an invite code.</p>
          <label>Test college name<input name="institutionName" placeholder="e.g. Mhlabeni College" maxLength={120} required /></label>
          <button disabled={busy}>{busy ? "Working…" : "Create workspace"}</button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); post("/api/workspace", { action: "join", inviteCode: form.get("inviteCode") }, "Workspace joined."); }}>
          <span className="choice-number">02</span><h2>Join a pilot team</h2><p>Use the code supplied by the college’s prototype administrator.</p>
          <label>Invite code<input name="inviteCode" placeholder="EB-XXXXXXXX" maxLength={20} required /></label>
          <button className="secondary" disabled={busy}>{busy ? "Working…" : "Join workspace"}</button>
        </form>
      </div>
    </section>
  </main>;
}

function Overview({ data, setActive }: { data: SessionData; setActive: (value: string) => void }) {
  const metrics = data.metrics!;
  return <div className="portal-content">
    <section className="welcome-row"><div><p>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "full" }).format(new Date())}</p><h2>Good morning, {data.identity.displayName.split(" ")[0]}</h2><span>Your shared prototype workspace is ready for testing.</span></div><button onClick={() => setActive("learners")}>+ Add learner</button></section>
    <section className="portal-metrics">
      <article><small>Active learners</small><strong>{metrics.activeLearners}</strong><span>Prototype records</span></article>
      <article><small>Attendance today</small><strong>{metrics.attendanceRate === null ? "—" : `${metrics.attendanceRate}%`}</strong><span>{metrics.attendanceRecorded} records captured</span></article>
      <article><small>Open POPIA requests</small><strong>{metrics.openPrivacyRequests}</strong><span>Requires privacy-owner review</span></article>
      <article><small>Pilot members</small><strong>{data.workspace?.memberCount}</strong><span>Shared access across devices</span></article>
    </section>
    <div className="overview-grid">
      <section className="portal-card"><div className="card-heading"><div><small>COMMUNICATION</small><h3>Latest announcements</h3></div><button onClick={() => setActive("announcements")}>View all</button></div>
        {(data.announcements ?? []).length ? (data.announcements ?? []).slice(0, 3).map((item) => <article className="announcement-row" key={item.id}><span>{item.audience.slice(0, 1).toUpperCase()}</span><div><b>{item.title}</b><p>{item.body}</p><small>{fmt(item.createdAt)}</small></div></article>) : <Empty text="No announcements have been published yet." />}
      </section>
      <section className="portal-card"><div className="card-heading"><div><small>RECENT ACTIVITY</small><h3>Auditable actions</h3></div><button onClick={() => setActive("security")}>Audit log</button></div>
        {(data.auditEvents ?? []).slice(0, 5).map((event) => <article className="activity-row" key={event.id}><span /><div><b>{humanAction(event.action)}</b><small>{event.actorEmail} · {fmt(event.createdAt)}</small></div></article>)}
      </section>
    </div>
  </div>;
}

function LearnersPanel({ learners, canWrite, busy, post }: { learners: Learner[]; canWrite: boolean; busy: boolean; post: PortalClientProps["post"] }) {
  return <div className="portal-content two-column">
    {canWrite && <FormCard title="Register a prototype learner" intro="Use invented details only during the pilot.">
      <form className="portal-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); post("/api/learners", values, "Learner added to the shared workspace.").then(() => event.currentTarget.reset()); }}>
        <label>Student number<input name="studentNumber" placeholder="TEST-0001" required /></label><div className="form-pair"><label>First name<input name="firstName" placeholder="Lerato" required /></label><label>Last name<input name="lastName" placeholder="Mokoena" required /></label></div><label>Programme<input name="programme" placeholder="Technical Support" required /></label><label>Level<input name="level" placeholder="NQF Level 4" required /></label><button disabled={busy}>{busy ? "Saving…" : "Add learner"}</button>
      </form>
    </FormCard>}
    <section className="portal-card wide"><div className="card-heading"><div><small>SHARED REGISTER</small><h3>Learners</h3></div><span className="count-chip">{learners.length} records</span></div>
      {learners.length ? <div className="data-table"><div className="table-head"><span>Learner</span><span>Student no.</span><span>Programme</span><span>Status</span></div>{learners.map((learner) => <div className="table-row" key={learner.id}><span><b>{learner.firstName} {learner.lastName}</b><small>{learner.level}</small></span><span>{learner.studentNumber}</span><span>{learner.programme}</span><span><i className="status-dot" />{learner.status}</span></div>)}</div> : <Empty text="No learners have been added to this prototype workspace." />}
    </section>
  </div>;
}

function AttendancePanel({ learners, canWrite, busy, post }: { learners: Learner[]; canWrite: boolean; busy: boolean; post: PortalClientProps["post"] }) {
  return <div className="portal-content two-column"><FormCard title="Record attendance" intro="One attendance record per learner per date. Re-submitting updates the record.">
    {canWrite ? <form className="portal-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); post("/api/attendance", values, "Attendance recorded and added to the audit history."); }}><label>Learner<select name="learnerId" required defaultValue=""><option value="" disabled>Select learner</option>{learners.map((learner) => <option value={learner.id} key={learner.id}>{learner.firstName} {learner.lastName} · {learner.studentNumber}</option>)}</select></label><label>Class date<input type="date" name="classDate" defaultValue={today()} required /></label><label>Status<select name="status" defaultValue="present"><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="excused">Excused</option></select></label><button disabled={busy || learners.length === 0}>{busy ? "Saving…" : "Save attendance"}</button></form> : <Empty text="Your viewer role cannot record attendance." />}
  </FormCard><section className="portal-card info-card"><small>ATTENDANCE CONTROL</small><h3>What this prototype tests</h3><ul><li>Updates are shared across devices.</li><li>The recorder and time are written to the audit history.</li><li>A duplicate learner/date entry updates the existing record.</li><li>No biometric or location data is collected.</li></ul></section></div>;
}

function AnnouncementsPanel({ items, canWrite, busy, post }: { items: Announcement[]; canWrite: boolean; busy: boolean; post: PortalClientProps["post"] }) {
  return <div className="portal-content two-column">{canWrite && <FormCard title="Publish an announcement" intro="Use a clear audience and avoid unnecessary personal information."><form className="portal-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); post("/api/announcements", values, "Announcement published.").then(() => event.currentTarget.reset()); }}><label>Title<input name="title" maxLength={120} required /></label><label>Audience<select name="audience" defaultValue="all"><option value="all">All users</option><option value="staff">Staff only</option><option value="learners">Learners</option></select></label><label>Message<textarea name="body" rows={5} maxLength={800} required /></label><button disabled={busy}>{busy ? "Publishing…" : "Publish announcement"}</button></form></FormCard>}<section className="portal-card wide"><div className="card-heading"><div><small>NOTICEBOARD</small><h3>Published messages</h3></div></div>{items.length ? items.map((item) => <article className="noticeboard-row" key={item.id}><span>{item.audience}</span><h4>{item.title}</h4><p>{item.body}</p><small>{item.authorEmail} · {fmt(item.createdAt)}</small></article>) : <Empty text="The noticeboard is empty." />}</section></div>;
}

function PrivacyPanel({ items, canWrite, busy, post }: { items: PrivacyRequest[]; canWrite: boolean; busy: boolean; post: PortalClientProps["post"] }) {
  return <div className="portal-content two-column">{canWrite && <FormCard title="Log a data-subject request" intro="Use an internal reference—not an identity number—in this prototype."><form className="portal-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); post("/api/privacy", values, "Request logged for privacy-owner review.").then(() => event.currentTarget.reset()); }}><label>Requester reference<input name="requesterReference" placeholder="TEST-LRN-004" required /></label><label>Request type<select name="requestType" defaultValue="access"><option value="access">Access</option><option value="correction">Correction</option><option value="deletion">Deletion</option><option value="objection">Objection</option></select></label><label>Notes<textarea name="notes" rows={4} maxLength={500} /></label><button disabled={busy}>{busy ? "Logging…" : "Log request"}</button></form></FormCard>}<section className="portal-card wide"><div className="card-heading"><div><small>PRIVACY DESK</small><h3>Request register</h3></div><span className="count-chip">{items.length} requests</span></div>{items.length ? <div className="data-table privacy-table"><div className="table-head"><span>Reference</span><span>Type</span><span>Logged</span><span>Status</span></div>{items.map((item) => <div className="table-row" key={item.id}><span><b>{item.requesterReference}</b></span><span>{item.requestType}</span><span>{fmt(item.createdAt)}</span><span><i className="status-dot amber" />{item.status}</span></div>)}</div> : <Empty text="No access, correction, deletion or objection requests have been logged." />}</section></div>;
}

function SecurityPanel({ data, health, canAdmin, busy, post }: { data: SessionData; health: string; canAdmin: boolean; busy: boolean; post: PortalClientProps["post"] }) {
  return <div className="portal-content"><section className="security-grid"><article><span className={`health-light ${health}`} /><small>APPLICATION HEALTH</small><h3>{health === "healthy" ? "Systems reachable" : health === "checking" ? "Checking systems" : "Review required"}</h3><p>Live endpoint checks the managed database without exposing record contents.</p></article><article><span className="health-light healthy" /><small>AUTHENTICATION</small><h3>Identity verified</h3><p>Protected routes and write actions verify the signed-in user on the server.</p></article><article><span className="health-light healthy" /><small>ACCESS ROLE</small><h3>{data.workspace?.role}</h3><p>Permissions are applied using the member’s role in this institution workspace.</p></article></section><div className="security-columns"><section className="portal-card"><div className="card-heading"><div><small>RECOVERY</small><h3>Backup snapshots</h3></div></div><p className="card-copy">An administrator can create an on-demand snapshot in separate object storage. Automated schedules and restore drills remain production-launch requirements.</p>{canAdmin ? <div className="backup-actions"><button disabled={busy} onClick={() => post("/api/backups", {}, "Backup snapshot created.")}>{busy ? "Creating…" : "Create backup snapshot"}</button><a href="/api/export">Download portable export</a></div> : <p className="role-note">Administrator access is required.</p>}<div className="backup-list">{(data.backups ?? []).length ? (data.backups ?? []).map((item) => <div key={item.id}><span><b>{fmt(item.createdAt)}</b><small>{item.recordCount} records · {item.createdBy}</small></span><i>Stored</i></div>) : <Empty text="No backup snapshots exist yet." />}</div></section><section className="portal-card"><div className="card-heading"><div><small>ACCESS SHARING</small><h3>Pilot invitation</h3></div></div>{canAdmin && data.workspace?.inviteCode ? <div className="invite-box"><small>Invite code</small><strong>{data.workspace.inviteCode}</strong><p>Share only with approved prototype testers. New members join as lecturers.</p></div> : <p className="role-note">The invite code is available only to administrators.</p>}<div className="control-list"><div><b>Data separation</b><span>Every query is filtered by institution membership.</span></div><div><b>Audit trail</b><span>Important writes record the user, action and time.</span></div><div><b>Prototype guardrail</b><span>Real learner data is explicitly prohibited.</span></div></div></section></div><section className="portal-card audit-card"><div className="card-heading"><div><small>ACCOUNTABILITY</small><h3>Audit history</h3></div><span className="count-chip">Latest 30</span></div>{(data.auditEvents ?? []).map((event) => <div className="audit-row" key={event.id}><span>{humanAction(event.action)}</span><span>{event.entityType}</span><span>{event.actorEmail}</span><time>{fmt(event.createdAt)}</time></div>)}</section></div>;
}

type PortalClientProps = { post: (endpoint: string, payload: Record<string, unknown>, success: string) => Promise<void> };
function FormCard({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) { return <section className="portal-card form-card"><small>PROTOTYPE ACTION</small><h3>{title}</h3><p>{intro}</p>{children}</section>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>○</span><p>{text}</p></div>; }
function humanAction(action: string) { return action.replaceAll(".", " ").replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase()); }
