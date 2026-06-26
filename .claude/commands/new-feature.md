Start a new TubeWatch feature using the plan-first workflow. Feature name: $ARGUMENTS

Follow these steps exactly:

**Step 1 — Clarify scope**
Ask the user two questions:
- What does this feature do for the creator? (one sentence)
- Which part of the app does it touch? (auth, dashboard page, API route, DB schema, all of the above?)

Wait for answers before continuing.

**Step 2 — Draft a plan**
Enter plan mode and produce:
- List of new files to create (with their purpose)
- List of existing files to modify (with what changes)
- Any Supabase schema changes needed (new tables, columns, RLS policies)
- Any new env vars needed

**Step 3 — Wait for approval**
Present the plan and wait for the user to say "go" or request changes. Do not write any code yet.

**Step 4 — Checkpoint**
Once approved, create a git checkpoint: `git add -A && git commit -m "checkpoint: before $ARGUMENTS feature"`

**Step 5 — Implement**
Build the feature step by step. After each major file, run `npx tsc --noEmit` to catch type errors early.

**Step 6 — Verify**
After all code is written, run `npm run build` to confirm a clean build.
