# Agentic Task Manager — Detailed Project Plan

> Course project for the **Delegation** lesson, developed through a genuine
> planning conversation with Claude. Save this — you'll return to it for the
> **Description, Discernment, and Diligence** lessons.

**Author:** developer@levich.co
**Date:** 2026-08-30
**Status:** Planning complete — ready to build
**Name:** **Tempo** (agentic personal task manager) — *keeps your day in rhythm*

---

## Table of Contents
1. [Vision](#1-vision)
2. [Success Criteria](#2-success-criteria)
3. [The Core Problem](#3-the-core-problem)
4. [Key Product Decisions](#4-key-product-decisions)
5. [Feature Breakdown](#5-feature-breakdown)
6. [Screens & UX](#6-screens--ux)
7. [Tech Stack & Architecture](#7-tech-stack--architecture)
8. [Data Model (sketch)](#8-data-model-sketch)
9. [Major Tasks & Delegation Map](#9-major-tasks--delegation-map)
10. [Visual Design — Palettes & Font](#10-visual-design--palettes--font)
11. [Delegation Growth Reflection](#11-delegation-growth-reflection)
12. [Roadmap & Open Decisions](#12-roadmap--open-decisions)

---

## 1. Vision

An **agentic, AI-powered personal task manager** that actively manages your task
list *with* you — not just a smarter to-do list, but a system that watches for
slippage, protects your priorities, and hands you a clear plan each morning.

It fixes a real problem: juggling **personal, financial, and work tasks across
multiple startups** at once, where important things silently slide to "tomorrow,"
complexity snowballs, and a flat single-screen list stops working.

**The distinctive idea:** the tool is a *delegation engine for your own life* —
it surfaces where your time is leaking so you can decide what to offload,
automate, or drop, and redirect effort to what matters.

---

## 2. Success Criteria

> **After ~2 weeks of use:**
> - You add tasks with almost **no friction** (so you actually capture them).
> - You **trust the morning briefing** enough to drop your mental backup list.
> - **Nothing important silently slips** — the agent catches it first.
> - The tool **shows where your time is leaking** so you can reclaim it.

**Why it matters:** juggling multiple startups is hard. Fixing this frees mental
overhead and reclaimed time — the difference between reacting and running the day.

---

## 3. The Core Problem

What breaks with Google Tasks today:
- Too **simple** for someone wrangling many things across many domains at once.
- Important tasks **silently slide** to the next day (and +2, +3), and complexity
  snowballs.
- Adding a task only captures a **header** — no room for a real description or
  the sub-steps you'll need later.
- A **single flat screen** for everything (ASAP, "can wait," learning, etc.)
  doesn't reflect how things actually matter.
- No **time-awareness** — nothing warns you when a new task collides with
  something important.

---

## 4. Key Product Decisions

| Area | Decision |
|---|---|
| **Categories** | User-driven (personal / financial / per-startup, etc.) |
| **Importance** | Two sources: **user labels** (important/flexible) **+ agent-inferred** from task dependencies |
| **Dependencies** | Tasks can block each other (Part 1 → Part 2). Slippage cascades downstream |
| **Task states** | not started → in progress → done / rolled-forward |
| **Elastic tasks** | Some tasks can *shrink* (e.g. study "just 15 min") instead of fully slipping |
| **Rollforward (v1)** | Simple rule: any task not *completed* → moves to next day |
| **Flexible-vs-dependency conflict** | **Agent flags it** — if a "flexible" task now blocks a deadline, the agent speaks up (user may have forgotten) |
| **Auditability** | **No silent magic** — user can inspect exactly which rules trigger warnings |
| **Productivity window** | User-driven (yours = morning). Per-user — the basis for future generalization |
| **Alerts** | User sets explicit times; a notification fires at that time |
| **Calendar** | **Integrate Google Calendar** — don't rebuild a calendar (solved problem; spend effort on the agentic layer) |
| **Quick-add** | **Natural-language capture** — type intent, agent parses to a structured task; manual/structured entry optional |
| **Time hints** | Soft ("try to finish before noon / by 2pm"), not rigid alarms — conflict detection is about *pressure & clustering* |
| **Auth (v1)** | **No auth for v1** (single-user, personal). **Clerk** planned when multi-user is needed |

---

## 5. Feature Breakdown

**Capture**
- Natural-language quick-add ("study ML part 1 tomorrow morning, 15 min, flexible")
  → agent parses to a structured task (title, date, time hint, duration, label, category).
- Optional manual/structured entry with full fields.
- Rich task detail: description, sub-steps, context.

**Organize**
- User-defined categories and importance labels (important / flexible).
- Dependencies between tasks; automatic detection of downstream ripple effects.
- Task states + elastic tasks (shrink instead of slip).

**Agent behaviors**
- **Urgency sorting** — prioritizes today's tasks (declared + inferred importance).
- **Conflict detection** — flags *serious* clashes (deadline/commitment); ignores
  flexible/gig-work overlaps; watches for time-hint *clustering* ("3 before-noon
  tasks won't fit").
- **Rollforward** — non-completed tasks move to next day, **loud & flagged**
  (e.g. "3rd time pushed — still real?").
- **Morning briefing** — curated, priority-ordered, time-stamped plan tuned to
  your productivity window.
- **Alerts** — fire at user-set times; warn when important work is slipping.
- **Auditable rules** — a screen listing exactly which conditions trigger warnings.

**Integrations**
- Google Calendar (two-way awareness for conflict detection).
- Push notifications (PWA).

---

## 6. Screens & UX

**Home = three-tab dashboard** (app opens here — the default view *is* the value):
- **Today** (highlight): prioritized tasks with soft time hints; rolled-forward
  tasks surfaced here so they can't hide.
- **Rolled-forward**: the slippage view — what keeps moving.
- **Upcoming**: what's coming, to see around corners.

**UX principles**
- **Minimum clicks to complete a goal** — low-friction capture is *survival*
  (the cure for "only capture headers"), not polish.
- **Consistent color palette where color carries meaning** (see §10).
- Calm base, energizing accents — a long list must never feel crushing.

---

## 7. Tech Stack & Architecture

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Next.js** (React) | SSR/CSR flexibility, great DX, first-class Vercel support |
| **Cross-platform** | **PWA** | One codebase → installable on **mobile + desktop**; push notifications; offline-friendly |
| **Backend (BaaS)** | **Supabase** | Postgres + auth + realtime + row-level security; fast to build on |
| **Auth** | **Clerk** (planned) | Drop-in auth when multi-user arrives. **v1 skips auth** (personal, single-user) |
| **Deployment** | **Vercel** | Zero-config Next.js deploys, previews, edge |
| **Version control** | **git** | Standard; pairs with Vercel preview deploys |
| **AI / assisted coding** | **Claude** | Powers natural-language task parsing + briefing generation; and assists the coding itself |
| **Calendar** | **Google Calendar API** | Don't rebuild a calendar; integrate the one you already use |

### Architecture (high level)
```
[ PWA client — Next.js/React ]
        |  (natural language, actions)
        v
[ Next.js API routes / server actions ]
   |            |                 |
   v            v                 v
[ Supabase ]  [ Claude API ]  [ Google Calendar API ]
 Postgres      NL parse +       events for
 + realtime    briefing gen     conflict detection
        |
        v
[ Push notifications (PWA) at user-set alert times ]
```

**Notes**
- Keep the **agentic logic server-side** (API routes / server actions) so the
  Claude API key stays secret and rules are centralized/auditable.
- Supabase **row-level security** makes the eventual multi-user step clean.
- A scheduled job (e.g. Vercel Cron) runs nightly **rollforward** and prepares
  the **morning briefing**.

---

## 8. Data Model (sketch)

```
task
  id, title, description
  category_id            -> category
  importance             enum(important | flexible)   # user-declared
  inferred_important     bool                          # agent-derived from deps
  status                 enum(not_started|in_progress|done|rolled_forward)
  date                   date
  time_hint              text        # "before noon", "by 2pm"
  duration_min           int         # supports elastic tasks
  min_duration_min       int         # e.g. study can shrink to 15
  rollforward_count      int         # for "3rd time pushed" flag
  created_at, updated_at

category
  id, name, color

dependency
  id, blocks_task_id -> task, depends_on_task_id -> task

user_settings
  id, productivity_window, alert_times[], palette, theme(light|dark)

warning_rule            # auditable: which conditions trigger warnings
  id, name, condition, enabled
```

---

## 9. Major Tasks & Delegation Map

Delegation lens: **Human** (only you) · **AI** (leverage the machine) ·
**Collaboration** (highest impact).

| # | Task | Human (only you) | AI (leverage) | Collaboration sweet spot |
|---|------|------------------|---------------|--------------------------|
| 1 | **Discovery & rules** | Your workflow, guardrails, what "important/flexible" means | Interviewing you, spotting contradictions, structuring rules | You talk → AI organizes + challenges |
| 2 | **Feature & agent design** | Priority values, agent's authority/personality | Conflict-detection logic, dependency ripple math, briefing rules | You set intent → AI designs mechanics |
| 3 | **UX / screens** | Taste; what "not overwhelming" feels like | Layouts, hierarchy, microcopy, mockups | AI generates options → you judge |
| 4 | **Tech architecture** | Approve trade-offs (build vs integrate) | Data model, stack wiring, Calendar + notifications | AI proposes → you decide |
| 5 | **Build core** | Judge "does this behave as I meant" | Scaffold app, CRUD, categories, scheduling (Next.js + Supabase) | AI builds → you validate |
| 6 | **Build agent layer** | Source of truth when reality ≠ spec | Sorting, conflict detection, rollforward, briefing, alerts, NL parsing (Claude) | AI builds → you validate behavior |
| 7 | **Dogfood & measure** | Live with it 2 weeks; feel whether you trust it | Turn annoyances into a prioritized fix list | You use → AI iterates |
| 8 | **Generalize (later)** | Decide if/when to go public | Per-user settings, Clerk multi-user | Only if going public |

**Core delegation principle:** *You supply the judgment; the agent supplies the
vigilance and the math.* Apply delegation to the **build itself** — don't
re-solve solved problems (calendar); spend scarce human effort on what only your
app does (agentic prioritization).

---

## 10. Visual Design — Palettes & Font

**Strategy:** the **60-30-10 rule** — calm color for ~60% (background/surfaces),
supporting tone ~30%, *energizing accent only ~10%* (action items). Screen stays
calm so a long list doesn't crush you; important items pop with positive energy.

- **Green** blends the calm of blue with the energy of yellow — best for feeling
  overwhelmed by tasks.
- **Soften "urgent"** — warm **coral** instead of alarm-red: reads "act now" but
  motivates instead of stressing.

**Font: [Figtree](https://fonts.google.com/specimen/Figtree)** — friendly, highly
legible, modern; used across all palettes.

### 🌿 Palette A — "Sage Focus" *(recommended)*
| Role | Color | Hex |
|---|---|---|
| Background (60%) | Warm off-white | `#F7F6F2` |
| Surface / cards | White | `#FFFFFF` |
| Primary text | Deep slate-green | `#22312B` |
| Signature / brand (30%) | Sage green | `#4C9A78` |
| Energizing accent (10%) | Fresh lime-green | `#7BC96F` |
| 🔴 Urgent (ASAP) | Warm coral | `#F0705A` |
| 🟠 Medium | Soft amber | `#F2B24C` |
| 🟢 On-track / flexible | Calm green | `#5DB87E` |
| 🔵 Rolled-forward | Muted periwinkle | `#7C87D6` |

### 🌅 Palette B — "Warm Calm" (Headspace-inspired)
| Role | Color | Hex |
|---|---|---|
| Background | Warm cream | `#FBF7F0` |
| Surface | White | `#FFFFFF` |
| Primary text | Warm charcoal | `#2B2A28` |
| Signature | Soft teal | `#3D9A9A` |
| Accent | Warm peach/orange | `#FF9463` |
| 🔴 Urgent | Coral-red | `#EC6A5E` |
| 🟠 Medium | Honey | `#F4B860` |
| 🟢 Flexible | Sage | `#7FB685` |
| 🔵 Rolled-forward | Dusty blue | `#6D9DC5` |

### 🌊 Palette C — "Fresh Teal" (modern, crisp)
| Role | Color | Hex |
|---|---|---|
| Background | Cool off-white | `#F5F7F8` |
| Surface | White | `#FFFFFF` |
| Primary text | Ink navy | `#1C2B33` |
| Signature | Vivid teal | `#159A8C` |
| Accent | Bright mint | `#3ED6B0` |
| 🔴 Urgent | Coral | `#FF6B6B` |
| 🟠 Medium | Amber | `#FFB84D` |
| 🟢 Flexible | Emerald | `#2BB673` |
| 🔵 Rolled-forward | Sky blue | `#4F9FE0` |

> All palettes support **light + dark mode** (default light, offer dark).
> Final pick: **TBD** (leaning A).

---

## 11. Delegation Growth Reflection

- Shifted from **feature-first** to **judgment-first** thinking.
- Independently reasoned the agent should *flag* forgotten dependencies —
  assigning the machine to cover a human weakness (forgetting).
- Invented the **"importance = my labels + the structure"** split.
- Added **auditability** ("user can check which cases trigger warnings") — mature
  trust-calibration, not blind automation or blind control.
- Reframed the whole product as a **delegation engine for your life**.

**Growth edge (next lessons):** the instinct so far is to *add* (great ideas,
fast). The next muscle is **cutting and scoping** — deciding what *not* to build
in v1 (Discernment) and specifying/checking precisely (Description, Diligence).

---

## 12. Roadmap & Open Decisions

**Suggested v1 build order**
1. Scaffold Next.js PWA + Supabase, deploy to Vercel (skeleton online early).
2. Core task CRUD: rich tasks, categories, states.
3. Scheduling + soft time hints; three-tab dashboard.
4. Natural-language quick-add (Claude).
5. Rollforward job + morning briefing.
6. Conflict detection + auditable warning rules.
7. Google Calendar integration.
8. Push notifications / alerts.
9. Dogfood 2 weeks → measure against success criteria.

**Open decisions (for the later lessons)**
- [ ] Final palette pick (A / B / C)
- [ ] v1 scope cut — the Discernment exercise (what to *drop* from the list above)
- [ ] Notification strategy details (PWA push setup)
- [ ] When to introduce Clerk auth + multi-user (generalization step)
