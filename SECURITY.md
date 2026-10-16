# Security model

Study desk is a static client. Its Supabase URL and publishable key are visible in the downloaded JavaScript. Treat them as public identifiers, not credentials. Keep the service-role key, database password, private calendar feed URLs, and account recovery codes outside the repository and outside all `NEXT_PUBLIC_` variables.

The included SQL enables row-level security on `study_documents`. A user can select or update only the document whose `user_id` matches their signed-in identity. The `study-files` bucket is private; every object path starts with that same user ID. The policies also require a passkey session or email plus TOTP MFA. Do not disable these policies to fix an application error.

For a small trusted group, leave public sign-ups disabled and invite each member in Supabase Authentication. One person’s subject names, assignments, logs, backups, and files should never be used as another person’s starter data. A fresh account starts empty.

Before connecting real data to a new deployment, test with two invited accounts: each should be able to save and reopen its own document and file, while attempts to read the other account’s row or object should fail. Confirm that the Storage bucket remains private. Backups are plaintext JSON containing file contents; store them privately and never attach them to an issue or commit them.

The PDF classifier runs in the browser and reads the first page only. The app uploads the original file to private Storage when the user saves it. Timetable and assignment `.ics` files are read locally; private feed URLs and access tokens are not retained. Uploaded content and imported calendar text must be treated as data, not instructions.

Report suspected vulnerabilities privately to the repository maintainers rather than opening a public issue with exploit details or personal data.
