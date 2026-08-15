# EduBonke R0 Setup Guide

This guide creates the functional prototype without ChatGPT hosting or a paid hosting plan. GitHub Pages hosts the application and Supabase Free provides accounts, PostgreSQL and private file storage.

## 1. Create the Supabase project

1. Open `https://supabase.com/dashboard` and create a free account.
2. Select **New project**.
3. Give the project a clear test name such as `edubonke-prototype`.
4. Generate and securely store the database password. Do not put it in GitHub.
5. Choose the closest appropriate available region after considering South African data-transfer and POPIA requirements.
6. Wait for project provisioning to finish.

Free projects can pause after low activity. This is acceptable for a synthetic prototype but not for a live customer.

## 2. Create the database and security policies

1. In Supabase, open **SQL Editor**.
2. Select **New query**.
3. Copy the complete contents of `supabase/migrations/202608150001_edubonke_full.sql` from this repository.
4. Paste it into SQL Editor and select **Run**.
5. Confirm that the query completes without an error.

The migration creates the application tables, tenant-isolation functions, role policies, audit triggers, private document bucket and synthetic-data function.

## 3. Configure authentication URLs

In Supabase, open **Authentication → URL Configuration**.

Set the Site URL to:

```text
https://h9b4y8mf87-bit.github.io/EDUBONKE/
```

Add these Redirect URLs:

```text
http://localhost:3000/**
https://h9b4y8mf87-bit.github.io/EDUBONKE/**
```

Email/password authentication is sufficient for the prototype. Do not disable email confirmation for a live pilot.

## 4. Add GitHub repository secrets

1. In Supabase, open **Project Settings → API**.
2. Copy the **Project URL**.
3. Copy the **anon** or **publishable** key. Never copy the `service_role` or secret key into GitHub Pages.
4. Open the GitHub repository: `https://github.com/h9b4y8mf87-bit/EDUBONKE`.
5. Go to **Settings → Secrets and variables → Actions**.
6. Create these repository secrets:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The anonymous key is designed for browser applications. Security comes from the migration’s row-level policies, not from hiding this publishable key.

## 5. Enable GitHub Pages

1. Open **Settings → Pages** in the repository.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open the **Actions** tab.
4. Run **Deploy EduBonke to GitHub Pages**, or push a commit to `main`.
5. Wait for the build and deployment jobs to become green.

The resulting address is:

```text
https://h9b4y8mf87-bit.github.io/EDUBONKE/
```

## 6. Create the first workspace

1. Open the deployed site and select **Sign in to EduBonke**.
2. Create an account using an email address you control.
3. Confirm the address using the Supabase email.
4. Sign in and select **Create a test college**.
5. Open **Administration** and select **Load synthetic demo data**.

The demonstration records are clearly labelled `TEST` and use `.invalid` email domains.

## 7. Test shared access

1. As College Administrator, create an invite under **Administration**.
2. Use a second approved email address to create another EduBonke account.
3. Enter the single-use invite code.
4. Confirm that the second account sees only its authorised college and role-based actions.
5. Test from a second browser or device to confirm shared information.

## R0 limitations

- GitHub Pages is public static hosting; protected data remains in Supabase.
- Supabase may pause an inactive free project.
- Free-tier availability, quotas and terms can change.
- Automated production backups, restore drills, malware scanning, central monitoring and guaranteed uptime are not included.
- Use synthetic information only.

Before introducing live learners, complete every item in `docs/PRODUCTION_READINESS.md`.
