# Build plan

Phases. Each one ends with something a person could use, and nothing in a later phase is required to make an earlier one work.

Doing all of it at once is how a simple app becomes a complicated one before anyone has used it.

Revised 27 August 2026: a small **phase 0** was added because accounts became mandatory, activity sync moved out of 4b into **4a**, and the wrist apps parked. What runs it is in `ARCHITECTURE.md`; why, in `DECISIONS.md`.

---

## Phase 0 — Foundations

Small, and it exists because accounts became mandatory on 27 August 2026. Full detail in `ARCHITECTURE.md`.

Expo project, SQLite schema with the sync columns from day one, Azure resource group, Apple and Google developer accounts, and the token-verification Function. Bundle the two fonts locally — offline is a non-negotiable and Google Fonts over the network is not.

**Done when:** a person can sign in with Apple or Google on both platforms, and a row written offline turns up on a second device.

---

## Phase 1 — Hours

**The whole free product, and the only phase that is not optional.**

The day limit, and everything that follows from it: capture, the seven record kinds, the capacity bar, the over-limit gate, the tray, the evening close, day/week/month, drag to reschedule, one calendar in and out.

Screens: `splash` `signin` `day` `full` `week` `month` `capture` `types` `task` `routine` `session` `errand` `appt` `repeat` `gate` `detail` `timer` `close` `shut` `projects` `project` `search` `settings`

Build in this order, because each earns the next:

1. **The capacity bar.** One component, parameterised by unit. Everything else assumes it exists — and it now has a numeric spec in `DECISIONS.md`, so build against the formula rather than the mockups, which predate it.
2. **Day view** with static data. Get the type, spacing and the grouping right here; the rest of the app copies it.
3. **Capture → task form → gate → back to day.** The core loop. When this feels good, the product works. Capture parsing is `chrono-node`, not an AI call — local is cheaper *and* it works with no signal.
4. Week and month, reading the same records.
5. The remaining record kinds, then the recurrence editor.
6. Evening close and the tray.
7. Projects, search, settings.

Auth moved here from phase 3, so this phase no longer ends "with no account". It costs about a week and it avoids writing a local-only path and then rewriting it.

Also owed here, and not yet designed: **the tray**, **the template shelf**, **"landed"** (the new row highlighted with one undo), **move / skip-or-drop**, and the first-run set. None of them block steps 1–4.

**Done when:** someone can plan a real week, be told when it is too full, and shut a day in under two minutes.

---

## Phase 2 — Money

Same mechanics, different unit. Small phase; mostly reuse.

Screens: `money` `bills` `bill` `spend`

The weekly limit, five bills with alerts, a spending log. No bank sync and no receipt scanning — that is a finance app, not this.

**Done when:** a bill lowers the week's remaining money the moment it is added, using the same bar as the day.

---

## Phase 3 — Subscription and sync

The first paid thing, and the least interesting to build. Do it before the diet plan, because the diet plan is worth much less without it — food logged on a phone that never syncs is a diary you will lose.

Sign-in already exists from phase 0, and the merge screen is gone with it — mandatory accounts mean there is never an unattached local dataset. What is left is live multi-device sync, the subscription, and the trial machinery.

Screens: `paywall` `trial` `handover` `readonly` — plus the still-undesigned account deletion, notification settings, offline and sync-failure states.

Trial mechanics, which are fiddly and worth getting right first time:

- **Fourteen days**, not seven. Diet's proof is invisible in a week.
- **Two independent clocks**, each started by first use — diet on first food log, activity on first successful sync. Never on sign-up: connecting a source can take days and must not burn trial days.
- **One reminder, on day thirteen.** No others. It is a stated exemption to the notification rule: transactional, about the money, fires once.
- **Bind to device** (StoreKit / Play Billing) as well as account, and take the stricter. Apple and Google sign-in give one person two identities.
- **No card up front.** Take it on day fourteen from someone who has decided.
- **Day fifteen goes quiet, not locked.** Read-only, everything exportable, and say out loud that the day limit reverts.
- **Free gets backup and restore; paid gets live multi-device sync.** Same storage, different entitlement.
- **Account deletion is in-app** — Apple Guideline 5.1.1(v) — plus a web deletion-request URL for Google's Data Safety form. Build it next to export.

**Done when:** a trial can start, run, end and lapse without anyone being surprised by what happened.

---

## Phase 4 — The body

The second product. Diet first, then the watch, because the watch is what makes diet effortless rather than the other way round.

### 4a · Diet, and activity sync together

Revised 26 August 2026. These were two sub-phases; they are one, because the sync is what makes the diet product feel effortless and because `found` has to exist on day one of the trial. Backfill ships with the trial, not a phase later.

Screens: `dietsetup` `dietgoal` `dietplan` `diet` `logfood` `photolog` `photolock` `dietgate` `dietreview` `deficit` `shoplist` `connect` `permissions` `sleepday` `autolog` `found`

Ranges are the whole design. Text estimation first, photo second — and photos are **in** the trial now, paid after it, so the fair-use caps have to exist before it ships. The model identifies; a food table counts. Confirming an estimate saves it to the user's own library, free from then on, and a saved food never calls the model again.

Activity sync is a **phone-side read**, not a watch build:

- **Android:** Health Connect — one integration covers Samsung, Pixel, Fitbit, Garmin and anything else that writes there.
- **iOS:** HealthKit.
- **Three scopes only:** sleep, workouts, weight. Steps and active energy are deferred; heart rate is never requested.
- No source connected is a normal state, not a failure — the generalised `noregion` copy covers it.

Build **backfill first.** Health Connect and HealthKit hand back weeks of history on first read, which is what makes `found` possible on day one — the difference between the trial proving its best feature and hoping it fires.

**Done when:** a bad night shortens tomorrow, and a walk closes the Session that was planned for it.

### 4b · The wrist — parked

Not cancelled; deferred, with its decisions kept in `DECISIONS.md`. Screens `recal` and `workout` wait for diet to be real.

When it happens: the complication and Tile first, watchOS before Wear OS, then timer, next thing and evening close. Huawei is a third codebase for one hardware brand — revisit only if the users turn out to be there.

---

## Deliberately not in the plan

Bank sync · receipt scanning · a recipe database · exercise-burn added to the allowance · guest lists and RSVPs · a chat panel · streaks, scores or badges · social anything.

Each of these is a different product. Event planning is already covered: an event is a project with a date and a budget.

## Sequencing risk

The one thing that will tempt you out of order is the diet plan, because it is the most fun to build and the thing people ask about. Building it before Phase 3 means shipping a food diary that cannot survive a new phone.
