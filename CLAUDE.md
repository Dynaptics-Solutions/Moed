# CLAUDE.md — Moed

Instructions for anyone (or any agent) writing code in this repository.

## What Moed is

A mobile planner built on one claim: **a day has a limit, and the app tells you when you have passed it.** Other planners let you promise yourself fourteen hours of work in an eight hour day. Moed counts hours rather than tasks, so it can refuse.

Three budgets, one visual language:

- **Hours**, per day — the planner. Free.
- **Money**, per week — bills and spending. Free.
- **Calories**, per week with daily guidance — the diet plan. Paid.

The same three-segment capacity bar renders all three. Only the unit changes.

## Non-negotiables

Read these before touching a screen. They are the product, not preferences.

1. **The app proposes; it never moves anything.** Every suggestion is one tap to accept and one tap to undo. No auto-scheduling, no silent rescheduling, no AI rearranging a day.
2. **Nothing disappears.** Skipped records go to the tray with a visible slip count. Nothing rolls silently into tomorrow.
3. **`--over` is only ever "past the limit."** Never use the alert colour for anything else — not for delete, not for errors, not for emphasis.
4. **Estimates are ranges.** Never render a single fake-precise number for something we guessed. Ranges tighten as the user confirms detail.
5. **Workout burn is never added back to a calorie allowance.** Activity changes the allowance only through the three-week recalibration.
6. **Nothing is logged silently.** Anything the watch closes on the user's behalf is shown once, with an undo.
7. **If a notification cannot carry its own decision, do not send it.** Actions go on the notification face.
8. **One scheduled notification a day** — the evening close. Everything else is a reminder the user set or a consequence of something they just did.
9. **Export is never gated**, and a lapsed subscription makes data read-only, never hidden.
10. **No streaks, no scores, no badges, no encouragement copy.** The app is honest, not motivational.

## Copy voice

Plain, specific, and never cheerful. State the number. "This puts you 40 minutes over" — not "Careful! Your day looks busy 😅". No exclamation marks, no emoji, no second person plural ("let's"). Sentence case everywhere except the small uppercase labels. British spelling in existing copy; match it.

When a screen has to say no, it says why, and it offers the way through. Never a dead end.

## Design system

Tokens live in `design/screen.dc.html` as CSS custom properties (`:root` and `:root[data-moed="dark"]`). Port them once into the codebase's theme and reference them by name — never hardcode a hex.

Key values: `--acc #24443C` (brand green) · `--taupe #A48C7C` (fixed time, paid) · `--over #A8402F` (past the limit) · `--bg #F5F2ED` · `--ink #1E2B26`.

Type is two families and no third: **Cormorant Garamond** for dates, counts and titles; **Archivo** for everything interactive. The full scale is in the design README.

Platform differences are real, not cosmetic: iOS gets 13px radii, bottom tabs and an inline add pill; Android gets pill buttons, 18–26px radii and a FAB. Use native components on each.

## Where things are

```
CLAUDE.md          this file
apps/mobile/       the app — Expo, TypeScript, Expo Router
  app/             routes
  src/theme/       the ported design tokens; the only place a hex belongs
  src/db/          Drizzle schema and the SQLite client
  drizzle/         generated migrations — commit them, never hand-edit
design/            the HTML prototypes — references, not code to lift
  index.dc.html    start here: links every design
  README.md        the build spec
  standalone/      self-contained copies, for opening from disk
design_planning/   build plan and the decisions already settled
.github/workflows/ typecheck, lint, format and bundle on every push
```

Start with `design/index.dc.html`. `design/mockups.dc.html` has all 51 screens live, `design/storyboard.dc.html` is the navigation graph, and `design/README.md` is the spec to build from.

**The prototypes are references.** They are HTML mockups of intended look and behaviour. Recreate them in this codebase's environment and patterns — do not port the HTML, do not copy the DC runtime, and do not treat `screen.dc.html` (all 51 screens in one file, switched by a prop) as an architecture suggestion. It is a prototyping convenience; in production these are separate routes.

## Conventions

- **Screen names match the prototype's `screen` prop** — `day`, `full`, `dietgate`, `readonly`. Keep them, so the design and the code refer to the same things.
- **The capacity bar is one component.** Build it once, parameterise the unit, use it everywhere. If you find yourself writing a second one, stop.
- **Lists scroll, screens do not.** Each screen is a fixed frame with one scrolling content region. Android's usable height is ~120px shorter than iOS's — lay out against the short one.
- **Entitlement checks belong in one place.** Free vs paid is a table, not scattered conditionals. See `design_planning/DECISIONS.md`.
- Health data stays on device wherever the platform allows it. Only request the six scopes listed in the spec; do not request heart rate.

## When you are unsure

Ask, and default to the plainer option. This product's whole value is that its numbers can be trusted — a feature that guesses convincingly is worse than one that admits a range.
