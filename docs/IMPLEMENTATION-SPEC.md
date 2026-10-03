# Tempo — Implementation Spec (Rapid-Test Phase)

> **Tempo** — an agentic personal task manager that keeps your day in rhythm:
> it watches for slippage, protects your priorities, and sets the pace each morning.

> Companion to [`PROJECT-PLAN.md`](./PROJECT-PLAN.md). This document captures the
> **implementation decisions** for the initial rapid-testing build: a
> **single-user, no-auth, no `user_id`** version focused on getting the agentic
> layer and the three task views on screen fast.

**Author:** developer@levich.co
**Date:** 2026-10-02
**Status:** Spec — ready to scaffold
**Phase:** Rapid testing (single-user, no auth)

---

## Table of Contents
1. [Scope & Posture](#1-scope--posture)
2. [Confirmed Decisions (this session)](#2-confirmed-decisions-this-session)
3. [Tech Stack](#3-tech-stack)
4. [UI System — Components & Icons](#4-ui-system--components--icons)
5. [Screen & Route Architecture](#5-screen--route-architecture)
6. [Data Model (no `user_id`)](#6-data-model-no-user_id)
7. [Agentic Layer](#7-agentic-layer)
8. [Voice Iteration & AI Models](#8-voice-iteration--ai-models)
9. [Build Timeline & Milestones](#9-build-timeline--milestones)
10. [Deferred / Out of Scope (v1)](#10-deferred--out-of-scope-v1)

---

## 1. Scope & Posture

This is the **rapid-testing** build. The goal is to validate the *agentic
experience* (capture → prioritize → surface slippage → brief) with the least
plumbing possible.

**Deliberate simplifications:**
- **No `user_id`** anywhere. Single implicit user.
- **No auth** (Clerk deferred).
- **No row-level security**, no multi-tenancy.
- **One Supabase project**, one environment.
- **Google Calendar integration deferred** (it's the only auth-shaped dependency).
- Tables are open; `user_settings` is a single config row (or constants).

**Principle carried from the plan:** *You supply judgment; the agent supplies
vigilance and math.* Deterministic logic (dependency math, rollforward,
clustering) is plain code; Claude handles the fuzzy edges (NL parse, briefing prose).

---

## 2. Confirmed Decisions (this session)

| Decision | Choice |
|---|---|
| **Cold-start splash** | Branded loading state on **every cold start** (fast, not artificial) |
| **Task views** | **List + Board/Kanban + Calendar** — all three in v1 |
| **Kanban columns** | Keyed to **status** (`not started → in progress → done → rolled-forward`); **category = color/tag** on the card |
| **Categories** | Created/edited/deleted in **Settings**; assignable to tasks via dropdown |
| **Color meaning** | Category color + status color carry meaning (60-30-10 rule, §10 of plan) |
| **Component library** | **shadcn/ui** (own the code; restyle freely) |
| **Icon set** | **Lucide** (ships with shadcn) |
| **Design reference** | **Untitled UI** as *visual* reference only (its React kit is paid/less flexible) |
| **Visual target** | ChronoTask/outcrowd layout: left sidebar + view tabs + right-hand task-detail drawer |
| **Voice input** | Free: **Web Speech API** (browser STT) → feeds existing NL quick-add |

---

## 3. Tech Stack

| Layer | Choice | Notes for rapid-test |
|---|---|---|
| **Frontend** | Next.js (App Router) + React | Server actions hide the Claude key |
| **Styling** | Tailwind CSS | Required by shadcn/ui |
| **Components** | shadcn/ui (Radix + Tailwind) | Copy-paste, fully owned |
| **Icons** | Lucide | Zero setup with shadcn |
| **PWA** | next-pwa / manifest | Installable, cold-start splash, future push |
| **Database** | Supabase (Postgres) | Used as hosted Postgres only — skip auth/RLS/realtime for now |
| **AI (parse + briefing)** | Claude API | Server-side only |
| **Voice STT** | Web Speech API (free) | Browser-native; Whisper/Groq as upgrade path |
| **Scheduled jobs** | Vercel Cron | Nightly rollforward + morning briefing prep |
| **Deploy** | Vercel | Push-to-deploy, previews |
| **Calendar** | Google Calendar API | **Deferred** past rapid-test |
| **Auth** | Clerk | **Deferred** (no auth in v1) |

---

## 4. UI System — Components & Icons

### Brand assets
- **Logo:** `Tempo_Logo.png` (project root) — sage-green lowercase "t" monogram
  (reads as a beat marker) + lowercase "tempo" wordmark. Use in sidebar header,
  cold-start splash, PWA icon, and favicon. Export a **monochrome + rounded-square
  app-icon** crop from it for the PWA manifest.
- **UI design source:** Google Stitch project (user-generated screens) —
  reference for layout/screens.

### Component library: shadcn/ui
Chosen for rapid, heavily-customized iteration — you own the source, so matching
the ChronoTask aesthetic is trivial. Key primitives we'll lean on:

- **Dialog / Sheet (Drawer)** → the task-detail panel (right-hand drawer)
- **Tabs** → List / Board / Calendar switcher
- **Dropdown Menu / Select** → category picker, status changer
- **Command (⌘K)** → natural-language quick-add surface
- **Card** → task cards (board + list)
- **Badge** → category tags, priority, rollforward count
- **Calendar** → date grid for the Calendar view

> **Untitled UI** is used only as a *look & spacing* reference. Its React kit is
> paid and less flexible than shadcn — not the build base.

### Icon map (all available in Lucide)

| Purpose | Icon |
|---|---|
| Create (manual) / add | `Plus` |
| Create (AI / voice / NL) | `Sparkles`, `Mic` |
| Home / dashboard | `LayoutDashboard` |
| Today | `Sun` / `CalendarDays` |
| Rolled-forward | `ArrowRightCircle` / `History` |
| Upcoming | `CalendarClock` |
| View: List / Board / Calendar | `List` · `Columns3` · `Calendar` |
| Category | `Tag` / `Folder` |
| Priority / important | `Flag` / `AlertTriangle` |
| Conflict / clustering warning | `TriangleAlert` |
| Elastic / shrinkable task | `Minimize2` |
| Status progression | `CircleDashed` → `CircleDot` → `CircleCheck` |
| Alerts / notifications | `Bell` |
| Morning briefing | `Sunrise` / `Coffee` |
| Settings | `Settings` |

---

## 5. Screen & Route Architecture

```
/                     Splash → Home (agentic dashboard)
  ├─ Today            prioritized tasks + soft time hints + rolled-forward surfaced
  ├─ Rolled-forward   the slippage view (loud "pushed Nx" flags)
  └─ Upcoming         look-ahead
/tasks                My Tasks — view switcher
  ├─ List             flat, filterable list
  ├─ Board            Kanban by status; category = card color/tag
  └─ Calendar         month/week grid; click a date → that day's tasks
/settings
  └─ Categories       create / edit / delete (name + color)
  └─ Preferences      productivity window, alert times, theme (single config row)

Task-detail drawer    opens over any view (shadcn Sheet):
  title · description · category · status · priority · due date ·
  time hint · duration (+ min duration for elastic) · sub-steps · rollforward count
```

**Cold-start flow:** icon tap → branded splash (app shell + today's data hydrate)
→ Home/Today. Splash shows on every cold start; kept fast, no artificial delay.

**Navigation:** left sidebar (Create · Home · My Tasks · Calendar · Settings),
mirroring the reference — minus all team features (no assignees/invite/portfolios).

---

## 6. Data Model (no `user_id`)

```
task
  id, title, description
  category_id            -> category (nullable)
  importance             enum(important | flexible)   # user-declared
  inferred_important     bool                          # agent-derived from deps
  status                 enum(not_started|in_progress|done|rolled_forward)
  date                   date
  time_hint              text        # "before noon", "by 2pm"
  duration_min           int
  min_duration_min       int         # elastic floor (e.g. study → 15)
  rollforward_count      int         # for "Nth time pushed" flag
  created_at, updated_at

category
  id, name, color

dependency
  id, blocks_task_id -> task, depends_on_task_id -> task

app_settings            # single row — replaces per-user user_settings
  id, productivity_window, alert_times[], palette, theme(light|dark)

warning_rule            # auditable: which conditions trigger warnings
  id, name, condition, enabled
```

> **Change from plan:** `user_settings` → `app_settings` (single row, no `user_id`).
> When multi-user arrives, add `user_id` columns + RLS + Clerk — clean upgrade path.

---

## 7. Agentic Layer

All server-side (API routes / server actions) so the Claude key stays secret and
rules stay centralized/auditable.

| Capability | Implementation |
|---|---|
| **NL / voice quick-add** | Text (typed or voice-transcribed) → Claude → structured task JSON (title, date, time hint, duration, label, category) |
| **Importance inference** | Dependency-graph walk: if a task blocks a deadline, it inherits urgency even if labeled "flexible" |
| **Conflict detection** | Rule engine flags *serious* clashes + time-hint **clustering** ("3 before-noon tasks won't fit"); ignores flexible overlaps |
| **Rollforward** | Nightly **Vercel Cron**: non-completed tasks → next day, `rollforward_count++`, flagged loudly |
| **Morning briefing** | Cron assembles priority-ordered, time-stamped plan for the productivity window; Claude phrases it |
| **Auditable rules** | `warning_rule` rows surfaced in a Settings screen — "no silent magic" |

---

## 8. Voice Iteration & AI Models

**Goal:** free voice capture for the rapid-test phase.

### Availability note
- **This dev environment runs Claude only** (Opus 4.8). OpenAI is *not* a backend here.
- **OpenAI's hosted API has no free tier** (pay-as-you-go). So "free OpenAI" ≠ real,
  *except* that **Whisper** (their STT model) is **open-source and free to self-host**.

### Recommended voice pipeline (free)
```
🎙  Voice
     │  Web Speech API  (browser-native STT, 100% free, no key)
     ▼
   Text transcript
     │  Claude API  (parse → structured task)
     ▼
   Structured task  → saved to Supabase
```

### Options, ranked for rapid-test
| Option | Cost | When to use |
|---|---|---|
| **Web Speech API** | Free, zero infra | **Default.** In-browser STT/TTS, ideal for PWA |
| **Whisper via Groq** | Free tier | When browser STT accuracy isn't enough |
| **Self-hosted Whisper** | Free (compute) | Offline / full control |
| OpenAI hosted Whisper/Realtime | Paid | Only if a free option proves insufficient |

> NL understanding stays on **Claude** (already in the stack) — voice only replaces
> the *input method*, feeding the same quick-add parser.

---

## 9. Build Timeline & Milestones

> Rapid-test ordering — ship a thin slice online early, then layer the agent.

| # | Milestone | Deliverable |
|---|---|---|
| **M0** | **Scaffold** | Next.js + Tailwind + shadcn/ui + Supabase client; deploy skeleton to Vercel; cold-start splash + PWA manifest |
| **M1** | **Task CRUD** | `task` + `category` tables; create/edit/delete; task-detail drawer |
| **M2** | **Three views** | List + Board (Kanban by status) + Calendar (click date → tasks) |
| **M3** | **Settings/Categories** | Category CRUD (name+color); `app_settings` single row; theme |
| **M4** | **NL + voice quick-add** | Claude parse endpoint; Web Speech API voice input |
| **M5** | **Rollforward + briefing** | Vercel Cron nightly job; loud rollforward flags; morning briefing |
| **M6** | **Conflict detection** | Clustering + serious-clash rules; auditable `warning_rule` screen |
| **M7** | **Dogfood** | Live with it; triage annoyances into a fix list |

**Deferred to post-rapid-test:** Google Calendar integration, push notifications,
Clerk auth + multi-user (add `user_id` + RLS).

---

## 10. Deferred / Out of Scope (v1)

Explicitly **not** building now (the Discernment cut):
- Auth, `user_id`, multi-user, RLS (Clerk).
- Google Calendar two-way sync.
- Push notifications (PWA push setup).
- Team features from the reference: **assignees, invite, portfolios, goals,
  reporting, inbox, file attachments**.
- Drag-and-drop polish beyond basic Kanban moves (keep board simple first).

---

> Session note: decisions here were made during a rapid-test planning session and
> intentionally trade completeness for speed. Upgrade paths (auth, calendar, push,
> multi-user) are all additive — nothing here blocks them.
