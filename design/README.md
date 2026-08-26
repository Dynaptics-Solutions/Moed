# Handoff: Moed — planner, diet plan, activity

## Overview

Moed is a mobile planner built on one claim: **a day has a limit, and the app tells you when you have passed it.** Every other planner lets you promise yourself fourteen hours of work in an eight hour day. Moed counts hours rather than tasks, so it can refuse.

Three budgets, one visual language:

| Budget | Period | Where it appears |
| --- | --- | --- |
| Hours | a day | day / week / month views, every record |
| Money | a week | bills, spending |
| Calories | a week, with daily guidance | diet plan |

The same three-segment capacity bar renders all three. Only the unit changes. If a feature spends none of them, it does not belong in the product.

Free covers the planner (hours and money). Paid covers food, diet, activity sync, cross-device sync, AI and maps at **$4.99/month or $39.99/year**, with a **14-day trial**. The wrist apps are parked — see `../design_planning/DECISIONS.md`.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy. The task is to **recreate these designs in the target codebase's environment** (React Native, Flutter, SwiftUI + Kotlin, whatever you choose) using its established patterns. If no codebase exists yet, pick the framework and implement there.

Two structural notes about the prototypes that do **not** carry over:

- `Moed Screen.dc.html` renders all 51 screens in one file switched by a `screen` prop. That is a prototyping convenience. In production these are separate routes/views.
- The prototype fakes platform differences with a `data-p="ios|android"` attribute overriding a handful of CSS values. In production, use each platform's native components.

## Fidelity

**High fidelity.** Colours, type, spacing and copy are final. Recreate pixel-accurately using the codebase's libraries.

One exception: `Planner Wireframes.dc.html` is deliberately **low fidelity** — grey-box wireframes of the full 46-screen flow, useful as a map of screens that have not been mocked yet.

## Design tokens

Defined as CSS custom properties in `Moed Screen.dc.html` (`:root` and `:root[data-moed="dark"]`). Port these verbatim.

### Colour — light

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#F5F2ED` | app surface |
| `--card` | `#FFFDFA` | cards, inputs, nav |
| `--ink` | `#1E2B26` | primary text |
| `--ink2` | `#5C6862` | secondary text |
| `--ink3` | `#97A09B` | tertiary, disabled, placeholder |
| `--line` | `rgba(30,43,38,.11)` | borders |
| `--line2` | `rgba(30,43,38,.06)` | row separators |
| `--acc` | `#24443C` | brand; accent text and strokes |
| `--accFill` | `#24443C` | filled buttons, committed load |
| `--onAcc` | `#F5F2ED` | text on accent fill |
| `--accSoft` | `#E4EAE6` | accent-tinted surfaces |
| `--taupe` | `#A48C7C` | fixed time, paid badges, labels |
| `--taupeSoft` | `#F0E9E3` | taupe surfaces |
| `--over` | `#A8402F` | over the limit — **only** ever this |
| `--overSoft` | `#F7E9E5` | over-limit surfaces |
| `--now` | `#1E2B26` | the now-line and the eating-window marker. Never `--over` — now is an index, not a state |
| `--sh` | `0 1px 2px rgba(30,43,38,.05)` | card shadow |

### Colour — dark

`--bg #141F1B` · `--card #1C2A25` · `--ink #EDE9E1` · `--ink2 #9CA8A2` · `--ink3 #6B7873` · `--line rgba(237,233,225,.13)` · `--line2 rgba(237,233,225,.07)` · `--acc #84B5A2` · `--accFill #2C5548` · `--onAcc #EAF3EF` · `--accSoft #22352E` · `--taupe #B79F8E` · `--taupeSoft #2A2422` · `--over #D98878` · `--overSoft #33221E` · `--now #EDE9E1` · `--sh 0 1px 2px rgba(0,0,0,.3)`

Note the dark theme splits the accent: `--acc` lightens for text and strokes, `--accFill` darkens for fills. Do not collapse them.

### Brand palette (logo, marketing)

`#24443C` deep green · `#A48C7C` taupe · `#F5F2ED` paper. Sampled from the supplied logo file.

### Typography

Two families, no third.

- **Display — Cormorant Garamond** (300/400/500). Dates, counts, big numbers, screen titles, sheet titles. Echoes the wordmark.
- **UI — Archivo** (400/500/600/700). Everything interactive, every label, every row.

Scale as used:

| Role | Font | Size / line-height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Screen title (date) | Cormorant | 32–36 / 1.06 | 400 | `.005em` |
| Sheet / section title | Cormorant | 26–27 / 1.2 | 400 | — |
| Big number | Cormorant | 30–52 / 1 | 400 | — |
| Section label | Archivo | 9.5 / 1 | 600 | `.17em`, uppercase, `--taupe` |
| Field label | Archivo | 9 / 1 | 600 | `.13em`, uppercase, `--ink3` |
| Row title | Archivo | 15 / 1.35 | 400 | — |
| Body | Archivo | 12–14.5 / 1.5–1.65 | 400 | — |
| Meta / tertiary | Archivo | 11.5 / 1.5 | 400 | — |
| Button | Archivo | 14.5 | 600 | — |
| Chip | Archivo | 12 / 1 | 500 | — |

### Geometry

| Value | iOS | Android |
| --- | --- | --- |
| Button height | 48 | 48 |
| Button radius | 13 | 26 (pill) |
| Card radius | 14 | 18 |
| Input radius / min-height | 11 / 42 | 14 / 42 |
| Bottom sheet radius | 26 top | 30 top |
| Chip radius | 19 (pill) | 19 |
| Capacity bar | 10 high, radius 5 | same |
| Nav bar height / bottom pad | 36 + 26 | 36 + 14 |
| Add affordance | inline 50-high pill above the tab bar | 58×58 FAB, radius 19, bottom-right |
| Safe-area top inset | 44 | 0 (frame reserves it) |

Spacing is a loose 4px scale; the recurring values are 5, 7, 9, 11, 14, 18, 20, 22.

Ring checkbox: 19×19, `1.4px solid --ink3`, 50% radius; checked fills `--accFill` with a white 1.8px tick.

## The capacity bar

The product's signature component. Get this right before anything else.

```
[ committed (--accFill) ][ fixed (--taupe) ][ free (transparent) ]
```

- Container: `display:flex; height:10; border-radius:5; overflow:hidden; background:--card; border:1px solid --line`
- Segments are flex-grown by their raw minute/currency/calorie values, not percentages.
- **Over the limit:** container border becomes `--over`, and committed and fixed compress to fill exactly the limit while the excess is drawn past them in `--over`.

  ```
  planned = committed + fixed · over = max(0, planned − limit) · free = max(0, limit − planned)
  scale   = over > 0 ? limit / planned : 1
  segments = committed × scale · fixed × scale · free · over
  ```

  The overflow is **not** a fourth segment added to the other three — that double-counts, because committed and fixed already contain the excess. It re-colours the tail. Minimum 2px per non-zero segment. Full reasoning in `../design_planning/DECISIONS.md`.
- **Estimated segments** (planned calories, not yet eaten) render `--taupe` at `opacity:.75` with a `2px dashed --card` right border. Uncertainty is drawn, never hidden.
- Caption row underneath, always: left is composition, right is what remains, in `--acc` when under and `--over` when over.

Used on: day view, over-committed day, new-task form, over-limit gate, week footer, money, diet, bill form, day-shut.

## Screens

51 screens exist in `Moed Screen.dc.html`, selected by the `screen` prop. Grouped by area, with the prop value in `code`.

### Entry
- `splash` — mark + wordmark, 2px progress rule, "Restoring 26 August". No spinner.
- `signin` — **Apple and Google only.** No email, no password, nothing to reset. Looping muted video behind a white scrim (placeholder in the prototype; supply the file). Third button: "Continue without an account" — an account is only needed for sync.

### Planner (free)
- `day` — home. Date, capacity bar, records grouped Morning/Afternoon/Evening, inline add pill.
- `full` — the over-committed day. The state the product exists for: red bar, an advisory card offering two concrete moves, the offending row marked in place. **The app proposes; it never moves anything itself.**
- `week` — 7 columns × real block heights, now-line, week total in the footer.
- `month` — no text in cells. One load bar per day, `--over` where the day is over. Tapping a cell peeks that day at the bottom.
- `capture` — bottom sheet, one line of text, chips, saves as a Task.
- `types` — the 7 record kinds. **Never on the default path** — only reached from "Make this a…" or a template.
- `task` `routine` `session` `errand` `appt` `bill` `spend` — one form per kind, showing only that kind's fields. Meal is not a kind: a cook block is a Routine and the food is a log.
- `repeat` — recurrence editor: frequency, interval stepper, weekday chips, ends (never / on date / after N), and a plain-language summary: "Every 2 weeks on Mon, Wed and Fri, until 12 December" plus "26 more of these. Each one costs its day 40 minutes."
- `gate` — over-limit gate. Fires on save from any form. Two concrete options; "Add it anyway" always available.
- `detail` — read-first sheet, three actions, everything else behind an overflow.
- `timer` — running session, full-bleed `--accFill`.
- `close` — the evening close. Three buttons per leftover: done, move, drop. No free text.
- `shut` — the day closed: counts, what carried, what tomorrow looks like.
- `projects` `project` — list and detail. Three projects free.
- `money` `bills` — weekly money limit, bills, spending log. Five bills free.
- `search` — last 30 days free, full history paid.
- `settings` — flat list, no nesting. Plan state and upgrade at the top.

### Diet and activity (paid)
- `dietsetup` — height/weight/age/activity → computed allowance. Includes "Guidance, not medical advice."
- `dietgoal` — target weight and pace. Pace chips stop at 0.75 kg/week deliberately.
- `dietplan` — AI-suggested food and workouts. Workouts are **Sessions** — they spend hours, and the screen says so.
- `diet` — the food hub: calorie bar with estimate range, macros, per-meal targets, water, eating window.
- `logfood` — text estimate as a **range** (520–680) that tightens on portion (610–650). Confirming saves it to the user's own library, free thereafter.
- `photolog` — per-item ranges with confidence pills; names which item is uncertain.
- `photolock` — the day-eight upgrade gate for photos. Photos are in the trial; they are the one thing that stops with it rather than going read-only, and the screen states the reason: reading a photo costs money every time.
- `dietgate` — the calorie over-limit gate. Same pattern as `gate`.
- `dietreview` — the diet week, seven bars, average vs target.
- `meal` — the weekly meal plan. Five dinners become five 40m cook Routines and one shopping Errand. Not a record kind; reached from `diet`, never from the type picker.
- `shoplist` — the shopping list from those dinners. One trip: 40m, £62, 12,400 kcal. Both budgets in one place.
- `deficit` — weight trend against target, deficit by week. "Weight moves for a dozen reasons; the deficit is what you control."
- `workout` — the week as Sessions. Flags that Tuesday is already full.
- `connect` — activity sources and their status.
- `permissions` — three scopes asked for (sleep, workouts, weight) and three not (steps, active energy, heart rate), each with what Moed does or does not do with it.
- `noregion` — no activity source connected. Generalised from the old Huawei screen: anything that writes to Health Connect will do, and it need not be a watch.
- `autolog` — a connected source closed a Session. Shown once, with Keep / That was not me. **Nothing is logged silently.**
- `sleepday` — you slept 5h 20m, so the day's hour limit is optimistic. Offers 7h.
- `found` — backfill proof, shown on day one after first sync.
- `recal` — the three-week recalibration.

### Trial and plans
- `paywall` — every line names its cost driver. CTA is "Start 14 days free"; "$4.99 a month after. No card until day fourteen."
- `trial` — nine of fourteen days left, what is on, what day fifteen looks like.
- `handover` — day seven: what they did with the week, then what happens if they do nothing.
- `readonly` — day fifteen: diet read-only. Says out loud that the day is back to a fixed 9h 30m.

## Interactions and behaviour

- **Navigation:** bottom tabs — Today, Calendar, Projects, Me. Calendar holds a Day/Week/Month segmented switch. Money, Meal plan, Diet plan and Watch hang off Me.
- **Sheets** slide from the bottom over a `rgba(10,18,15,.42)` scrim with a 36×4 grabber. Tapping the scrim dismisses.
- **The over-limit gate is the core interaction.** On save, if the record would exceed the day's remaining hours: show the sheet, name the overage in minutes, offer two concrete fixes (move a named record to a named empty day; shorten this one), and always allow "Add it anyway". Never auto-resolve.
- **Move carries everything.** Dragging or moving a record takes its length, reminder and project with it. Nothing else on the day shifts.
- **Nothing disappears.** Skipped records go to the tray with a visible slip count. Nothing rolls silently into tomorrow.
- **Undo, not confirm.** Adding a record returns to the day with the new row highlighted and one undo. No success screens.
- **Lists scroll, screens do not.** Each screen is a fixed-height flex column; the content column is `overflow-y:auto; overflow-x:hidden` with scrollbars hidden. Android's usable body is ~120px shorter than iOS's — anything laid out against iOS will truncate otherwise.

### Notifications

**One uninvited notification a day — the evening close.** Everything else is a consequence of something that just happened, or a reminder the user set. The one exemption is the trial reminder on day six, which is transactional and fires once.

Every notification carries its own actions — start / push 15 / move to tomorrow — so the common case never opens the app. The expanded form includes the capacity bar so the choice is informed. **If a notification cannot carry its own decision, do not send it.**

The running timer is a Live Activity on iOS and an ongoing notification on Android, not a notification proper: Pause and Done, present until the block ends, mirrored to the watch.

### Watch

- **Wear OS and watchOS:** one native app each, sharing phone logic, plus a Tile/complication for the arc.
- **Huawei:** HarmonyOS, **not** Wear OS. Separate app, separate toolchain (DevEco Studio), separate store (AppGallery).
- Circular screens: content sits in a centre box inset 18% horizontally and 14% vertically of the 216px face — the exact inscribed square leaves no margin and clips at the corners. The capacity bar becomes an arc (`stroke-dasharray` on a `rotate(-90)` circle), which is the same dial as the logo.
- The watch **cannot** create records with a length, edit anything, or plan a week. Capture is dictation that lands in the tray.
- Screens: face, next thing, timer, evening close, diet glance, over-limit gate.

### Activity sync

| Platform | Route | Notes |
| --- | --- | --- |
| Android | **Health Connect** | one integration covers Samsung, Pixel, Fitbit, Garmin. On-device. |
| iOS | **HealthKit** | Apple Watch and anything writing to it. On-device. |
| Huawei | **parked** | Huawei keeps its data in its own cloud and does not write to Health Connect, so it needs a separate integration. Deferred. Absence of any source is a normal state handled by `noregion`, never a failure. |

Three scopes are requested and no more: **sleep** shortens the day's hour limit · **workouts** close the planned Session with its real duration · **weight** feeds progress. **Steps** and **active energy** are deferred — they would only sharpen the three-week recalibration. **Heart rate** is never requested. A three-scope ask converts better than a six-scope one, and each scope is justified separately at review.

**Burn is never added back to a day's calorie allowance.** Per-workout burn estimates are the least reliable number in the system; inflating the limit with a guess makes the limit worthless. Activity changes the allowance only through the three-week recalibration, from logged intake measured against actual weight change.

**On first sync, backfill.** Health Connect and HealthKit return weeks of history. Use it to show `found` on day one — the sleep night that already happened and the notification Moed would have sent — rather than waiting for a bad night during the trial.

## State

Prototype state is trivial (`screen`, `theme`) because it is a click-through. Real state:

- **Day:** date, `dayLimitMinutes` (default 08:30–18:00 = 570), records[], derived committed/fixed/free, `isOver`.
- **Record:** id, kind (task|routine|session|errand|appointment|bill|spending|meal), title, `lengthMinutes`, start, projectId, reminder, recurrence, notes, steps[] (routine), stops[] (errand), amount+currency (bill/spending), kcal range (meal), slipCount, state (open|done|moved|dropped|tray).
- **Recurrence:** freq, interval, byWeekday[], ends {never|onDate|afterN}.
- **Week:** weekly hour total, money limit and spend, calorie limit and intake.
- **Diet:** profile (height, weight, age, activity), goal, pace, allowance, macro targets, savedFoods[], logs[], weighIns[], eatingWindow.
- **Trial:** **two independent clocks**, each started by first use — diet on first food log, activity on first successful sync. Never on sign-up: connecting a watch can take three days and must not burn trial days. One reminder only, on day thirteen. Bind to device (StoreKit / Play Billing), not account — Apple and Google sign-in give one person two identities.

### Entitlements

Free: the whole planner and money, unlimited records of the five time kinds (task, routine, session, errand, appointment), 3 projects, 5 bills, 1 calendar, 30 days of history, notifications, widgets, offline, export.

Paid: all food and diet, all activity and health sync, cross-device sync, voice, AI estimates and plans, travel times and errand routes, unlimited projects/calendars/bills, history past 30 days, own templates, project sharing.

Lapsing is not locking: diet goes read-only, diet notifications stop dead, the day limit reverts to fixed, and **everything logged stays readable and exportable.** Export is never gated. The caps are creation limits, not access limits — a lapsed subscriber keeps every project they made and simply cannot add another.

## Assets

In `assets/`, cut from the user's supplied logo file:

- `moed-mark.png` — circle monogram, transparent. Minimum 20px; below that the ring breaks.
- `moed-wordmark.png` — MOED + "PLAN WITH PURPOSE", transparent.
- `moed-icon-light.png`, `moed-icon-dark.png` — app icon, both polarities.

**These are raster.** Fine on screen at these sizes; not fine for the 1024px App Store icon, print, or favicons. Redraw the mark as vector before launch — the geometry is simple (a circle with breaks where the pin and the M's stems cross it).

The sign-in video is a **placeholder**. Supply a muted ~12s loop.

## Open questions

1. Whether a one-time purchase is offered at all.
2. `noregion` currently promises the subscription drops to **$2** for Huawei-only users. That is a pricing commitment and a support burden — confirm or remove.
3. AI cost exposure: if photo estimating is what people subscribe for, $3 has to cover a lot of vision calls. Set a fair-use line before launch.
4. Positioning: calories are currently a third unit living under Me. If they become first-class, the summary's "hours or money" line changes and Food gets its own tab.
5. Not yet designed anywhere: first-run onboarding (wireframed only), the tray, templates library, offline and sync-failure states, widget/watch beyond the boards, sharing.

## Files

```
design/
├── index.dc.html          ← start here: links every design
├── README.md              ← this file
├── mockups.dc.html        ← the board: 51 screens, both phones, light and dark
├── screen.dc.html         ← every phone screen, switched by the `screen` prop
├── watch.dc.html          ← nine watch screens, round and square. PARKED
├── notifications.dc.html  ← lock screens, Live Activity, widgets
├── plans.dc.html          ← free vs paid, and the fourteen-day trial
├── logo.dc.html           ← logo spec: lockups, icons, minimum size, misuse
├── summary.dc.html        ← the product argument in one page. ARCHIVE — pre-brand, pre-diet
├── wireframes.dc.html     ← low-fi map of all 46 flow screens
├── research.dc.html       ← competitor research and gap analysis. ARCHIVE — same vintage
├── ui-boards.dc.html      ← three early visual directions (superseded)
├── support.js             ← runtime the .dc.html files load
├── ios-frame.jsx          ← device bezels. Prototype scaffolding, not product code
├── android-frame.jsx
├── standalone/            ← self-contained copies, for opening from disk
│   ├── mockups.html
│   ├── notifications.html
│   └── ui-boards.html
└── assets/
    ├── moed-mark.png
    ├── moed-wordmark.png
    ├── moed-icon-light.png
    └── moed-icon-dark.png

../CLAUDE.md               non-negotiables, copy voice, conventions
../design_planning/
    ├── BUILD-PLAN.md      four phases, in order
    ├── DECISIONS.md       what is settled, and what is still open
    └── REQUIREMENTS-REVIEW.md  contradictions, gaps and undefined rules, with a checklist
```

### How to view

Drop the folder into VS Code and open `index.dc.html`. Everything is static — no build step, nothing to install.

**The `standalone/` copies are stale.** They were bundled before the 27 August 2026 corrections and still show eight record kinds, the old capacity bar and the old money figures. Rebuild them before relying on them, or serve the folder over HTTP and use the `.dc.html` sources. The rest of this note explains why they exist at all. Browsers refuse to let a `file://` page fetch its neighbouring files, and three of these designs load siblings at runtime — `mockups` pulls in `screen.dc.html` and the device frames, `notifications` and `ui-boards` pull in the frames. From `file://` those fetches are blocked by CORS and the phones come up empty. The `standalone/` versions have everything inlined into one file, so they work offline with no server.

**If you are going to edit,** serve the folder over HTTP instead and work on the `.dc.html` sources. In VS Code: install the Live Server extension, right-click `index.dc.html` → *Open with Live Server*. Or from a terminal in the folder:

```
python3 -m http.server 8000
# then open http://localhost:8000/index.dc.html
```

Over HTTP the sibling fetches succeed, so every `.dc.html` works and edits appear on reload. Regenerate the `standalone/` copies only when you want fresh double-clickable ones.

One more dependency: the files load **Google Fonts over the network**, so type falls back to system fonts with no connection.

### Reading order

1. `mockups.dc.html` — what it looks like, all 51 screens, tappable
2. This README — how to build it
3. `storyboard.dc.html` — how the screens connect
4. `plans.dc.html` — what is free and what is paid
5. `../design_planning/DECISIONS.md` — what is settled, and why

Not `summary.dc.html`. It used to be first here, and it predates both the brand and the diet product — five record kinds where there are seven, and the watch on the free side. Read it for the argument, never for the detail.
