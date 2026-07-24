# TubeWatch — Launch Kit (repositioned Jul 23, 2026)

Replaces the old "why it worked / outlier analysis" framing in `reddit-phase1.md` and
`reddit-posts.md`. New wedge: **paste any channel → get 3 specific videos to make next**,
free and instant. Pricing is now **Free / Pro $12** (the $49 tier is retired).

**The offer that does the work:** the free front door `tubewatchhq.com/channel` generates
3 next-video ideas for ANY channel with no login. That means the Reddit thread isn't "DM me
for a teardown" — it's "go try it on your own channel right now, and drop the result." Lower
friction, more shareable, and people convince themselves.

---

## The iron rules (Reddit's immune system kills violations)

1. Disclose you built it, in the post body, plainly.
2. One account — yours. No alt upvotes, no seeded comments.
3. Deliver value IN the thread. Paste the ideas/screenshots in replies, not "DM me."
4. Don't drop the URL until someone asks — someone always asks. (Exception: if a sub's rules
   require the link in a flaired self-promo thread, follow the sub.)
5. Answer everyone for the first 2–3 hours — sorted-by-new is where threads live or die.
6. Read each sub's current self-promo rules the DAY you post; they change. Post one community
   at a time, never cross-post the same thread same-day.
7. Frame every idea as **borrow the pattern, make it original** — never "clone this video."
   The creator community turned on tools that make YouTube derivative; stay on the right side.

---

## Primary thread — r/NewTubers

**Title:**
> I built a free tool that tells you the 3 videos you should make next. Drop your channel and
> I'll post yours in the comments.

**Body:**
> The hardest question on YouTube isn't "how am I doing" — it's "what do I film next?"
>
> I got obsessed with it and built a tool that answers it with evidence instead of vibes. It
> looks at what's actually *breaking out* in your niche right now (videos beating their own
> channel's normal pace — not just big channels' big numbers), finds the pattern behind them,
> and turns that into 3 specific videos you could shoot this week — title, hook, and the
> breakout each idea is based on.
>
> **Full disclosure: I built it, it's my product, and this thread is me pressure-testing
> whether the ideas are actually good or just confident-sounding filler.** Tell me if they're
> generic — that's the feedback I need.
>
> Drop your channel handle and I'll reply with your 3 next-video ideas, free, right here. Or
> run it yourself — it's free and needs no signup (I'll share the link if you ask).

**Reply template (delivering the 3 ideas):**
> **@channel — here's what I'd film next:**
>
> Your niche is popping off with [pattern seen in their breakouts]. Three angles that fit
> *your* channel (not a mega-channel's):
>
> 1. **[Working title]** — Hook: [first 10 seconds]. Why it fits: [tie to their baseline/a breakout].
> 2. **[Working title]** — Hook: […]. Why: […]
> 3. **[Working title]** — Hook: […]. Why: […]
>
> These borrow the *pattern* from [named breakout] — make them your own, don't copy it.
> (Built from public data, so treat them as strong starting points, not gospel.)

Keep replies tight. Screenshot the tool output when it's clean (`04-ai-teardown.png` shows the
format) — a visual result is more shareable than a wall of text.

---

## Variant — r/SmallYTChannel (community/growth tone)

**Title:**
> Tired of staring at analytics that don't tell you what to DO? I built a free "what should I
> make next" tool — happy to run yours.

**Body:**
> Every analytics tool shows you last month's numbers. None of them answer the only question
> that matters on upload day: what do I make next?
>
> I built a small tool that reads what's breaking out in your niche and turns it into 3
> concrete video ideas for a channel your size. Founder here — full transparency, it's mine,
> and I'm looking for honest reactions on whether the ideas are actually usable. Drop a handle
> (yours or a competitor's) and I'll post the 3 ideas below.

---

## Variant — r/PartneredYoutube (data-driven, low-key)

**Title:**
> Experiment: can "what's breaking out in your niche" be turned into your next 3 videos
> automatically? Testing it — drop a channel.

**Body:**
> I've been building a tool that scores videos by age-adjusted views/day vs. the channel's own
> median (so a breakout shows up while it's breaking, not months later), then composes 3
> next-video concepts from the patterns. Founder disclosure: it's a product I'm building; I'm
> here for data and critique, not a pitch. Post a channel and I'll run it.

---

## When someone asks "what's the tool?"

> It's TubeWatch — tubewatchhq.com. The "3 videos to make next" page is free and needs no
> account: **tubewatchhq.com/channel** — paste any handle. Beta; Pro is $12/mo if you want it
> for your own channel with competitor tracking and the full AI coach. Free tier is genuinely
> useful on its own.

---

## Capacity + cost notes (read before posting)

- **The free `/channel` generator is cached per channel for 7 days** and **capped at 25
  generations per IP per day.** Repeat visitors cost nothing; a crawler burns its own budget.
- **Launch-day caveat for YOU:** if you paste many *different* commenters' channels from your
  own IP, you can hit that 25/day cap yourself. Two clean options: (a) run those teardowns
  while **logged in** (the in-app "Why It Worked" / next-video flow isn't IP-capped), or
  (b) bump `DAILY_IP_LIMIT` in `app/api/ai/next-videos/route.ts` for launch week.
- Each lookup of an *unknown* channel costs ~100 YouTube quota units; the daily search-quota
  guard absorbs a normal thread. A monster thread may trip it late-day — the friendly error is
  by design; continue the next morning.
- AI runs on Haiku (well under a cent per generation), so cost is dominated by YouTube quota,
  not tokens.

---

## After the thread

- Screenshot every "oh that's actually good" reply → these are the landing-page testimonials
  it's missing. DM for permission before using usernames.
- Note every channel you ran → that's your beta-invite / follow-up list.
- One week later, post the retro as your SECOND post: "I generated next-video ideas for 40
  channels — here's the pattern in what's breaking out right now." A findings post outperforms
  a launch post and re-warms the same audience.

---

## Sequencing

1. Deploy the repositioned site first (apply the migration + push.bat) so `/channel` shows the
   3-ideas section before anyone arrives.
2. Warm the account: meet each sub's karma/account-age bar; contribute genuinely for a few days.
3. Post r/NewTubers first. If it lands, run r/SmallYTChannel, then r/PartneredYoutube — one at a
   time, a few days apart.
4. Collect testimonials → put them on the landing page → then scale.
