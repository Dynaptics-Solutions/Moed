# Decisions already settled

Do not relitigate these in code review. Each one has a reason, and the reason is the product.

## Pricing

**$4.99 a month, or $39.99 a year** ($3.33 effective, a third off). Raised from $3/$30 on 27 August 2026.

The original $3 was reasoned, and the reasoning expired. It was set when the free tier was a whole planner and the paid tier carried no unpriced cost. Since then three things moved: **photos went into the trial** (real spend against people who have not paid), **the trial doubled** to fourteen days, and **accounts became mandatory** (every free user now carries server storage). Costs rose on three axes while the price stood still.

The deeper problem was that $3 underprices two products. Moed bundles a planner *and* a diet product. Sunsama is $20 a month; MyFitnessPal Premium is around $20; Todoist and TickTick charge $3–5 for a planner alone. $3 for planner plus diet plus activity sync signals "small utility", not "the app that runs my life".

$4.99 is still unambiguously cheap — a quarter of Sunsama — and it is 66% more revenue for close to no conversion difference, because under $10 the decision is "do I want this", not "is it three or five". Raising a price later is far more painful than launching at the right one: grandfathering, store price-change flows, and resentment.

**Regional pricing is set at launch.** Both stores support it and it is close to free money for a global consumer app.

Net after the 15% store cut (Apple Small Business Program and Google's equivalent, both applicable under $1M a year): **$4.24 a month**, or **$2.83 a month** on the annual plan.

**Fourteen-day trial.** Doubled from seven on 27 August 2026. Seven days was chosen because "the pitch needs a week with a bad night in it" — that pitch was the watch, and the watch's wrist half is parked. The new pitch is diet, and diet's proof is invisible in a week: `deficit` needs a trend, `dietreview` needs more than one week to mean anything, and `recal` is by definition three weeks.

Fourteen and not thirty: two full weekly reviews and a visible trend is enough to make the argument, thirty days is four times the unpaid vision calls per signup, and trials past a fortnight convert worse because the deadline stops feeling real. Recalibration still will not fit, and that is fine — it becomes a reason to stay rather than something the trial must prove.

## Accounts

**An account is required on first use.** Reversed 27 August 2026 from "continue without an account is a first-class exit".

What it fixes: **the local-to-account merge disappears entirely.** There is never an unattached local dataset, `user_id` is never nullable, and one of the hardest pieces of Phase 1 engineering stops existing.

What it costs, and what follows:

- **"Continue without an account" comes off the `signin` screen.**
- **The account gate sits *after* the three onboarding slides, never before.** Asking for an account before anyone has seen the app is the highest-friction moment in the whole first run, and `research.dc.html` gap 06 is about exactly that resentment. Let the first slide do the selling.
- **Apple requires in-app account deletion** — Guideline 5.1.1(v), not a support email and not a web form. Google additionally wants a web deletion-request URL for the Data Safety form. Both are new work created by this decision. Build deletion next to export; they are neighbours.
- **Auth moves from phase 3 into phase 1.** Phase 1 can no longer end "with no account".
- **The app is still offline-first.** Requiring an account does not permit an online-first architecture — the day view, gate, tray and close all work with no signal. See `ARCHITECTURE.md`.

## The free / paid line

**In one sentence, and this is the version that goes on the paywall:**

> **Free is everything text. Paid is anything that costs us per user — images, AI, and the second product.**

That statement replaces the two rules below as the *public* explanation. The rules still govern the edge cases:

1. **If it costs us money every month, it is paid.** Servers, AI calls, map lookups, stored history.
2. **A second product is paid, even when it is cheap to run.** Diet is another app's worth of work.

**Sync is split rather than gated.** Mandatory accounts broke rule 1 for sync — it was paid *because* free users were local-only and cost nothing to serve, and that is no longer true. Charging for sync while storing the data anyway is not defensible. So:

- **Free: backup and restore.** Your data is safe and comes back on a new phone.
- **Paid: live multi-device sync.** Your devices stay in step.

Same storage, same endpoint, different entitlement — and honest, because nobody's data is held hostage.

### Free forever

The whole planner and money. Unlimited tasks, routines, sessions, errands, appointments. The recurrence editor in full. Three projects, five bills, one calendar, eight templates. Thirty days of history and search. Notifications, widgets, offline, export.

### Paid

All food and diet. All activity and health sync. Cross-device sync. Voice, AI estimates, AI plans. Travel times and errand routes. Unlimited projects, calendars and bills. History past thirty days. Own templates. Project sharing.

### Entitlement table

| Capability | Free | Paid |
| --- | --- | --- |
| Records (time kinds) | unlimited | unlimited |
| Projects | 3 | unlimited |
| Bills | 5 | unlimited |
| Calendars | 1 | unlimited |
| History and search | 30 days | all |
| Templates | 8 built-in | own |
| Food and diet | — | all |
| Activity and health | — | all |
| Backup and restore | yes | yes |
| Live multi-device sync | — | yes |
| Voice, AI, routes | — | yes |
| Photo estimates | — | unlimited (see AI limits) |
| Export | always | always |

Renamed 26 August 2026 from "Watch and activity". With the wrist apps parked there is no watch to sell — what is paid is a phone-side read of Health Connect and HealthKit. Say what it is.

**Lapsing is not locking, and the caps are creation limits rather than access limits.** Settled 26 August 2026 against `wireframes.dc.html:1260`, which said projects above three go read-only on lapse. They do not. Someone who subscribed, made ten projects and lapsed keeps all ten — readable, editable, exportable — and cannot make an eleventh. Diet is the single read-only surface, and only because it is a second product they stopped paying for; even there, everything logged stays readable and exportable. This costs some upgrade pressure. It is worth it: "you stopped paying, so you cannot open your own work" is the exact behaviour this product is positioned against.

Diet notifications stop dead on lapse, and the day limit reverts to fixed.

## The capacity bar

Settled 26 August 2026. The mockups render the over-limit state three different ways and none of them is derived, so this is the rule and the screens are wrong where they differ.

**The bar rescales to total planned. When over, committed and fixed compress to fill exactly the limit, and the excess is drawn past them.**

```
planned     = committed + fixed
over        = max(0, planned − limit)
free        = max(0, limit − planned)
denominator = max(limit, planned)
scale       = over > 0 ? limit / planned : 1

segments    = committed × scale · fixed × scale · free · over
```

The segments always sum to the denominator. Under the limit, `scale` is 1, the bar is limit-wide and the tail is free. Over it, committed and fixed keep their ratio to each other but compress into the limit, and the `--over` segment is the true excess as a fraction of what was planned.

The overflow is **not a fourth segment appended to the other three** — that was the earlier wording and it double-counts, because committed and fixed already contain the excess. The over segment re-colours the tail; it does not add to it. No limit tick is needed either: the over segment's left edge *is* the limit.

Why rescale at all: the bar keeps one physical width, so two days can be compared, and the overflow becomes honest. Eighty minutes over a 570-minute day is 12 per cent of the bar. The `full` mockup draws it as 22, which overstates the problem — and a product whose entire claim is that its numbers can be trusted does not get to overstate the one number it exists to report. The same fix shrinks the calorie gate's overage from 14 per cent to the 1.6 per cent it actually is.

- **Minimum segment:** 2px for any non-zero segment, so a five-minute record does not vanish.
- **No cap on the denominator.** At three times over the composition read degrades, and the caption still carries the true number — which is the voice anyway.
- **Empty day:** no fill, `--card`, caption "Nothing planned · 9h 30m free".
- **Caption, always.** Left is composition, right is what remains. Both gates currently omit it.
- Container border turns `--over` when over. Caption right-hand figure is `--acc` under and `--over` over. Estimated segments stay `--taupe` at .75 with the dashed right border.

**Hours are a daily budget. There is no weekly hour limit.** Money is weekly, calories are weekly, hours are not — the "of 32h" on the week footer invents a fourth budget the product does not have, and it derives from nothing. The week footer reads `21h 40m committed · 1 day over`. If a weekly total is wanted it is a derived fact, not a limit, and it is not drawn as a capacity bar with an over state.

## Record kinds

**Seven, not eight.** Settled 26 August 2026. Meal is not a record kind — the product answers this three times in its own copy: "a meal is a routine with a list attached", "no recipe database", "five 40m cook blocks, as routines". So the cook block is a Routine and spends hours; the food is a log and spends calories. Each budget is spent by the thing that actually spends it, which is the rule the type picker already prints at its own foot.

The meal plan moves into the diet product, reached from `diet`, and off the type picker — which also takes a paid row off a free screen.

Kinds: task · routine · session · errand · appointment · bill · spending.

## Money

**Bills amortise across the weeks between occurrences.** Settled 26 August 2026. Rent at £980 a month is £226 a week, and it sits in the taupe segment exactly as fixed time does on a day.

The alternative — charging the full £980 to the week it leaves — makes every rent week 100 per cent red on a £600 limit, which teaches the user to ignore the bar in the one week it should matter most. That is the "turns red forever" failure the research doc names as a category gap, and this product does not get to commit it.

The due date still fires the bill's own alert. The cash-flow event and the budget effect are separate things, which is what the designs already do.

## Colour

**`--over` is only ever past the limit. The rule stands unchanged.** Settled 26 August 2026 against seven places in `screen.dc.html` that break it. No warning colour is added — the palette already has a colour for "notice this, but do not panic", and it is taupe.

- **New token `--now`** — the week's now-line and the eating-window marker, set to `--ink`. "You are here" is an index, not a state.
- **Overdue** is `--ink3`. A record that has slipped is a fact, not an alarm, and turning it red forever is the thing the tray exists to avoid.
- **Advisory copy that is still under the limit** — the travel-time note on `appt` — is an ordinary `--accSoft` card. If travel pushes the day over, the gate fires. That is the gate's job.
- **Low confidence** is `--taupe`. Uncertainty is already drawn in taupe; reuse it rather than inventing.
- **The lapse notice** on `readonly` is `--taupeSoft`. Taupe is the paid colour throughout, so a subscription notice in taupe reads as what it is.

## Calorie decisions

- **Ranges, not numbers.** "520–680", tightening to "610–650" when the portion is given. A range you trust beats a number you do not.
- **Weekly limit with daily guidance.** Diets fail on daily rigidity, and money already works weekly. A big dinner becomes a trade, not a failure.
- **The target is computed** from height, weight, age and activity — and is overridable. Always carries "guidance, not medical advice."
- **Pace stops at 0.75 kg a week.** Faster is willpower, and willpower is not a plan.
- **Burn is never added back to the allowance.** Per-workout estimates are the least reliable number in the system. Activity moves the allowance only through the three-week recalibration, measured from logged intake against actual weight change.
- **Photos are in the trial, and paid after it.** Reversed 26 August 2026. The trial is the fortnight in which someone decides, so the feature that sells the diet product has to be inside it. On day eight photo estimating asks for an upgrade; text estimation is unaffected. This puts unpriced vision calls inside the trial, so it depends on a stated per-trial call cap — see "Still open" 3.
- **A workout is a Session.** It spends hours like anything else, so the workout plan schedules Sessions rather than inventing a new record kind.
- **The model identifies; a table counts.** Settled 26 August 2026. The model's job is to read "chicken salad, big bowl" into ingredients and a portion class. The numbers, and the width of the range, come from a food table keyed on that class. This is what makes a range repeatable rather than invented, and it is what lets "confirm it once and this becomes one of your saved foods, free from then on" actually be free — a saved food never calls the model again. That is the cost control that works.

## AI limits

Settled 27 August 2026, closing the last open question. Full cost model in `ARCHITECTURE.md` §6.

| Tier | Photos | Text | Voice |
| --- | --- | --- | --- |
| **Trial** | **3 a day** (~42 over fourteen days) | uncapped | uncapped |
| **Paid** | **Unlimited**, with an undocumented **500 a month** abuse ceiling | uncapped | uncapped |

**Capped trial, unlimited paid.** An unusual shape, and deliberate: it puts the limit exactly where the exposure is. The trial has no card behind it and is the farmable path; device binding stops repeat trials and the daily cap bounds any single one.

**Why premium is unlimited, and not metered:**

- **The maths permits it.** A user photographing ten meals a day, every day, costs about $2.16 a month against $4.24 of revenue. Even deliberate abuse leaves 29%.
- **Cost decays with tenure.** A confirmed food never calls the model again, and people eat 30–50 distinct foods on rotation. By month two or three most logs are library hits. The heavy user gets *cheaper* — unusual, and a genuine property of the design.
- **A quota would contradict the product's voice.** Moed is built on one honest limit: your day. Bolting a vendor quota on top introduces a second, artificial kind of limit and muddies the single idea the whole app rests on. It would also want an alert colour, and `--over` is spoken for.
- **The heaviest users are the advocates.** Someone photographing every meal is the ideal customer. Throttling them punishes exactly the engagement worth having.
- **Meters cost support.** UI, reset dates, edge cases, and "why did my photo not work" email — at $4.24 a month you can afford very few of those.

**The 500-a-month ceiling is never shown, never metered, never mentioned.** It exists to stop scripted abuse, not to shape behaviour. Anyone reaching it is not a person logging meals. Do not hard-block — say what happened, in voice, and open a conversation: *"You have logged 500 photos this month. That is more than anyone eats — if that is wrong, get in touch."*

**Voice and text are never capped**, at any tier. At roughly $0.002 a call there is nothing to protect.

**Log per-user AI spend from day one**, and alert above $1.50 a month — to look, not to block.

## Auth

**Apple and Google only.** No email, no password, nothing to reset. An account is only needed for sync, so "continue without an account" is a first-class exit — and that forces the local-to-account merge screen, which must never be silent.

## Notifications

Restated 26 August 2026. "Four kinds and no others" was written before the diet product existed, and the package's own designs already broke it in eight places. The replacement protects the same thing and survives contact with the screens:

> **One uninvited notification a day — the evening close.** Everything else is either a consequence of something that just happened, or a reminder the user set. Every notification carries its decision on its face. If it cannot, it is not sent.

What that settles:

- **The diet nudge** — "Dinner is planned: sheet-pan chicken" — is not a diet notification. The meal plan already puts a 40-minute cook routine on the day, and that routine carries a reminder like any other record. Fold it in and it becomes user-set by construction, actions and all. No new kind.
- **The morning plan at 08:00 is cut.** The evening close already shows tomorrow. A morning nudge duplicates it, breaks the one-a-day claim, and is re-engagement, which this product refuses by name.
- **The trial day-six reminder stays, as a stated exemption.** It is transactional — about the money relationship, not the plan — and fires once per trial. Write the exemption down rather than pretending it fits the rule.
- **Bill alerts and per-record reminders** are already fields on their forms. User-set. No change.
- **Anything that changed state must carry the undo.** The auto-log notice does not, which is what made it a violation rather than a rough edge. It parks with the watch; the rule outlives it.

## Activity, health and the watch

Settled 26 August 2026, and the first move is to stop treating these as one thing.

**Activity sync is a phone-side read** of Health Connect and HealthKit. No watch build, no second toolchain, no extra store listing. It delivers sleep-shortens-your-day, auto-closed Sessions, weight without typing, and the `found` backfill.

**The watch apps are a Wear OS build and a watchOS build.** They deliver the arc, the next thing, the timer and the evening close on a wrist — every one of which already exists on the phone.

The feature the trial was built on — a bad night shortens tomorrow — lives entirely in the first. It needs no watch app, and it does not need an Apple Watch or a Wear OS watch: Health Connect aggregates sleep from Samsung Health, Fitbit, a cheap band or a sleep-tracking app, and HealthKit takes it from anything that writes there. An iPhone alone yields scheduled rather than measured sleep, which is weaker but not nothing. **A wearable is not a watch app.** The package bundled them and charged for the pair.

So the park splits.

### Built — activity sync, in phase 4a alongside diet

Not after it. `BUILD-PLAN.md` already argues this ("the watch is what makes diet effortless") and then sequences against itself, and `found` has to exist on day one of the trial, which means backfill ships with the trial rather than a phase later.

Screens: `connect` `permissions` `sleepday` `autolog` `found`.

**Three scopes, not six.** Sleep, because it is the entire point. Workouts, to close the planned Session with its real duration. Weight, because it is cheap and stops the typing. Steps and active energy are deferred — they only feed recalibration. Heart rate is never requested.

A three-scope ask converts better than a six-scope one, and both Apple and Health Connect review each scope's justification, so fewer scopes is a shorter review. The `permissions` screen already promises that any of them can be turned off and the app degrades rather than breaks, which makes adding the other two later a non-event.

**`noregion` generalises into "no activity source connected".** Its copy is already the right answer for anyone unsupported — tick the Session yourself, type your weight, you lose the automatic part and not the feature. Made universal, it stops being a Huawei screen, and the $2 promise goes with it.

- Sleep is used for exactly one thing: shortening the day's hour limit. No sleep score, no bedtime advice.
- Nothing is logged silently. Every automatic entry is shown once, with its undo.
- Health data read from the platform stays on the device and is never synced. Anything the user typed syncs.

### Parked — the wrist apps and Huawei

Not cancelled. Deferred, with the decisions kept so it can be picked up without re-deciding anything: `watch.dc.html` entire, the wrist screens, the watch notifications, and `recal` and `workout` until diet is real.

When it is built:

- **The complication and the Tile come first.** Two numbers, no interaction, permanently visible, and it is the logo's own dial. Highest value per hour on the whole watch list.
- **watchOS before Wear OS.** The running timer is already a Live Activity on iOS, so the watch largely inherits it, and the attach rate is higher among people who will pay $3 a month for a planner.
- **Then timer, next thing, evening close.** Not the diet glance and not the wrist gate — a 216px face is a great deal of surface for a decision with two good options on the phone.
- **Huawei: no.** A third codebase, DevEco Studio, AppGallery and a region-restricted cloud, for one hardware brand — and it dragged in a whole screen and a pricing commitment covering the case where the feature cannot be delivered. Revisit only if the users turn out to be there.
- Wear OS and watchOS remain one build each, sharing phone logic.
- The watch cannot create records with a length, edit anything, or plan a week. Capture is dictation into the tray.
- Heart rate is not requested. `watch.dc.html:220` says otherwise and is wrong.

### What the split changes elsewhere

- **The trial keeps its pitch.** Day five survives, because it never needed a watch. This is the whole reason for splitting rather than parking wholesale.
- **Two trial clocks stay two.** Diet on first food log, activity on first successful sync.
- **The paid line gets weaker here, deliberately.** An on-device health read costs nothing per user per month, so it fails rule 1. It qualified under rule 2 — a second product is paid — and with the wrist apps parked it is no longer a second product, it is one integration. Keep it paid at launch, because it is used almost entirely inside diet and bundles cleanly there. But note what has happened: "Reversed along the way" already names sleep-shortens-your-day as the first thing to move to free if conversion holds and growth does not, and that is now a one-line entitlement change rather than giving away a build.
- **Recalibration survives without steps.** It is measured from logged intake against actual weight change, so weigh-ins and food logs are enough; steps and active energy only sharpened it.
- **Workouts survive.** A workout is a Session either way; without a connected source the user ticks it themselves.

## Still open

1. **Whether a one-time purchase exists at all.**
2. ~~**The `noregion` $2 promise.**~~ Retired. `noregion` generalises into "no activity source connected", and Huawei is parked, so there is no group to promise it to.
3. ~~**AI cost exposure.**~~ Settled — see "AI limits" above. Three photos a day in the trial, unlimited paid behind an undocumented ceiling.
4. **Positioning.** Calories are currently a third unit living under Me. If they become first-class, the product's "hours or money" line changes and Food gets its own tab.
5. **Logo assets are raster.** Fine on screen; not fine for the 1024px App Store icon, print or favicons. Vectorise the mark before launch — the geometry is a circle with breaks where the pin and the M's stems cross it.
6. **The sign-in video is a placeholder.** Supply a muted twelve-second loop.

The technical counterpart to this file — stack, Azure resources, sync design, the AI model and cost table, and the full service inventory — is in `ARCHITECTURE.md`.

A review of the whole package against these decisions — every contradiction, gap and undefined rule, with a checklist in decision order — is in `REQUIREMENTS-REVIEW.md`.

## Reversed along the way

Kept here so the reasoning is not lost.

- **Meal planning was paid, then free, then paid again.** Free because planning meals is just a list; paid in the end because it belongs to the diet product, not because it costs anything to run.
- **Watch sync and sleep-shortens-your-day were free, then moved to paid.** The argument for free was that they cost nothing and are the best reason to choose Moed. That is still true, and it is the thing to test first if conversion is fine but growth is slow. Splitting the wrist apps from activity sync on 26 August 2026 made that test cheap to run.
- **No photos in the trial, then photos in the trial.** The original reason was honest and still true: vision calls cost money against people who have not paid. What changed is that parking the wrist apps took day five out of the trial narrative, and a trial has to demonstrate something. Photos are what is left. The cost is now controlled by a stated cap rather than by exclusion.
- **The whole watch half was parked, then half of it came straight back.** The park was right about the wrist apps and wrong about activity sync, because it treated one word as one product. Kept here because it is the mistake most likely to be repeated: the expensive half and the load-bearing half were never the same half.
- **"Continue without an account" was a first-class exit, then accounts became mandatory.** The exit was a good idea that carried a hard merge problem. Requiring accounts deleted the merge, and cost a first-run step plus an account-deletion requirement. Net positive, but it broke the sync entitlement, which had to be re-decided rather than assumed.
- **$3 was deliberately low, then $4.99.** The low price was correct for the product as it stood. Photos in the trial, fourteen days instead of seven, and server storage for every free user changed the cost base under it. The lesson worth keeping: a price is downstream of a cost model, and when the cost model moves the price is not settled any more.
- **All-paid was considered and rejected.** Tempting for simplicity — one product, one price, no entitlement table. Rejected because it is incompatible with a low price: all-paid would need $6–8, and it would make Moed the thing `research.dc.html` gap 06 was written against, while removing the free tier that does the marketing.
