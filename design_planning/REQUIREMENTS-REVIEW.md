# Requirements review

A read of the whole design package on 26 August 2026, before any code exists.

This does not relitigate anything in `DECISIONS.md`. Every item below is one of two things: a place where two files in the package say different things, or a place where the package asserts something it never defines well enough to build. Each has a file and line, so it can be checked rather than argued about.

The spec is in good shape — a clear thesis, 51 hi-fi screens, a navigation graph, an entitlement table and a phase order where each phase earns the next. The list is long because the package is detailed, not because it is weak.

The checklist at the end is the whole thing in decision order.

## Status — 26 August 2026

Every contradiction in section 1 and every undefined rule in section 2 has been ruled on, same day. The rulings live in `DECISIONS.md`; this document keeps the evidence and the line numbers, so it stays useful as the list of what to fix in the prototypes.

| Item | Ruling |
| --- | --- |
| 1.1 Watch free or paid | **Paid.** `connect:1275` is wrong |
| 1.2 Photos in the trial | **In the trial**, paid after it. Reversed; `photolock` needs rewriting |
| 1.3 Heart rate | **Never requested.** `watch.dc.html:220` is wrong |
| 1.4 Notification rule | **Restated** — one uninvited a day. Diet nudge folds into the cook block's reminder; morning plan cut; trial reminder is a stated exemption |
| 1.5 `--over` | **Rule stands.** One new token `--now`; everything else goes to taupe or `--ink3` |
| 1.6 Five kinds or eight | **Seven.** `summary` and `research` to be archived, not updated |
| 1.7 Meal | **Not a kind.** Cook block is a Routine; food is a log |
| 2.1 Bar maths | **Rescale to planned, tick the limit.** Formula in `DECISIONS.md` |
| 2.2 Weekly hour total | **Deleted.** Hours are a daily budget; there is no weekly hour limit |
| 2.3 Money | **Bills amortise** across the weeks between occurrences |
| 2.4 Sleep persistence | Day only, reverts at midnight; the move is the user's tap, so undo is the ordinary one |
| 2.5 Two trial clocks | **Still two** — activity sync came back out of the park |
| 2.6 What syncs | **Platform-read health data never leaves the device.** Typed data syncs |
| 2.7 Lapse | **Nothing user-created goes read-only.** Caps are creation limits |
| 2.8 Ranges and fair use | **Model identifies, a table counts.** Two caps still to be numbered — the one genuinely open item |

The watch was parked and then split: activity sync moves into phase 4a with three scopes; the wrist apps and Huawei stay parked. Reasoning in `DECISIONS.md`.

---

## 1 — Contradictions

Two authoritative files disagree. Whoever builds it will read one of them.

### 1.1 Is watch sync free or paid?

`design/screen.dc.html:1275`, on the `connect` screen: *"Reading from the phone is free. Huawei's route is a cloud call, so it sits with the paid features."*

`DECISIONS.md` and `design/plans.dc.html` say all watch and activity sync is paid. DECISIONS records the reversal in "Reversed along the way" — watch sync was free, then moved behind the wall. The `connect` screen was never updated to match.

This is the entitlement table, so it decides what Phase 3 and Phase 4b gate. **Settle before Phase 3.**

### 1.2 Are photos in the trial?

`design/plans.dc.html:134` makes **"Photograph a meal" day 3** of the seven-day trial narrative.

`DECISIONS.md` and the entire `photolock` screen say photos are excluded from the trial, with the honest reason on the face: reading a photo costs money every time. Day 3 is load-bearing in the trial story, so this is not a stray line.

### 1.3 Heart rate

`design/watch.dc.html:220`: *"Heart rate and steps come from the watch."*

README, `DECISIONS.md` and the `permissions` screen all say heart rate is not requested, because there is no use for it. On watchOS and Wear OS, showing it means asking for the scope.

### 1.4 The notification rule does not hold

"Four kinds and no others… only the evening close is scheduled" is contradicted by the package's own designs:

| Trigger | Where | Scheduled? |
| --- | --- | --- |
| What is next | `notifications.dc.html` | no |
| Over the limit | `notifications.dc.html` | no |
| Evening close | `notifications.dc.html` | yes — the stated one |
| Slept badly, 07:04 | `notifications.dc.html` | effectively yes |
| Diet nudge, "Dinner is planned" | `notifications.dc.html:201` | yes |
| Bill due in 3 days | `notifications.dc.html` | yes, from a setting |
| Watch closed a Session | `notifications.dc.html:183` | no |
| Trial ends tomorrow, day six | `notifications.dc.html` | yes |
| Huawei opened in your country | `screen.dc.html`, `noregion` | yes |
| Morning plan, 08:00 | `wireframes.dc.html:1046` | yes, from a setting |

Bill alerts, per-record reminders and the morning plan are defensible as "a reminder the user set". Sleep, the diet nudge and the trial reminder are not. Either the rule becomes "one scheduled **by default**, everything else is a setting the user turned on", or three designed notifications have to go.

Separately, and concretely: the autolog notification at `notifications.dc.html:183` — *"Your watch closed 'Walk, brisk'. 47 minutes. The Session is ticked."* — **carries no actions.** That breaks two non-negotiables at once: "if a notification cannot carry its own decision, do not send it", and "nothing is logged silently… shown once, with an undo". The `autolog` screen has Keep / That was not me. The notification needs the same two.

### 1.5 `--over` is used for six things that are not "past the limit"

Non-negotiable 3 says the alert colour is only ever past the limit. README says colours are final and to recreate pixel-accurately. So a faithful build ships every one of these:

| Line | Used for | Verdict |
| --- | --- | --- |
| `screen.dc.html:239` | the week view's **now-line** | now is not over |
| `screen.dc.html:911` | the eating-window **now** marker | now is not over |
| `screen.dc.html:128,130` | **"Overdue"** ring and label | overdue is not over the day's limit |
| `screen.dc.html:542` | *"Adding travel takes 50m off today's 1h 40m free"* | still 50m **under** |
| `screen.dc.html:1767` | photo estimate **"Low" confidence** pill | uncertainty is not over |
| `screen.dc.html:1496` | the subscription-lapse notice on `readonly` | a lapse is not over |
| `screen.dc.html:1709` | sleep bars under about six hours | arguable — needs a ruling |

Legitimate uses, for contrast: the `full` bar and card (163–196), both gates (1626, 983), the month load cells and legend (1675, 282), diet review days over target (1751, 1804–1807).

"Now" and "low confidence" are the clearest misuses. Either add a token for each — an attention colour and a now marker — or rewrite non-negotiable 3 so a code review has a rule it can apply.

### 1.6 Five record kinds or eight?

`design/summary.dc.html:74`: *"Five kinds of thing you can add."* `research.dc.html` builds the argument on four plus appointment.

The `types` screen and README say eight. `design/index.dc.html` sends a builder to `summary.dc.html` **first** — "read this before the screens" — straight at the stale count.

### 1.7 The `meal` screen does two jobs

README lists `meal` among "one form per kind". The actual screen is the **weekly meal plan** — five dinners, a shopping list, "add to the week" — and the type picker describes the Meal kind as "Routine + shopping list".

So there is no form for a single meal record. `logfood` covers food logging, and cooking lands as a routine. The state model's `kcal range (meal)` field has no screen behind it. Decide whether Meal is a record kind at all, or a template that produces routines and an errand.

---

## 2 — Underspecified logic

Asserted, but not defined well enough to write.

### 2.1 The capacity bar's over-limit maths

README's rule is clear: segments flex by raw values, and over the limit "a fourth segment in `--over` is appended for the overflow". The mockups do not follow it. `full` renders 53 / 25 / 22 for a 650-minute day against a 570-minute limit; the `gate` renders 53 / 25 / 15. Both are decorative.

The question the rule does not answer: **does the bar rescale to total planned, or does the overflow segment extend past a fixed-width limit?** At 2× over these look completely different. This is the one component everything else assumes, so it needs stating numerically before anything is built.

### 2.2 The weekly hour total

The `week` view says "21h 40m of 32h". 32h does not derive from 9h 30m a day. Is the week limit separate, work-only, or configurable? Undefined.

### 2.3 Money — a weekly cap against monthly bills

`money` sets £600 a week. The `bill` form at `screen.dc.html:566` says "Week of 1 Sep, after this — £1,240 committed · £360 left", implying a £1,600 week. Rent alone is £980.

Any week containing rent is permanently over a £600 cap, which makes the bar meaningless in exactly the week it matters most. The model needs choosing: amortise bills across weeks, hold them outside the spending cap, or give bills their own budget.

Smaller, same area: `bills` says "£1,240 a month, across five", but four are monthly (£1,205) and Insurance is £35 a **year**.

### 2.4 Sleep-shortened limits

`sleepday` offers 7h in place of 9h 30m. Does accepting persist for that day only? Is it undoable? What happens to the two records it moved to Thursday if the user changes their mind an hour later?

### 2.5 The two trial clocks

Diet starts on first food log, the watch on first successful sync, so they can end four days apart. `handover` and `readonly` are both written as if one week ends. What does day eight look like when diet has lapsed and the watch trial still has three days on it?

### 2.6 What actually syncs

`found` says *"Your sleep is not stored anywhere but this phone."* Cross-device sync is the flagship paid feature. So health-derived data is excluded from sync — a real architectural constraint, stated once, in passing, on one screen. It needs to be a rule, not a line of copy.

### 2.7 Lapse behaviour

README and DECISIONS say diet goes read-only, diet notifications stop, the day limit reverts. `wireframes.dc.html:1260` adds *"Projects above three are read-only"* — a rule that appears nowhere else and changes the entitlement table. Free users are capped at three projects, so this only bites someone who subscribed, made ten, and lapsed. Decide it, then write it down in one place.

### 2.8 Where estimate ranges come from

Ranges are the whole design of the diet product, and open question 3 already asks about AI cost exposure. Neither says how a range is produced or how wide it is allowed to be. A fair-use ceiling is a launch requirement, not a post-launch tuning job.

---

## 3 — Specified but not designed

Each of these is referenced by a shipped screen or required by a non-negotiable, and exists only as a grey box, or not at all.

### In Phase 1 — the phase that is not optional

- **The tray.** Non-negotiable 2 depends on it. Referenced from `full` ("To tray"), settings ("2 waiting"), the evening close, and the detail overflow. Wireframe 40 only.
- **The template shelf.** Eight built-in templates are a free entitlement and "own templates" is a paid one, so it is two rows of the entitlement table. `research.dc.html` argues templates are *the* interface for kinds — "nobody chooses a type from a menu on day one" — and README says `types` is only reached from "make this a…" or a template. **There is no template screen anywhere in the package**, mocked or wireframed. An entry point and two entitlements with no design.
- **Local to account merge.** DECISIONS says it must never be silent. Wireframe 10 only.
- **First run** — onboarding, calendar connect, day length, first-run empty day, sign-in failure. Wireframes 03–11.
- **"Landed"** — the new row highlighted, one undo. This is the stated pattern for *every* add in the product ("undo, not confirm"). No mockup shows it.
- **Move (pick a day)** and **skip or drop**. Wireframes 31–32.
- **The free and paid lists on the sign-up screen.** `summary.dc.html` calls this "the whole fix" for the category's worst complaint. The mocked `signin` has no such list.
- **Notification settings, offline, sync failure.** Wireframes 38, 39, 41.

### Sequencing snag

Phase 1 ships `types`, which shows eight kinds. Two of them — `bill`, `spend` — arrive in Phase 2, and `meal` in Phase 4a. Decide whether Phase 1 ships a five-kind picker or shows the other three locked.

---

## 4 — Stale artifacts

The type stack marks which documents predate the brand. Product files — `screen`, `mockups`, `notifications`, `watch`, `plans`, `storyboard`, `index` — all load Cormorant Garamond and Archivo. `summary`, `research`, `ui-boards` and `logo` load **Libre Caslon Text and Bricolage Grotesque**.

README already marks `ui-boards` superseded. `summary.dc.html` and `research.dc.html` are equally superseded — five kinds, no diet product at all, the watch listed as free at `summary.dc.html:203` and `wireframes.dc.html:1162`, and project sharing described as "the only thing behind the paywall". Both are presented as current, and `index.dc.html` sends the builder to `summary` first.

Either update them or label them Archive, the way `ui-boards` is.

Also: README's screen list omits `shoplist`, so it enumerates 50 of the 51 in `screen.dc.html:1643`.

---

## 5 — Assets and launch blockers

- **The app icons are 335 × 342 and 332 × 343 raster PNGs, and not square.** The App Store needs 1024 × 1024. This blocks submission, not just polish. Vectorising the mark is already open question 5; it is a launch blocker, not a nicety.
- The sign-in video is still a placeholder — a muted twelve-second loop is owed.
- Health handling is well reasoned — six scopes, each with a stated purpose, heart rate excluded — but there is no privacy policy content anywhere, and both HealthKit and Health Connect review require one.
- The **$2 Huawei price** is written into shipped UI copy at `noregion`, not held as a proposal. Open question 2 already flags it; note that it currently reads as a commitment.

---

## 6 — The checklist

Decisions are done. What is left is work.

### Still to decide — one item

- [ ] **The two AI caps**, per-trial and paid-monthly, as numbers, stated on the paywall. Photos moving into the trial made this urgent rather than tidy. — 2.8

### Design — before or during Phase 1

- [ ] **The tray.** A non-negotiable with no screen. Wireframe 40 is the base. — 3
- [ ] **"Landed"** — the new row highlighted, one undo. A state of `day` rather than a new screen, and every add in the product uses it. Cheapest item here. — 3
- [ ] **The template shelf** — a flat list of eight, not a gallery, on the "Make this a…" route and in settings. — 3
- [ ] Move (pick a day), and skip or drop. — 3
- [ ] First run: onboarding, calendar connect, day length, empty day, sign-in failure. Put the free and paid lists in onboarding, not on `signin`, which is deliberately spare. — 3
- [ ] **The merge screen.** Not needed until Phase 3. — 3
- [ ] Notification settings, offline, sync failure. Phase 3. — 3

### Prototype corrections — done 27 August 2026

- [x] **Every capacity bar** rebuilt on raw values, thirteen of them, `full` and both gates against the formula. The overage now reads at its true size: 12 per cent on `full` rather than 22, and 1.6 per cent on `dietgate` rather than 14. — 2.1
- [x] **The seven `--over` misuses** cleared. `--now` added to both themes. Every surviving use of `--over` is genuinely past a limit. — 1.5
- [x] **`types`** — seven kinds, Meal dropped, heading and storyboard updated. — 1.7
- [x] **`photolock`** rewritten as the day-eight upgrade gate. — 1.2
- [x] **`connect`** — the "reading from the phone is free" line replaced with "you do not need a watch". — 1.1
- [x] **`watch.dc.html`** — heart rate line removed. — 1.3
- [x] **The week footer** — `21h 40m · 1 day over`, with a seven-day sparkline in place of the invented denominator. — 2.2
- [x] **The money screens** — every figure re-derived on amortised bills: £279 a week, £169 left, and the `bill` form's £1,600 week gone. — 2.3
- [x] **`noregion`** generalised to "no activity source connected"; the $2 promise removed. — 5
- [x] **`readonly`** — lapse card moved to taupe. — 1.5, 2.7
- [x] **Notifications board** — diet nudge folded into the cook block's reminder, morning plan cut, auto-log and sleep notices given their actions, the rule restated on all three boards. — 1.4
- [x] **`permissions`** — three scopes asked for, three declined, with reasons. — watch split
- [x] `summary.dc.html` and `research.dc.html` labelled Archive; `watch.dc.html` labelled Parked; `index.dc.html` reading order fixed. — 4
- [x] README brought back into line throughout: `--now` in both token tables, the bar formula, seven kinds, three scopes, the notification rule, `meal` and `shoplist` added, entitlements, the reading order. — all
- [x] Wireframes: eight kinds → seven, the 32h denominator, the £1,600 week, the morning-plan toggle. — several

### One prototype item outstanding

- [ ] **Rebuild `standalone/`.** The three bundles are pre-correction and cannot be regenerated from this repo — they were built by the DC bundler, and `support.js` names a `dc-runtime` toolchain that is not here. `index.dc.html` and the README now both say so, and `index` links to the `.dc.html` sources instead. Serve the folder over HTTP until they are rebuilt.

### Before launch

- [ ] **Vectorise the mark now, not later.** Every icon size and favicon derives from it, and the current files are non-square raster at 335 × 342. It is an hour of drawing. — 5
- [ ] Supply the sign-in video. — 5
- [ ] Write the privacy policy, the three health scopes included. — 5
