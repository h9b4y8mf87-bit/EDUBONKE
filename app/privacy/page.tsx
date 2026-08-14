import Link from "next/link";

export default function PrivacyPage() {
  return <main className="privacy-notice-page">
    <header><Link className="brand" href="/"><span className="brand-mark">EB</span><span>EduBonke</span></Link><span>Prototype privacy notice</span></header>
    <article>
      <p className="eyebrow-text">Version 0.1 · 14 August 2026</p>
      <h1>How the EduBonke prototype handles information</h1>
      <div className="notice-banner"><b>Prototype restriction</b><p>Only invented or synthetic learner information may be entered. The prototype has not been approved for live college records.</p></div>
      <section><h2>Information processed</h2><p>The portal uses the signed-in tester’s email address and available display name for authentication, workspace membership and audit attribution. It also stores information deliberately entered by authorised testers, including synthetic learner, attendance, announcement and privacy-request records.</p></section>
      <section><h2>Purpose</h2><p>Information is processed to test whether shared college-administration workflows are useful, understandable, secure and suitable for a controlled pilot. It must not be reused for unrelated marketing or automated decision-making.</p></section>
      <section><h2>Access and separation</h2><p>Server-side membership checks restrict records to the tester’s institution workspace. Administrators, lecturers and viewers receive different permissions. Important write actions are recorded in an audit history.</p></section>
      <section><h2>Requests and deletion</h2><p>The POPIA desk allows authorised staff to log access, correction, deletion and objection requests. A responsible privacy owner must review each request before action is taken. Direct destructive actions are intentionally excluded from this version.</p></section>
      <section><h2>Retention and backups</h2><p>Prototype records should be deleted after the pilot decision and agreed evidence-retention period. Administrators can create recovery snapshots and portable exports. A tested retention schedule, automated backup cycle and restoration procedure are required before production use.</p></section>
      <section><h2>Before an external pilot</h2><p>The responsible party, Information Officer contact details, operator agreements, approved retention periods, security-incident procedure and hosting location must be confirmed and added to this notice. This page is a product control, not legal advice or a completed compliance determination.</p></section>
      <Link className="button" href="/">Return to EduBonke</Link>
    </article>
  </main>;
}
