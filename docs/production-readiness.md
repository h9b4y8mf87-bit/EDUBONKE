# EduBonke production-readiness gates

The prototype must not be treated as a production student-information system. Migration should occur only after the following evidence exists.

## 1. Identity and access

- Select the production identity provider and require multi-factor authentication for privileged users.
- Approve institution onboarding, staff invitation, role change and access-removal procedures.
- Add role reviews, session controls and an emergency account-revocation process.
- Run an independent authorization test to confirm that one institution cannot access another institution's records.

## 2. Managed database and hosting

- Select the production region and document where personal information is stored and processed.
- Obtain written service descriptions, data-processing terms, incident commitments and exit/export terms from every operator.
- Separate development, test and production environments and credentials.
- Apply schema migrations through a reviewed release process with rollback plans.
- Validate programme, NQF, SAQA and unit-standard references against authoritative records before production use; the software must not imply accreditation.
- Test CSV imports with validation, approval, duplicate handling and a recoverable rollback process before live bulk enrolment.

## 3. Backups and recovery

- Define recovery-point and recovery-time objectives from the college's operational needs.
- Schedule database and file backups into a separate recovery boundary.
- Encrypt backup transfers and restrict restore permissions.
- Perform and record restoration tests; a backup is not accepted merely because a file exists.
- Approve retention and secure-deletion periods for production records and backups.
- Include uploaded POE and workplace evidence in restoration testing, not only database metadata.

## 4. Monitoring and incident response

- Add uptime, application-error, authentication-anomaly, capacity and backup-failure alerts.
- Route alerts to named people with an escalation roster.
- Complete logging review so logs contain operational evidence without unnecessary personal information.
- Approve and rehearse the security-compromise assessment and regulatory notification procedure.
- Add malware scanning, content validation and quarantine controls before accepting live learner document uploads.

## 5. POPIA and contracting

- Confirm the responsible party, Information Officer and deputy arrangements.
- Complete a documented purpose, lawful-processing, minimum-information and retention assessment for every field.
- Publish the final privacy notice and data-subject request procedure.
- Sign operator agreements and document cross-border processing, if any.
- Complete a security risk assessment and obtain legal review for contracts and privacy materials.
- Define minimum-information, retention, access and deletion rules for applications, assessment feedback, moderation records and uploaded evidence.

## 6. Academic and reporting controls

- Confirm who may create assessments, record outcomes, moderate decisions and mark an enrolment complete.
- Reconcile programme and learner totals against the college's approved source records after imports and migrations.
- Label EduBonke outputs as software-generated until each intended external report has been independently mapped, tested and approved.
- Do not describe prototype CSV or JSON exports as regulator submissions.

## 7. Pilot exit decision

The production decision requires measured evidence from a controlled synthetic-data pilot: workflow time, error rate, adoption, support volume, security findings, implementation effort and a signed customer decision. Production scope, price, hosting cost and funding should be based on that evidence and written supplier quotations.
