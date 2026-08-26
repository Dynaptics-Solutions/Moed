# Architecture

Settled 27 August 2026, before any code exists. This is the technical counterpart to `DECISIONS.md` — that file settles what the product does, this one settles what it runs on.

Every choice here is traceable to a product decision. Where a decision changes, the architecture item that depends on it is named so it can be revisited rather than rediscovered.

---

## 1 — The three principles everything follows from

**1. The phone is the working copy. The server is the durable copy.**

Offline is a non-negotiable. The day view, the capacity bar, the gate, the tray and the evening close all work with no signal. So SQLite on the device is not a cache — it is where the app reads and writes, always, and the network reconciles afterwards. If the server were authoritative, every write would need a round trip or a replay queue against a moving target, and an offline week would be a mess.

**2. Accounts exist from first launch, so every record has an owner from the moment it is created.**

Settled 27 August. This deletes the local-to-account merge problem entirely, and it means `user_id` is never nullable.

**3. Health data never leaves the device.**

A per-table exclusion in the sync layer, designed in from the schema rather than retrofitted.

---

## 2 — Client

| Choice | Decision |
| --- | --- |
| Framework | **React Native + Expo** |
| Language | TypeScript throughout |
| Local database | **SQLite** — `expo-sqlite` with **Drizzle ORM** |
| Navigation | Expo Router |
| State | Local-first; the database is the state |

**Why React Native and not Flutter or native:** the hard parts of this product are the platform integrations — Health Connect / HealthKit, notification actions on the notification face, Live Activities, StoreKit and Play Billing — not the pixels. Expo's config-plugin and dev-client story is the least painful route through those. TypeScript also means the capacity-bar maths, the entitlement table and the sync rules are written once and can run server-side unchanged.

Flutter is a legitimate second choice and is better on pure typographic fidelity, since it renders everything itself. Take it if the team already knows Dart. Native Swift + Kotlin is rejected: 51 screens written twice is the thing `BUILD-PLAN.md` exists to prevent.

### The Windows constraint

Development happens on Windows. **iOS builds require macOS** — there is no way around this.

- Windows is fine for development, Metro, and the Android emulator
- **The iOS Simulator cannot run on Windows.** iOS testing needs a physical iPhone with a dev client
- **IPAs cannot be built locally.** Use **EAS Build** (cloud macOS builders), or buy a Mac mini if the build cadence makes it cheaper

### What stays native regardless of framework

No cross-platform framework covers these. They are written twice, in Swift and Kotlin, and that is expected:

- **Home screen widgets** — WidgetKit (SwiftUI) and Glance (Kotlin/Compose)
- **Live Activity** (iOS) and the ongoing notification (Android) for the running timer
- Later, if unparked: the Wear OS and watchOS apps

---

## 3 — Data

### On the device

SQLite is the system of record for the running app. Every table carries:

```
id           TEXT     client-generated UUID — offline creates never collide
user_id      TEXT     present from record zero
created_at   INTEGER  epoch ms
updated_at   INTEGER  epoch ms, server-comparable
deleted_at   INTEGER  soft delete — nothing is ever hard-deleted
_dirty       INTEGER  local-only, never synced
_synced_at   INTEGER  local-only
```

**Soft deletes are mandatory, for two independent reasons:** hard deletes break sync (a missing row is indistinguishable from a row you have not seen yet), and "nothing disappears" is a product non-negotiable.

Core tables: `records` · `recurrences` · `projects` · `bills` · `spending` · `food_logs` · `saved_foods` · `weigh_ins` · `day_limits` · `settings` · `entitlements`

**Local-only, never synced:** `health_sleep` · `health_workouts` · `health_weight` · `health_sync_state`

### On the server

**Azure Database for PostgreSQL — Flexible Server.** The same schema, plus:

- **Row Level Security** on every user-owned table, keyed on a session variable set by the API layer. RLS is a Postgres feature, not a vendor feature — it works here exactly as it would anywhere. It makes cross-user leakage structurally hard rather than something you remember to check
- A `sync_cursor` per device
- No health tables. They do not exist server-side, so they cannot leak

### Sync

**Local write first, reconcile after. The UI never waits on the network.**

```
push:  send rows where _dirty = 1
pull:  send cursor, receive everything with updated_at > cursor
merge: last-write-wins per field, comparing updated_at
```

**Last-write-wins per field is sufficient**, because this is single-user data. Project sharing is one project with one person and belongs to a later phase. **Do not build CRDTs.** If sharing ever becomes multi-writer, revisit then and not before.

**Evaluate PowerSync before hand-rolling the loop** — Postgres server, SQLite client, sync handled. If it fits, it removes the highest-risk piece of engineering in the project.

Sync is a **paid** feature in its live multi-device form. Free accounts get **backup and restore** — the same storage, the same endpoint, a different entitlement. See `DECISIONS.md`.

---

## 4 — Azure resources

One resource group. **Pick the region by where the users are, not where the developer is.**

| # | Resource | SKU / tier | Purpose | ~$/mo |
| --- | --- | --- | --- | --- |
| 1 | **Azure Database for PostgreSQL — Flexible Server** | Burstable **B1ms**, 32 GB | The durable copy | 15–20 |
| 2 | **Azure Functions** | Consumption, Node 20 / TypeScript | The entire API | ~0 |
| 3 | **Storage Account** | Standard LRS | Required by the Functions runtime — **not** user data | ~1 |
| 4 | **Key Vault** | Standard | AI keys, JWT signing key, store credentials | ~0 |
| 5 | **Application Insights** | Pay-per-GB | Logs, traces, failures, per-user AI spend | 0–5 |

**Total: roughly $20–30/month**, almost entirely the database.

**Check the 12-month free PostgreSQL Flexible Server offer before provisioning.** New subscriptions get B1ms + 32 GB free for a year, which would take Azure to near zero for the first year.

### Deliberately not provisioned

- **Azure SQL** — costs more than Postgres with no advantage here
- **Cosmos DB** — wrong data model, and the pricing shape is hostile to sync workloads
- **App Service** — Functions is enough for four endpoints
- **API Management** — overkill by an order of magnitude
- **Blob Storage for user data** — food photos are processed and discarded, so there is nothing to store
- **Notification Hubs, FCM/APNs server plumbing** — see §7
- **Front Door, Application Gateway, AKS** — no

---

## 5 — The API

Four jobs. No framework, no microservices.

| Endpoint | Job |
| --- | --- |
| `POST /auth/session` | Verify an Apple or Google ID token, issue a session JWT |
| `POST /sync` | Push dirty rows, pull since cursor |
| `POST /ai/*` | Proxy to the model providers, enforce caps, log spend |
| `POST /billing/webhook` | StoreKit and Play Billing server notifications |

### Auth — no vendor

**Verify the provider tokens directly.** Microsoft Entra External ID is heavier than this product needs, and its React Native story is awkward.

```
device:  expo-apple-authentication / @react-native-google-signin
         → provider ID token
server:  verify against Apple's / Google's JWKS
         → issue session JWT + refresh token, stored in `users`
```

This is a few hundred lines and it is *verification*, not authentication — the hard parts of auth (passwords, resets, MFA) do not exist in this product by design. **Apple and Google only** is a settled decision, and it is what makes this tractable.

**Fallback if this is not wanted:** Firebase Auth as a thin identity layer, verified in the Functions. A second vendor, but a free and trivial one.

**Apple requires in-app account deletion** — Guideline 5.1.1(v). Not a support email, not a web form. Google additionally wants a web-based deletion request URL for the Data Safety form. Both are required, and both are new work created by the mandatory-accounts decision.

---

## 6 — AI

### The first rule: do not call a model

Three features in the original design should never be model calls. This is a larger cost saving than any provider or tier choice.

| Feature | Instead of AI | Why |
| --- | --- | --- |
| **Typed capture parsing** — "dentist thu 2pm, 25 min drive" | **`chrono-node`**, a local date parser | The highest-frequency action in the app. Local is cheaper *and better* — it works with no signal, which a planner needs. Fall back to a model only when the parser fails |
| **Voice transcription** | **On-device STT** — see §6.4 | Free on both platforms |
| **"How long this usually takes you"** | **SQL** | It is an average over the user's own history, not a judgement |

What genuinely needs a model: **photo estimation, text food identification, voice parsing, break-it-down, explain-the-slippage, and plan generation.** That is the entire list.

### 6.1 Models

| Provider | Model | Input $/1M | Output $/1M |
| --- | --- | --- | --- |
| Anthropic | **`claude-haiku-4-5`** | $1.00 | $5.00 |
| Anthropic | `claude-sonnet-5` | $3.00 | $15.00 |
| Anthropic | `claude-opus-5` | $5.00 | $25.00 |
| OpenAI | **`gpt-4o-mini`** | $0.15 | $0.60 |
| OpenAI | `gpt-5.4-mini` (vision) | $0.75 | $4.50 |
| OpenAI | `gpt-5-nano` | $0.05 | $0.40 |
| OpenAI | `gpt-4o-mini-transcribe` | $0.003 / minute | — |

**Starting choice: `claude-haiku-4-5` for everything except transcription.** Anthropic's own guidance defaults to Opus 5; Haiku is a deliberate cost decision made with the tradeoff understood. Food identification is structured extraction against a known schema, which is what small models are good at.

**This is provisional, and there is a specific test that settles it.**

### 6.2 The bake-off — run before launch

Score **`claude-haiku-4-5`**, **`gpt-5.4-mini`** and **`gpt-4o-mini`** on **50 real food photos**, judged on range accuracy — not on how the output reads.

- At the tier you would actually ship, **Haiku 4.5 and GPT-5.4 mini are within 20% of each other** — a $0.07/user/month difference, which is noise
- **`gpt-4o-mini` is roughly 7× cheaper.** If it holds up on range accuracy, take it
- **The nano tiers are almost certainly not good enough.** A cheap model producing confidently wrong ranges does not save money, it destroys the feature — and the product's entire claim is that its numbers can be trusted

One day of work, worth more than any amount of speculation.

**Build the proxy provider-agnostic** — one internal interface, one place to swap. That is the real hedge and it costs nothing now.

### 6.3 Per-call costs

Assuming a food image at ~1,500 tokens and a system prompt padded to ~1,100 so it is cacheable.

| Feature | Tokens in / out | Haiku 4.5 | gpt-4o-mini |
| --- | --- | --- | --- |
| Photo estimate | 2,600 / 300 | **$0.0040** | $0.0006 |
| Text estimate | 1,130 / 200 | **$0.0021** | $0.0003 |
| Voice parse | 1,055 / 200 | **$0.0021** | $0.0003 |
| Voice parse, cached prompt | — | **$0.0012** | — |
| Break it down | 440 / 200 | **$0.0014** | $0.0002 |
| Explain slippage — batched, −50% | 2,000 / 200 | **$0.0015** | $0.0002 |
| Plan generation | 3,500 / 1,200 | **$0.0100** | $0.0012 |

### 6.4 Voice — a two-stage pipeline

**Claude does not accept audio.** It is text and vision only, so transcription comes from elsewhere regardless of which model does the reasoning. That is a fact, not a preference.

**Stage 2 genuinely needs a model**, unlike typed capture — spoken input is messy and multi-item ("call the framer, grab groceries, and I've got the dentist Thursday at two" is three records), and a date parser cannot segment that.

**The split is by accuracy stakes, not cost:**

| Use | Stage 1 — speech to text | Why |
| --- | --- | --- |
| **Planner capture** | **On-device** — `SFSpeechRecognizer` / `SpeechRecognizer` | Free, offline, short common vocabulary, and a mis-hear is one tap to fix on the confirmation chips |
| **Food voice logging** | **`gpt-4o-mini-transcribe`**, $0.003/min | Food names, brands and dishes are where on-device models fail, accents matter, and **a mis-transcribed food becomes a wrong calorie number** — which attacks the one thing the product promises |

Cost of the cloud half: roughly 20 food voice logs a month at ten seconds each — **about one cent per user per month.**

**A bonus the design did not anticipate:** the wireframes say "Voice capture — unavailable offline." With on-device STT that is no longer true. Update the settings screen:

- **Online:** on-device transcript → model parse → several records extracted
- **Offline:** on-device transcript → local date parser → one record, into the tray

### 6.5 Cost control

In descending order of effect:

1. **Saved foods never call the model again.** People eat 30–50 distinct foods on rotation, so by month two or three most logs are library hits. **Per-user AI cost decays with tenure** — the heavy user gets cheaper, which is unusual and is a genuine property of the design
2. **Prompt caching** on the food and capture system prompts — identical across every user and call. **The minimum cacheable prefix is ~1,024 tokens, so an 800-token prompt caches nothing.** Pad it with the food-class reference table to push it over the line. Verify with `usage.cache_read_input_tokens`; if that is zero across repeated calls, something is silently invalidating the prefix
3. **The model identifies, a table counts.** Settled in `DECISIONS.md`. It also keeps *output* short, and output costs 5× input
4. **Batch API, −50%,** for anything non-interactive: **explain-the-slippage** (compute overnight, ready when the weekly review opens) and the **three-week recalibration**. Food logging cannot batch — it is interactive

### 6.6 Cost scenarios

On Haiku 4.5 — the expensive case. Net revenue after the 15% store cut: **$4.24/month** monthly plan, **$2.83/month** annual.

| Scenario | Photos | Text | Voice | Other | **Total** | % of $4.99 net |
| --- | --- | --- | --- | --- | --- | --- |
| **A · Light** | 15 | 45 | 10 | 7 | **$0.20** | 4.7% |
| **B · Typical** — 1.5 photos/day | 45 | 60 | 30 | 10 | **$0.39** | 9.2% |
| **C · Heavy** — every meal | 90 | 60 | 60 | 21 | **$0.66** | 15.6% |
| **D · Stress** — 10 photos/day | 300 | 200 | 200 | 58 | **$2.16** | 51.0% |

**Even a deliberate abuser does not lose money.** Worst case on the worst-margin plan, 29% is kept — and on `gpt-4o-mini` divide all of it by roughly seven.

**Trial cost, capped at 3 photos/day over 14 days: about $0.28 per trial that never converts.**

| Conversion | Trial spend per subscriber | Payback |
| --- | --- | --- |
| 10% | $2.80 | under 1 month |
| 5% | $5.60 | ~1.3 months |
| 3% | $9.30 | ~2.2 months |

### 6.7 Caps

| Tier | Photos | Text | Voice |
| --- | --- | --- | --- |
| **Trial** | **3/day** (~42 over 14 days) | uncapped | uncapped |
| **Paid** | **Unlimited**, with an undocumented **500/month** abuse ceiling | uncapped | uncapped |

**Capped trial, unlimited paid** is an unusual shape and it is deliberate — it puts the limit exactly where the exposure is. The trial has no card behind it and is the farmable path; device binding stops repeat trials and the daily cap bounds any single one.

The 500/month ceiling is **never shown, never metered, and never mentioned in the UI**. It exists to stop scripted abuse, not to shape behaviour. When someone reaches it, say what happened in the product's voice — *"You have logged 500 photos this month. That is more than anyone eats — if that is wrong, get in touch"* — and open a conversation rather than a wall.

Reasoning in full is in `DECISIONS.md`.

### 6.8 Observability — build from day one

- **Log every call:** user, feature, provider, model, tokens in/out, cost, latency, timestamp
- **Alert on any user past $1.50/month** — not to block, to look
- Month one of real data will tell you more than every estimate in this document

---

## 7 — Notifications: no push server

**All four notification kinds are local.** Check this before provisioning anything:

| Notification | Trigger |
| --- | --- |
| Evening close | Scheduled on-device — the one uninvited notification a day |
| Over the limit | Local event, the moment it happens |
| What is next · bill alerts · cook block | Per-record reminders the user set, scheduled locally |
| Trial day thirteen | Scheduled locally when the trial starts |

The only genuine push candidates are cross-device sync invalidation (poll instead) and "an activity source appeared". **Skip push entirely.** That removes Notification Hubs, APNs and FCM server setup, and an entire class of delivery debugging.

The running timer is a **Live Activity** on iOS and an **ongoing notification** on Android — not notifications proper.

---

## 8 — Health and activity

Phase 4a, alongside diet. **A phone-side read. No watch build.**

| Platform | Route |
| --- | --- |
| Android | **Health Connect** — covers Samsung, Pixel, Fitbit, Garmin, and any band or sleep app that writes there |
| iOS | **HealthKit** |
| Huawei | Parked — its data stays in Huawei's cloud and needs a separate integration |

**Three scopes requested, and no more:** `sleep` · `workouts` · `weight`. Steps and active energy are deferred; they would only sharpen the three-week recalibration. **Heart rate is never requested.**

A three-scope ask converts better than a six-scope one, and both Apple and Health Connect justify each scope separately at review.

**Nothing read here is ever synced.** Absence of any source is a normal state, not a failure.

---

## 9 — Billing

- **StoreKit 2** (iOS) and **Play Billing** (Android)
- **$4.99/month · $39.99/year**, with **regional pricing** set at launch — both stores support it and it is close to free money for a global consumer app
- **Enrol in Apple's Small Business Program and Google's equivalent** — 15% instead of 30% under $1M/year
- **Trial binds to the device**, not the account. Apple and Google sign-in give one person two identities; with mandatory accounts, bind to both and take the stricter
- **No card up front.** Taken on day fourteen, from someone who has decided
- Server notifications land on `POST /billing/webhook`; entitlement state is cached locally so it survives offline

---

## 10 — Security and privacy

- **Secrets only in Key Vault.** No API key ever ships in the app — that is the reason the AI proxy exists, alongside cap enforcement
- **RLS on every user-owned table**
- **TLS everywhere**; certificate pinning is optional and probably not worth the operational risk
- **Health data never leaves the device** — enforced by those tables not existing server-side
- **Food photos are never stored** — processed to a range, then discarded. This removes a storage cost, a retention question, a GDPR surface and a deletion flow in one decision
- **Export is never gated**, at any tier, in any state
- **Account deletion is in-app** and actually deletes

---

## 11 — Complete service inventory

| # | Service | Purpose | Cost | Required |
| --- | --- | --- | --- | --- |
| 1 | Azure PostgreSQL Flexible Server (B1ms) | Durable copy | $15–20/mo | Yes |
| 2 | Azure Functions (Consumption) | The API | ~$0 | Yes |
| 3 | Azure Storage Account | Functions runtime | ~$1/mo | Yes |
| 4 | Azure Key Vault | Secrets | ~$0 | Yes |
| 5 | Application Insights | Logs, AI spend | $0–5/mo | Strongly |
| 6 | **Apple Developer Program** | App Store, Sign in with Apple, HealthKit, Live Activities, StoreKit | **$99/year** | Yes |
| 7 | **Google Play Developer** | Play Console, Play Billing, Health Connect | **$25 once** | Yes |
| 8 | Google Cloud project | Holds the OAuth client for Google Sign-In — easy to miss | Free | Yes |
| 9 | **Anthropic API** | Food, voice parse, break-down, slippage, plans | Variable | Yes |
| 10 | **OpenAI API** | `gpt-4o-mini-transcribe` for food voice; bake-off candidate | Variable | Yes |
| 11 | Expo EAS Build | **The only route to iOS builds from Windows** | $0–19/mo | Yes |
| 12 | EAS Submit / EAS Update | Store submission, OTA JS updates | Included | Recommended |
| 13 | GitHub | Source | Free | Yes |
| 14 | Domain | Legal and support URLs | ~$12/year | Yes |
| 15 | Static hosting — GitHub Pages or Azure Static Web Apps | Privacy, terms, support, web deletion request | Free | Yes |
| 16 | Sentry | Crash reporting — App Center is retired | Free tier | Yes |
| 17 | Cormorant Garamond + Archivo | **Bundled in the app**, never fetched at runtime — offline is a non-negotiable | Free | Yes |

**Running total: roughly $30–60/month at launch**, plus $99/year and $25 once.

### Not used

**Supabase** — it was the alternative to Azure, not a companion. **Firebase** — only as an auth fallback. Azure SQL, Cosmos DB, App Service, API Management, blob storage, push infrastructure, CDN, and any third-party analytics vendor: App Store Connect and Play Console cover the basics free.

---

## 12 — Still open

1. **The bake-off result** — §6.2. Settles the model, and possibly the provider
2. **Azure region** — pick by user geography
3. **PowerSync or hand-rolled sync** — evaluate before building
4. **EAS Build vs a Mac mini** — a build-cadence question, answerable after a month
5. **Regional price points** — set at launch, not after
