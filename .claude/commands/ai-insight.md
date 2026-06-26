Generate an AI outlier insight for a specific video. Video ID or title: $ARGUMENTS

Steps:
1. If $ARGUMENTS looks like a YouTube video ID (11 chars, alphanumeric+dash+underscore), use it directly.
   Otherwise, search `lib/youtube.ts` and the videos table to understand how videos are stored.

2. Read `app/api/ai/outlier-insight/route.ts` to understand the request format expected.

3. Call the endpoint with the video ID:
   `curl -s -X POST http://localhost:3000/api/ai/outlier-insight -H "Content-Type: application/json" -d '{"videoId":"VIDEO_ID"}'`
   
   (Replace VIDEO_ID with the actual ID from $ARGUMENTS)

4. Stream and display the AI response as it arrives.

5. If the dev server is not running, tell the user to start it with `npm run dev` first.
