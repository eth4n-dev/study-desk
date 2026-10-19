# Study desk

A private-by-account timetable, assignment planner, file library, and study log. The app is a static Next.js site; Supabase Auth, Postgres, and private Storage provide optional cross-device sync. A local development workspace uses IndexedDB and needs no account.

## Run locally

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. A fresh browser workspace starts empty. Add subjects in **Settings**, import a timetable `.ics` file or enter classes manually, then add assignments or upload PDFs. `npm test` checks date handling, imports, migration, and planning. `npm run build` produces the static `out/` site.

## Everyday use

In **Study plan**, click a scheduled task once on desktop to open its assignment and files. On touch screens, the first tap selects a block for resizing; a second tap opens it. The task queue also offers **Open file** before a task has any planned time. Files are shown near the top of assignment details, with planned-time removal alongside each reserved block.

Use the Light/Dark button in the header to switch appearance. The choice is remembered in this browser, including on the sign-in screen.

**Settings** separates subjects, timetable, study activities, and account data. To add a lecture or exercise, pick its day and time in the week view (drag a range on desktop), then choose the subject and session type. Common durations are one click away; weekly, fortnightly, and single-date sessions are supported. The colour palette closes on selection, Escape, or clicking outside it.

## How imports work

- **Timetable:** Import a calendar export such as the personal `.ics` file from myStudies. Match each course to an existing subject or create a new one. If the export includes overlapping exercise groups, choose one. **Not chosen yet** leaves that exercise time and room off your timetable; the decision can be changed later. Imports are snapshots, so re-export when your schedule changes.
- **Course files:** In a subject’s **Theory & notes**, files save directly to that subject without PDF analysis or a review form. Use **All subjects** for a mixed-subject batch: PDF first pages are read locally, clear matches save automatically, and only uncertain files need review. Assignment files linked to an existing task or carrying a clear subject, title, and due date/time also save automatically. There is no weekly-assignment assumption.
- **Assignment calendar:** If a course platform provides an `.ics` file of opening and deadline events, import it in **Settings**. Events match subjects by course code or name. Add an assignment manually when no feed or due date is available.
- **Activity buttons:** Create your own one-tap logs in **Settings**. Existing Russian logs remain intact when upgrading an older workspace.

Assignment names and file titles are kept as supplied. Subject names, short names, course codes, and aliases can be edited to improve matching. The importer never sends a PDF or timetable to an AI service.

## Cloud setup for a small group

1. Create a Supabase project and apply [`supabase/001_study_cloud.sql`](supabase/001_study_cloud.sql). It stores one JSON document per account and files under a per-user private path. Row-level security and Storage policies require the signed-in user and a passkey or MFA session.
2. In Supabase Authentication, keep **public sign-ups disabled** and invite each person who should use the app. Configure the site URL and redirect origin for the deployed domain. Enable passkeys for that exact domain. Each friend gets an isolated account and can start an empty workspace.
3. Set these build variables in your hosting provider; copy [`.env.example`](.env.example) for local cloud testing:

   ```sh
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

4. Deploy the repository to Netlify. [`netlify.toml`](netlify.toml) builds and publishes `out/`. The domain used for passkeys must match the deployed site. Test one invited account before adding personal files.

The browser must know the Supabase project URL and publishable key; `NEXT_PUBLIC_` values are bundled into the static site. These are **not secrets**. Access control comes from the database and Storage policies. Never put a database password, service-role key, Moodle token, private `.ics` feed URL, backup, or personal PDF in Git or client environment variables. See [SECURITY.md](SECURITY.md).

For four or five users, the current per-user document is a simple fit. If the app grows substantially, consider splitting frequently edited entities into tables and adding server-side abuse controls before allowing open registration.

## Existing workspaces

Saved browser and cloud workspaces migrate in place. Export a backup with files from **Settings** before switching browsers or restoring data. A backup contains the full study document and uploaded files, so keep it private. A new cloud account can import that backup on its first sign-in.

The source still includes compatibility code for older Ethan-era workspaces. Fresh workspaces contain no personal subjects, timetable, or assignments. The [public source repository](https://github.com/eth4n-dev/study-desk) starts from a clean snapshot; this project's older private Git history and its personal calendar fixture are not included.

## Limits

Timetable and assignment calendar imports are snapshots, not a live myStudies or Moodle connection. PDF detection reads selectable text on the first page; scanned PDFs and unusual date formats need review. Background mobile notifications and the expanded statistics page are not implemented.

MIT licensed. Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
