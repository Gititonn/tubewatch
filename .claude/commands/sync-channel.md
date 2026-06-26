Trigger a YouTube channel sync for the current user.

Steps:
1. Check if the dev server is reachable: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/youtube/sync`
2. If not running (connection refused or non-200), remind the user to start it: `npm run dev`
3. If running, POST to the sync endpoint and show the response:
   `curl -s -X POST http://localhost:3000/api/youtube/sync`
4. Report the result — on success say "Sync triggered successfully", on error show the error body.

Note: This calls the manual sync endpoint. The automated daily sync runs via Vercel cron at 06:00 UTC.
