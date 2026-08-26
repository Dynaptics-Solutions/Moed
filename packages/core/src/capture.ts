import * as chrono from 'chrono-node';

/**
 * Parsing a typed capture line into a record.
 *
 * This is the highest-frequency action in the app and it is deliberately not a model
 * call. A local parser is cheaper, and it is *better*: it works with no signal, which a
 * planner needs. A model is the fallback for what this cannot read, not the default.
 *
 * Two things come out of a line: when it is, and how long it takes. Everything left
 * over is the title, because a record with a wrong title the user can see and fix beats
 * a clever one they cannot.
 */

export type ParsedCapture = {
  /** What is left after the date and the length are lifted out. */
  title: string;
  /** Epoch ms, when the line named a time or a day. */
  startAt?: number;
  /** Whether the line named a clock time, or only a day. */
  hasTime: boolean;
  lengthMinutes?: number;
  /**
   * What was understood, in the words the caption uses: "Parsed 'Thursday 40m' out of
   * what you typed." Empty when nothing was recognised.
   */
  matched: string[];
};

/**
 * Lengths, in the forms people actually type. Ordered longest-pattern-first so "1h30"
 * is not read as a bare "1h" with a stray 30.
 *
 * "Half day" is here because the task form offers it as a chip, so someone will type it.
 * It is half of the default 9h 30m day, rounded to the nearest five minutes.
 */
const HALF_DAY_MINUTES = 285;

type LengthPattern = { re: RegExp; minutes: (m: RegExpMatchArray) => number };

const LENGTH_PATTERNS: LengthPattern[] = [
  // "1h30", "1 h 30", "2hr15"
  {
    re: /\b(\d{1,2})\s*(?:h|hr|hrs|hour|hours)\s*(\d{1,2})\b(?!\s*(?:m|min))/i,
    minutes: (m) => Number(m[1]) * 60 + Number(m[2]),
  },
  // "1h 30m", "2 hours 15 minutes"
  {
    re: /\b(\d{1,2})\s*(?:h|hr|hrs|hour|hours)\s*(\d{1,2})\s*(?:m|min|mins|minute|minutes)\b/i,
    minutes: (m) => Number(m[1]) * 60 + Number(m[2]),
  },
  // "half day"
  { re: /\bhalf[\s-]?day\b/i, minutes: () => HALF_DAY_MINUTES },
  // "90m", "25 min", "45 minutes"
  {
    re: /\b(\d{1,3})\s*(?:m|min|mins|minute|minutes)\b/i,
    minutes: (m) => Number(m[1]),
  },
  // "2h", "1.5 hours"
  {
    re: /\b(\d{1,2}(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i,
    minutes: (m) => Math.round(Number(m[1]) * 60),
  },
];

/** Punctuation left stranded once a date or a length is lifted out of the middle. */
const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    // A comma that lost the words in front of it keeps its space on the wrong side.
    .replace(/\s+([,;:])/g, '$1')
    .replace(/([,;:])\s*(?=[,;:])/g, '')
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '')
    .trim();

export type ParseOptions = {
  /** What "today" and "Thursday" are relative to. Defaults to now. */
  reference?: Date;
};

export function parseCapture(input: string, options: ParseOptions = {}): ParsedCapture {
  const reference = options.reference ?? new Date();
  const matched: string[] = [];
  let rest = input;

  // Length first. chrono reads "25 min" as a duration and would otherwise swallow it.
  let lengthMinutes: number | undefined;
  for (const { re, minutes } of LENGTH_PATTERNS) {
    const m = rest.match(re);
    if (!m) continue;
    lengthMinutes = minutes(m);
    matched.push(m[0].trim());
    rest = rest.slice(0, m.index).concat(rest.slice((m.index ?? 0) + m[0].length));
    break;
  }

  const [when] = chrono.parse(rest, reference, { forwardDate: true });

  let startAt: number | undefined;
  let hasTime = false;

  if (when) {
    startAt = when.start.date().getTime();
    hasTime = when.start.isCertain('hour');
    matched.unshift(when.text.trim());
    rest = rest.slice(0, when.index).concat(rest.slice(when.index + when.text.length));
  }

  return {
    title: tidy(rest),
    startAt,
    hasTime,
    lengthMinutes,
    matched,
  };
}

/**
 * The capture sheet's caption: "Parsed 'Thursday 40m' out of what you typed."
 *
 * Returns null when nothing was recognised, because a line saying it understood
 * nothing is worse than no line — the user can see the chips are unset.
 */
export function parsedSummary(parsed: ParsedCapture): string | null {
  if (parsed.matched.length === 0) return null;
  return `Parsed “${parsed.matched.join(' ')}” out of what you typed.`;
}
