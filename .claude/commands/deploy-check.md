Run a full TubeWatch deployment readiness check and report a pass/fail checklist.

Check each item in order:

1. **TypeScript** — run `npx tsc --noEmit`. Pass if exit code 0, fail with error count otherwise.

2. **Build** — run `npm run build`. Pass if exit code 0.

3. **Env vars** — read `.env.local.example` to get the required keys, then check `.env.local` to confirm each one is present (just check the key exists, never print values). Report any missing keys.

4. **Vercel config** — read `vercel.json` and confirm cron is set to `0 6 * * *` targeting `/api/cron/sync`.

5. **Supabase migrations** — list files in `supabase/migrations/` and confirm `001_initial.sql` exists.

6. **No secrets in code** — run `git grep -r "sk_live\|sk_test\|service_role" --include="*.ts" --include="*.tsx" -- ':!*.example'` and fail if any hits outside env files.

Print a markdown checklist with ✅ or ❌ for each item, then a summary line.
