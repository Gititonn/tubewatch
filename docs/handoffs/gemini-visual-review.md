# Handoff: TubeWatch visual/cosmetic clarity review

You're reviewing a live, working product — not a mockup. The functionality is solid and
already validated by multiple review rounds; **this review is scoped to visual/cosmetic
clarity only.** Please read "Out of scope" below before making suggestions — several
obvious-looking fixes have already been tried and shipped.

## The problem, in the founder's own words

> "At a glance, you should be able to tell what this section means, what that section
> does, and how it benefits myself. Currently, when I look at it, I see a lot of
> technical stuff, but I don't know what to do with all that stuff... The site itself
> needs to be idiot proof."

He explicitly does **not** want a popup/coachmark tour — he wants the layout, typography,
color, and copy hierarchy itself to make each section's purpose and benefit obvious
without reading dense text or clicking through a tutorial. He also asked whether an FAQ
is needed — please give an explicit recommendation on that (see "Specific questions"
below).

## What TubeWatch is (one paragraph, for context)

A YouTube analytics tool for small/growing creators (roughly 1K–100K subscribers).
Positioning: "find the breakout videos in your niche before you make your next one." It
tracks competitor channels, scores every video by age-adjusted velocity (views/day vs.
that channel's own median — NOT raw view counts), and an AI coach ("Why It Worked")
produces a timestamped structural teardown of why a specific video overperformed. Free /
Pro ($19) / Growth ($49) tiers.

## Access

- **Live site:** https://www.tubewatchhq.com (always use the `www.` host — the apex
  redirects and some tools mishandle it)
- **Demo account (already populated with real data — no setup needed):**
  `demo@tubewatchhq.com` / `Demo-TubeWatch-2026`
  Log in at `/login`, land on `/dashboard`. The account has a connected channel
  (Fireship), 3 auto-tracked competitors, and real scored outlier videos.
- **No-login public pages:** the landing page (`/`), and the live scoring demo at
  `/channel/@fireship` (or any `/channel/@handle`) — paste any channel, see it scored in
  seconds.

## Pages to review, in priority order

1. `/dashboard` — the page every returning user sees first. Just had its content
   hierarchy reworked (see "Already fixed" below) — evaluate the NEW structure's visual
   execution, not whether a checklist belongs there.
2. `/` (landing page) — public pitch.
3. `/competitors/outliers` (Outlier Feed) — the hero feature: a filterable grid of
   competitor videos with outlier-multiplier badges (e.g. "🔥 77.8x") and a "Why It
   Worked" AI button on each card.
4. `/competitors` — the list of tracked competitor channels.
5. `/rising`, `/patterns`, `/compare` — secondary analysis tools (Patterns/Compare are
   Pro-gated with a blurred preview behind the lock).
6. `/billing` — pricing table.

## Design system already in place (work within it, don't replace it)

Dark theme via CSS custom properties (`app/globals.css`), a light theme exists too but
dark is default/primary:

```
--bg-card:        #111827   (dark)   /  #FFFFFF (light)
--border:         rgba(255,255,255,0.07)  /  #E2E8F0
--text-primary:   #F9FAFB   /  #0F172A
--text-secondary: #9CA3AF   /  #475569
--text-muted:     #4B5563   /  #94A3B8
```

Page background is near-black (`#0f0f0f`), accent color is bright green `#00ff87`
(brand color, used for primary CTAs and "positive/winning" signals), red `#ff4444` /
`#ef4444` marks outlier/hot signals, purple `#a855f7` marks the AI features. Font is
Inter. Tailwind + inline `style` objects (not a component library like shadcn) — this is
a from-scratch dark SaaS aesthetic, intentionally a bit "trading terminal," not a soft
consumer-app look. **If you recommend a lighter/softer visual direction, say so
explicitly as a bigger brand call** rather than folding it into a "clarity" fix — the
founder should decide that trade-off knowingly, not by accident.

## Already fixed — do not re-suggest these

We've been through three rounds of external review already (ChatGPT, Gemini, and a
multi-persona "roast council"). Please don't spend the review re-finding these:

- ~~Hamburger-hidden nav on desktop~~ — desktop has a persistent left sidebar, organized
  into sections (top: Dashboard/Outlier Feed/AI Coach; "Discover": Trending/Rising/
  Competitors; "Analyze": Outlier Score/Patterns/Compare/Videos; then Billing/Settings).
- ~~No proof/live demo on landing~~ — hero now has a live "paste any channel, see it
  scored" search box.
- ~~Landing page has no screenshots~~ — has a marquee of illustrative outlier cards, a
  raw-views-vs-age-adjusted math comparison table, and a "most tools don't even know your
  channel exists" comparison section.
- ~~AI credit burn with no warning~~ — a "⚡ N/5 left" badge now shows near every AI
  action button, and "Why It Worked" buttons say "· 1 credit" with a tooltip before you
  click.
- ~~Dashboard buries the hero feature under a 9-tile "Explore" grid~~ — **just removed**
  (today). The dashboard now flows: channel stats → biggest-outlier callout → a small
  "Getting Started" progress card (2 steps, only shown until both are done, computed live
  from account state — not a dismissible tour) → the competitor Outlier Feed → view
  trends → AI upsell → recent videos. **This new flow is exactly what needs a cosmetic
  pass** — the content order is right, but does each block visually communicate its own
  purpose without reading every word of body text?
- ~~Pro paywalls are a bare lock icon~~ — `/patterns` and `/compare` now show a blurred
  preview of real-looking example data behind the lock, not just a padlock + text.
- ~~"MOST POPULAR" badge with zero social proof~~ — removed.

## Specific questions to answer

For **each** of the 6 pages listed above, answer:

1. **The 5-second test:** looking at this page cold, with zero prior context, what do
   you think each major section/card is FOR? Where would you hesitate or misread intent?
2. **Visual hierarchy:** is there one clear focal point per screen, or do 3+ elements
   compete for attention at equal visual weight (size, color saturation, border
   strength)? Name the specific offending elements.
3. **Iconography/color consistency:** are the same icon/color choices used
   inconsistently for different meanings anywhere? (e.g. is red always "hot/outlier" and
   never accidentally "error/danger" too?)
4. **Density:** is information density appropriate per section, or are some cards trying
   to say too much at once (and should split/simplify), or too little (forcing a click
   to understand basic purpose)?
5. **Copy-as-UI:** are section headers/microcopy doing the work of explaining "why this
   matters to me" or are they just labels? Give rewritten copy suggestions, not just
   "make copy clearer."

**FAQ question — answer explicitly:** Given the product's actual complexity (age-adjusted
outlier scoring, velocity vs. lifetime score, competitor auto-suggestions, AI credit
metering, plan tiers), do you recommend (a) a dedicated FAQ page, (b) contextual
"what does this mean" affordances inline per metric/section (e.g. an (i) info affordance
next to "Outlier Score"), (c) both, or (d) neither — and why? If FAQ, list the actual
questions it should answer based on what you observe is confusing.

## Output format requested

Please rank findings **worst-first** (biggest clarity problem first), and for each:
- **The issue** (specific element/page/copy, not a generalization)
- **Why it confuses a first-time small-creator user** specifically
- **The concrete fix** — actual copy rewrites, specific spacing/sizing/color changes
  within the existing token system above, or a described layout change. Avoid "improve
  the visual hierarchy" without saying exactly how.

If you're able to browse the live demo account directly and take screenshots to reason
over, please do — the described structure above is accurate as of today but a live look
will catch anything this document missed.
