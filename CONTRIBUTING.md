# Contributing

Run `npm test` and `npm run build` before opening a change. Keep imports useful for different schools and course naming styles; do not add a personal timetable or assignment fixture to `public/`. Use small synthetic calendars and first-page text in tests.

Never commit `.env` files, database credentials, private calendar exports, study backups, or assignment PDFs. The app is a static client, so anything under `NEXT_PUBLIC_` is visible to every visitor.

Please describe user-facing behavior and migration effects in changes to the workspace model. Existing stored documents must continue to load without losing tasks, files, attendance choices, or study history.
