# Chrome Web Store — submission pack

Everything you need to paste/upload. The package to upload is
`dist/tubewatch-extension-v0.1.0.zip`.

> Only you can do the account-bound steps: create the developer account, pay the
> $5 one-time fee, accept Google's terms, and click **Publish**. Everything
> below is written so those are the only decisions left.

---

## Store listing fields

**Item name**
```
TubeWatch — Outlier Scores for YouTube
```

**Summary** (max 132 chars)
```
See TubeWatch's age-adjusted outlier scores on YouTube thumbnails and watch pages, and track breakout channels in one click.
```

**Category:** Productivity
**Language:** English (United States)

**Detailed description**
```
TubeWatch brings its age-adjusted outlier score — views-per-day vs. a channel's own median, not just raw views — directly onto YouTube.

WHAT YOU GET
• Outlier badges on video thumbnails across YouTube (home, search, channel, sidebar), color-coded so breakouts jump out.
• A stats panel on any watch page: outlier score plus views, likes, comments, views-per-hour, and exact publish date.
• One-click "Track on TubeWatch" from any channel page.

WHY IT'S DIFFERENT
Most tools compare a fresh video's total views to mature back-catalog totals, so real breakouts only show up long after they've blown up. TubeWatch scores views-per-day against the channel's median, so a video pulling views fast right now stands out immediately.

HOW TO USE IT
1. Create a free account at tubewatchhq.com.
2. Go to Settings → Browser Extension and generate your API key.
3. Paste the key into the extension popup. Done — scores appear as you browse YouTube.

Free accounts include a generous daily allowance; paid plans raise the limits. The extension only reads YouTube video IDs and only runs on youtube.com — see our privacy policy for details.
```

**Single purpose** (Google requires one clear purpose)
```
Display TubeWatch outlier scores and video statistics on YouTube pages.
```

**Privacy policy URL**
```
https://www.tubewatchhq.com/extension-privacy
```

---

## Permission justifications (the review form asks for each)

- **storage** — "Stores the user's TubeWatch API key locally so the extension can authenticate requests."
- **host permission `https://www.youtube.com/*`** — "The extension injects outlier badges and a stats panel into YouTube pages; it must read video IDs and modify the page there."
- **host permission `https://www.tubewatchhq.com/*`** — "The extension calls the TubeWatch API to fetch outlier scores for the videos being viewed."
- **Remote code:** No. All code is bundled in the package.

## Data-use disclosures (Privacy practices tab)

- **Does this item collect user data?** Yes.
- Data types:
  - **Website content** → YouTube video IDs the user views (to fetch scores).
  - **Authentication information** → the TubeWatch API key.
- Certifications (check all three — they are true for this extension):
  - ☑ Not sold to third parties (outside approved use cases).
  - ☑ Not used or transferred for purposes unrelated to the item's single purpose.
  - ☑ Not used or transferred to determine creditworthiness or for lending.

---

## Visual assets required

Have already: `icons/icon128.png` (store icon).

Still to produce (need the extension loaded to capture real screenshots):
- **At least 1 screenshot**, 1280×800 or 640×400 PNG/JPG. Suggested: a YouTube page
  with outlier badges visible, and one of the watch-page panel. (Load unpacked,
  then screenshot.)
- Optional small promo tile 440×280.

---

## Submit (your steps)

1. Go to **chrome.google.com/webstore/devconsole**, sign in, pay the one-time **$5** fee.
2. **Add new item** → upload `dist/tubewatch-extension-v0.1.0.zip`.
3. Fill the listing from the fields above; add the screenshot(s).
4. Fill **Privacy practices** from the disclosures above; paste the privacy-policy URL.
5. Choose visibility: **Public** (searchable) or **Unlisted** (link-only — good for a soft
   launch; put the resulting "Add to Chrome" link on tubewatchhq.com).
6. **Submit for review** (usually a few days).

## Note to confirm
- The privacy page and this listing reference **support@tubewatchhq.com**. Confirm that
  inbox exists (or swap in the address you want) before submitting.
