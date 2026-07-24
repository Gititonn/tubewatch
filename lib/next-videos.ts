/**
 * "3 videos to make next" — the product's core promise, in one place.
 *
 * The pivot (docs/pivot-game-plan-jul23.md): stop selling analysis of the past,
 * sell the next video. Given a channel's breakouts + baseline, produce THREE
 * concrete, shoot-this-week concepts — each a working title, a hook, why it
 * fits THIS channel, and the real breakout it's modelled on. Same shape whether
 * it's rendered anonymously on /channel/[handle] or for a logged-in user.
 *
 * Grounding rules live in the prompt: model only from the evidence passed in,
 * never invent view numbers, and frame every idea as "extract the pattern, make
 * it original" — not "clone this video" (the derivative-content backlash).
 */

export type NextVideoIdea = {
  /** A working, clickable title the creator could actually use. */
  title: string;
  /** The opening hook / first 10 seconds — how the video earns the click. */
  hook: string;
  /** Why this fits THIS channel right now, tied to a breakout or the baseline. */
  why: string;
  /** The real breakout (or pattern) it's modelled on, named. */
  basedOn: string;
};

export type IdeaSeedVideo = {
  title: string | null;
  outlier_score?: number | null;
  view_count?: number | null;
  duration_seconds?: number | null;
};

export const NEXT_VIDEOS_MODEL = "claude-haiku-4-5-20251001";

function fmtDur(seconds: number | null | undefined): string {
  if (!seconds) return "?";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function listVideos(videos: IdeaSeedVideo[]): string {
  return videos
    .map(
      (v) =>
        `- "${v.title ?? "untitled"}"${
          v.outlier_score != null ? ` — ${v.outlier_score}x this channel's median` : ""
        }${v.view_count != null ? `, ${v.view_count.toLocaleString()} views` : ""}${
          v.duration_seconds ? `, ${fmtDur(v.duration_seconds)} long` : ""
        }`
    )
    .join("\n");
}

/**
 * Build the prompt. `breakouts` are the channel's over-performers (the patterns
 * worth borrowing); `baseline` are typical videos (so ideas fit the channel's
 * actual lane, not a bigger channel's).
 */
export function buildNextVideosPrompt(args: {
  channelName: string;
  breakouts: IdeaSeedVideo[];
  baseline: IdeaSeedVideo[];
}): string {
  const { channelName, breakouts, baseline } = args;

  const breakoutBlock =
    breakouts.length > 0
      ? `<breakouts>\nThe channel's recent over-performers (videos beating its own normal pace) — these are the patterns worth borrowing:\n${listVideos(
          breakouts
        )}\n</breakouts>`
      : `<breakouts>No clear breakouts on record for this channel yet — base the ideas on the baseline videos and the channel's evident niche.</breakouts>`;

  const baselineBlock =
    baseline.length > 0
      ? `<baseline>\nTypical videos on this channel (its normal lane — keep ideas realistic for this size):\n${listVideos(
          baseline
        )}\n</baseline>`
      : "";

  return `You are a YouTube content strategist for a SMALL, growing channel. Your job is the single question the creator cares about: "what should I film next?"

Channel: ${channelName}

${breakoutBlock}

${baselineBlock}

Propose exactly THREE next videos this creator should make. Each must:
- borrow the PATTERN behind a breakout above (angle, format, title shape, or hook) — never tell them to clone or re-upload a specific video; the idea must be original and their own.
- be realistic for a channel this size (match the baseline's lane, not a mega-channel).
- be specific enough to shoot this week — a real title, not a topic area.

Ground everything in the evidence above. Do NOT invent view counts or stats.

Respond with ONLY a JSON array of exactly 3 objects, no prose before or after, in this exact shape:
[
  {
    "title": "a working, clickable video title",
    "hook": "the first 10 seconds — how it earns the click, one or two sentences",
    "why": "why this fits THIS channel now, referencing a breakout or the baseline",
    "basedOn": "the breakout or pattern it's modelled on, named"
  }
]`;
}

/**
 * Defensive parse — Haiku is asked for pure JSON, but strip any stray prose and
 * extract the first array. Returns [] on anything malformed so callers can
 * degrade gracefully instead of throwing.
 */
export function parseIdeas(raw: string): NextVideoIdea[] {
  if (!raw) return [];
  let text = raw.trim();
  // Strip markdown code fences if the model wrapped the JSON.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((o) => o && typeof o === "object")
      .map((o) => ({
        title: String(o.title ?? "").trim(),
        hook: String(o.hook ?? "").trim(),
        why: String(o.why ?? "").trim(),
        basedOn: String(o.basedOn ?? "").trim(),
      }))
      .filter((o) => o.title.length > 0)
      .slice(0, 3);
  } catch {
    return [];
  }
}
