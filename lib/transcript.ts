import { YoutubeTranscript } from "youtube-transcript";

/**
 * Timed-transcript utilities (spec: docs/specs/transcript-why-it-worked.md).
 *
 * youtube-transcript returns segments with millisecond offsets — that's
 * pacing data, not just text. These helpers turn it into the structural
 * inputs the AI teardown needs: a timestamped hook window, a pacing profile,
 * and a minute-by-minute section map. Everything except the fetch is a pure
 * function of segments, so it's testable without network.
 */

export type TranscriptSegment = { text: string; offset: number; duration: number }; // ms
export type TimedTranscript = {
  segments: TranscriptSegment[];
  fullText: string;
  wordCount: number;
};

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Best-effort transcript fetch. Null on ANY failure (disabled captions,
 * private video, scrape breakage, timeout) — callers must degrade honestly,
 * never fabricate pacing claims. youtube-transcript is an unofficial scrape;
 * a breakage must never take the endpoint down with it.
 */
export async function fetchTimedTranscript(
  videoId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<TimedTranscript | null> {
  try {
    const segments = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("transcript timeout")), timeoutMs)
      ),
    ]);
    if (!segments || segments.length === 0) return null;
    const fullText = segments
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      segments: segments.map((s) => ({ text: s.text, offset: s.offset, duration: s.duration })),
      fullText,
      wordCount: fullText ? fullText.split(" ").length : 0,
    };
  } catch {
    return null;
  }
}

export function fmtTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * The first `seconds` of speech with inline [m:ss] marks roughly every
 * `markEverySeconds`, so the model can cite WHEN the promise/payoff/stakes
 * land instead of vaguely praising "the hook".
 */
export function hookWindow(
  segments: TranscriptSegment[],
  seconds = 60,
  markEverySeconds = 15
): string {
  const limitMs = seconds * 1000;
  const stepMs = markEverySeconds * 1000;
  let nextMark = 0;
  const parts: string[] = [];
  for (const seg of segments) {
    if (seg.offset >= limitMs) break;
    if (seg.offset >= nextMark) {
      parts.push(`[${fmtTimestamp(seg.offset)}]`);
      nextMark = seg.offset + stepMs;
    }
    parts.push(seg.text);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export type PacingProfile = {
  wordsPerMinute: number | null;
  openingWordsPerMinute: number | null; // first 60s
  /** Speechless stretches > 3s — music beds, b-roll, dead air. Capped at 8. */
  gaps: { at: string; seconds: number }[];
  /** Share of the video's runtime covered by speech (null without duration). */
  speechCoverage: number | null;
};

export function pacingProfile(
  segments: TranscriptSegment[],
  videoDurationSeconds?: number | null
): PacingProfile {
  if (segments.length === 0) {
    return { wordsPerMinute: null, openingWordsPerMinute: null, gaps: [], speechCoverage: null };
  }

  const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
  const totalWords = segments.reduce((n, s) => n + words(s.text), 0);
  const last = segments[segments.length - 1];
  const speechSpanMs = last.offset + last.duration - segments[0].offset;

  const openingWords = segments
    .filter((s) => s.offset < 60_000)
    .reduce((n, s) => n + words(s.text), 0);

  const gaps: { at: string; seconds: number }[] = [];
  for (let i = 1; i < segments.length && gaps.length < 8; i++) {
    const prevEnd = segments[i - 1].offset + segments[i - 1].duration;
    const gapMs = segments[i].offset - prevEnd;
    if (gapMs > 3_000) {
      gaps.push({ at: fmtTimestamp(prevEnd), seconds: Math.round(gapMs / 1000) });
    }
  }

  const spokenMs = segments.reduce((n, s) => n + s.duration, 0);

  return {
    wordsPerMinute:
      speechSpanMs > 10_000 ? Math.round(totalWords / (speechSpanMs / 60_000)) : null,
    openingWordsPerMinute: openingWords > 0 ? openingWords : null,
    gaps,
    speechCoverage:
      videoDurationSeconds && videoDurationSeconds > 0
        ? Math.min(1, parseFloat((spokenMs / (videoDurationSeconds * 1000)).toFixed(2)))
        : null,
  };
}

/**
 * Minute-by-minute section map for the Growth deep audit: the first ~12 words
 * spoken nearest each minute mark. Capped so hour-long videos don't blow up
 * the prompt.
 */
export function sectionMap(
  segments: TranscriptSegment[],
  everySeconds = 60,
  maxEntries = 20
): { at: string; text: string }[] {
  const out: { at: string; text: string }[] = [];
  let nextMark = 0;
  for (const seg of segments) {
    if (out.length >= maxEntries) break;
    if (seg.offset >= nextMark) {
      out.push({
        at: fmtTimestamp(seg.offset),
        text: seg.text.trim().split(/\s+/).slice(0, 12).join(" "),
      });
      nextMark = seg.offset + everySeconds * 1000;
    }
  }
  return out;
}
