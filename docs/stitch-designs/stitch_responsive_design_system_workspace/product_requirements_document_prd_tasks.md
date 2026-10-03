# Product Requirements Document (PRD) — Tasks (Agentic Personal Task Manager)

**Project Name:** Tasks (ChronoTask Engine)  
**Author:** developer@levich.co / Elena Rostova  
**Date:** October 2026  
**Status:** Approved for Implementation (Rapid-Test & MVP Phase)  
**Target Form Factors:** Mobile PWA (~390px) & Desktop Web Workspace (1440px+)  
**Design System:** Sage Focus (`#4c9a78` Sage, `#7bc96f` Lime, `#f7f6f2` Canvas Background)

---

## 1. Executive Summary & Vision

### 1.1 The Core Problem
High-output operators (founders running multiple ventures, executives, and technical leads) juggle fragmented responsibilities across multiple discrete domains simultaneously (e.g., Venture `@alpha`, Advisory `@beta`, Corporate Governance/Tax, Personal Life Ops). 

Standard task managers (Google Tasks, Todoist, Apple Reminders) fail under this load:
1. **Silent Slippage:** Low-friction postponement lets urgent items slide indefinitely (+1, +2, +3 days) with zero consequence until failure occurs.
2. **Flat Context Blindness:** A single linear list fails to represent dependencies (Task A blocks Task B), cognitive weight, or downstream cascade risks.
3. **Friction at Ingestion:** Capturing nuance takes too many clicks, leading operators to jot cryptic one-line headers without actionable sub-steps.
4. **Time & Energy Agnosticism:** Tasks are scheduled into arbitrary times without regard for biological ultradian focus rhythms or calendar meeting clunches.

### 1.2 The Solution
**Tasks** is an **agentic personal task manager** that actively co-manages commitments *with* the user. It acts as an ambient vigilance and delegation partner:
- **Domain Anchoring:** Every commitment is strictly bound to an operational domain/category.
- **Cognitive Shielding & Chrono-Mapping:** Automatically clusters high-load work into morning peak energy windows (8:30 AM – 11:30 AM).
- **Elastic Scheduling:** Dynamically contracts tasks down to minimum duration floors (e.g., 45m → 15m) when schedules compress instead of letting them slip.
- **Slippage Watchdog:** Loudly flags repeatedly pushed tasks, calculates cascade dependency risks, and prevents silent failure.
- **Zero-Friction Ambient Capture:** Natural language typing and Web Speech API voice capture decompose thoughts into structured tasks, sub-milestones, and time hints.

---

## 2. Target Persona & User Stories

### 2.1 Primary Persona
**Elena Rostova — Multi-Venture Founder & Tech Lead**
- Juggles seed fundraising for `@alpha`, advisory architecture for `@beta`, corporate tax compliance, and personal health.
- Peak analytical energy occurs between 8:30 AM and 11:30 AM; afternoon is prone to meeting fatigue.
- Needs to glance at a morning briefing and trust that nothing critical has been forgotten.

### 2.2 Core User Stories
- **US-1 (Capture):** *As an operator, I want to type or speak natural language thoughts (e.g. "Draft investor memo before 11am for @alpha 90m") so that the system extracts domain, urgency, duration, and milestones without manual form filling.*
- **US-2 (Morning Briefing):** *As an operator, I want a curated morning schedule tuned to my peak focus window so that I know exactly what to execute first without decision fatigue.*
- **US-3 (Slippage Radar):** *As an operator, I want to be alerted whenever a task has been postponed >1 time or blocks a downstream deadline, so that I can shrink, delegate, or drop it.*
- **US-4 (Basesheet Task Detail):** *As an operator, I want a persistent right-hand drawer (Desktop) or bottom sheet (Mobile) showing relational dependencies, elastic sliders, and deconstructed milestones without losing context of my board or calendar.*
- **US-5 (Batch Triage):** *As an operator, I want an inbox-zero batch triage workflow for uncategorized voice notes and quick captures so that rogue items never languish.*

---

## 3. Key Product Pillars & Principles

1. **You Supply Judgment; The Agent Supplies Vigilance & Math:**
   The human decides strategy and approvals; the agent detects clashes, calculates time floor contractions, surfaces cascade risks, and compiles daily briefings.
2. **No Silent Magic (Auditability):**
   Every agentic recommendation surfaces its exact heuristic trigger (e.g., *"Rule triggered: Pushed > 2 days with active downstream dependency"*).
3. **60-30-10 Visual Harmony:**
   - **60% Calm Base:** Warm off-white canvas (`#F7F6F2`) and clean white cards (`#FFFFFF`).
   - **30% Structural Brand:** Calming Sage green (`#4C9A78`) and slate typography (`#22312B`).
   - **10% Intentional Accents:** Warm coral (`#F0705A`) for urgent blockers; soft amber (`#F2B24C`) for medium priority; periwinkle (`#7C87D6`) for rolled tasks; fresh lime (`#7BC96F`) for on-track completions.

---

## 4. Screen Architecture & User Journeys

```
                    ┌────────────────────────────────────────┐
                    │    Cold Start / Branded Hydration      │
                    └───────────────────┬────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [Empty State (1st Load)]       [Hydrated Workspace]
                         │                             │
          ┌──────────────┴──────────────┐              │
          ▼                             ▼              │
    Create Domain                Ingest 1st Task       │
          └──────────────┬──────────────┘              │
                         ▼                             │
          ┌────────────────────────────────────────────┴──────────────────────┐
          │                                                                   │
          ▼                                                                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Today Dashboard  │  │ My Tasks Views   │  │  Slippage Radar  │  │  Settings & Ops  │
│  - Briefing Card │  │  - List View     │  │  - Overdue / 3x  │  │  - Domains CRUD  │
│  - Energy Bands  │  │  - Kanban Board  │  │  - Cascade Risk  │  │  - Calibration   │
│  - Quick Capture │  │  - Calendar View │  │  - Interventions │  │  - Auditable Rules│
└─────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
          │                     │                     │                     │
          └─────────────────────┼─────────────────────┴─────────────────────┘
                                ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  ChronoTask Basesheet Drawer (Right Desktop / Bottom Mobile)│
        │   - Relational Dependency Graph (Upstream / Downstream)     │
        │   - Elastic Scheduling Compression Slider                   │
        │   - Deconstructed Milestone Checklist                       │
        │   - Audio STT & Completion Button                           │
        └─────────────────────────────────────────────────────────────┘
```

### 4.1 Today (Morning Briefing & Schedule)
- **Top Chrono-Header:** Displays current date, active focus block (e.g., *Morning Focus · 8:30 AM – 11:30 AM*), and agent vigilance status.
- **Curated Briefing Card:** Synthesizes total shielded hours (e.g. *2h 45m deep focus*), priority task count, and clash warnings.
- **Chronological Time Blocks:** Segregated into *Morning Focus Block*, *Afternoon & Compliance*, and *Evening Recharge*.
- **Task Row Badges:** Domain chip (`@alpha`), Status badge (*Newly Scheduled*), Urgency tag (*Urgent Coral / Due Before 11:00 AM*), and Elastic indicator (*Elastic min 20m*).

### 4.2 My Tasks (Multi-View Workspace)
- **View Switcher:** Seamless switching between **List**, **Board (Kanban)**, and **Calendar**.
- **Filter Bar:** Filter by domain (`@alpha`, `@beta`, `Financial`, `Personal`), plus quick filters for `Important`, `Elastic`, and `Uncategorized`.
- **Kanban Columns:** Status-driven: `Not Started` → `Active / In Progress` → `Done` → `Rolled-Forward`.
- **Calendar Timetable:** Multi-day column timetable with shaded biological energy windows, meeting clash warnings, and fluid buffer blocks.

### 4.3 Rolled-Forward (Slippage Radar)
- **Watchdog Metrics:** Rolled task count, Cascade risk count, and Reclaimed time tally.
- **Active Interventions:**
  - Tasks pushed ≥3 times trigger urgent intervention cards with direct actions: *Reschedule Today*, *Shrink to 15m*, *Drop / Delegate*, or *Archive*.
  - Displays cascade risk warnings: *"Blocks 2 upcoming tasks: Board slide prep & Legal review"*.

### 4.4 Batch Triage Workspace
- Ingests uncategorized quick-adds and voice STT notes.
- Quick bulk actions: Assign Domain, Set Priority, Allow Elastic Compression.
- Success confirmation toast and seamless transition to empty-state (*"Inbox Zero · All Clear"*).

### 4.5 Task Detail Drawer (Basesheet Architecture)
- Persistently docked right drawer on Desktop (inspired by ChronoTask/Outcrowd) or slide-up bottom sheet on Mobile.
- Contains:
  1. Lifecycle state dropdown (`Not Started`, `In Progress`, `Done`).
  2. Inferred priority rationale (e.g. *"Inferred Urgent: Blocks pitch deck circulation today at 3:00 PM"*).
  3. Time & Dynamics: Scheduled window, target duration, and Elastic Scheduling toggle.
  4. Relational Dependencies: Prerequisite links (clean cap table review) and critical path blockers.
  5. Deconstructed Milestones: AI-broken micro-steps with individual checkboxes and time estimates.
  6. Primary Action: Prominent Sage green button (*"Mark as Completed & Release Blockers"*).

### 4.6 Settings & Domain Architecture
- **Operational Domains CRUD:** Define name, `@shortcode`, glyph icon, and color swatch.
- **Productivity Calibration:** Set primary focus window (Morning Bias vs. Afternoon Flow) and unassigned elastic buffer caps.
- **Auditable Rules Engine:** Explicit toggles for *Cascade Risk Trigger*, *Density & Clustering Alert*, *Repeated Rollforward Watchdog*, and *Elastic Compression Policy*.

---

## 5. Technical Architecture & Data Model

### 5.1 Technology Stack (Rapid-Test Phase)
| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | **Next.js (App Router) + React** | Server actions keep Claude API keys secure; optimized rendering. |
| **Styling & UI Kit** | **Tailwind CSS + shadcn/ui** | Fully owned source code matching ChronoTask basesheet styling. |
| **Iconography** | **Lucide React** | Clean, minimalist, consistent stroke weight. |
| **Typography** | **Figtree (Google Fonts)** | Friendly, crisp geometry with superior tabular numeral support. |
| **Database & Storage** | **Supabase (Postgres)** | Hosted relational database with clean schema migration paths. |
| **AI / Agentic Engine** | **Claude 3.5 Sonnet (Anthropic API)** | Natural language parsing, task deconstruction, and briefing generation. |
| **Speech-to-Text** | **Web Speech API (Browser STT)** | 100% free, zero external API keys needed for mobile PWA dictation. |
| **Cron / Automations** | **Vercel Cron** | Nightly rollforward calculation and 8:00 AM briefing synthesis. |

### 5.2 Schema Specification (Single-User Rapid-Test)

```sql
-- Operational Domains / Categories
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    shortcode TEXT NOT NULL UNIQUE, -- e.g. 'alpha', 'beta', 'finance'
    color_hex TEXT NOT NULL,        -- e.g. '#4C9A78'
    glyph_icon TEXT NOT NULL,       -- e.g. 'rocket', 'shield', 'briefcase'
    morning_bias BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Core Tasks
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'done', 'rolled_forward');
CREATE TYPE task_importance AS ENUM ('important', 'medium', 'flexible');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'not_started',
    user_importance task_importance DEFAULT 'medium',
    inferred_important BOOLEAN DEFAULT false,
    scheduled_date DATE,
    scheduled_start TIME,
    scheduled_end TIME,
    time_hint TEXT,                 -- e.g. 'before 11:00 AM'
    duration_min INT DEFAULT 45,
    min_duration_min INT DEFAULT 15,-- Elastic compression floor
    is_elastic BOOLEAN DEFAULT true,
    rollforward_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deconstructed Milestones (Sub-tasks)
CREATE TABLE task_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_est_min INT DEFAULT 15,
    is_completed BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0
);

-- Relational Dependency Graph
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocking_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (blocking_task_id, dependent_task_id)
);

-- Auditable Agent Rules & Preferences
CREATE TABLE app_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_focus_start TIME DEFAULT '08:30',
    primary_focus_end TIME DEFAULT '11:30',
    elastic_cushion_min INT DEFAULT 45,
    enable_cascade_trigger BOOLEAN DEFAULT true,
    enable_clustering_alert BOOLEAN DEFAULT true,
    enable_rollforward_watchdog BOOLEAN DEFAULT true,
    active_theme TEXT DEFAULT 'sage_focus'
);
```

---

## 6. Functional Requirements & Agentic Workflows

### 6.1 Natural Language Capture & Decomposition
1. **Input:** User submits voice transcript or typed text:  
   *`"Draft investor pitch memo for seed extension before 11am for @alpha 90m"`*
2. **Agent Heuristics:**
   - Detects domain token `@alpha` and maps to `domains.id`.
   - Parses time hint `before 11am` and sets hard boundary.
   - Sets target duration `90m` and calculates elastic floor `45m`.
   - Generates 3–4 logical sub-milestones based on task archetype (e.g. *Cap table outline, retention inflection, runway calculation*).
   - Scans calendar for morning focus window (8:30 AM – 11:30 AM) and reserves the 9:00 AM – 10:30 AM slot.

### 6.2 Cascade Risk & Blocker Propagation
- When Task A is marked as a prerequisite for Task B:
  - If Task A slips or is rolled forward, Task B automatically flags a **`Cascade Risk Detected`** warning.
  - The agent inherits priority: even if Task A was marked "flexible", it escalates to "Urgent / Critical Path" if Task B has a fixed deadline.

### 6.3 Nightly Rollforward & Morning Briefing
- **Nightly Job (11:59 PM):**
  - Scans for all uncompleted tasks with `date <= today`.
  - Sets `status = 'rolled_forward'`, increments `rollforward_count += 1`.
  - Re-anchors date to tomorrow.
- **Morning Briefing Generation (7:30 AM):**
  - Synthesizes top 3 priority tasks.
  - Checks total duration against the 3-hour morning focus budget.
  - Formulates brief encouraging audio/text summary for the dashboard.

---

## 7. Release Milestones & Roadmap

| Milestone | Scope | Deliverables | Target Status |
|---|---|---|---|
| **M0: Foundation & Design System** | Theme tokens, Figtree typography, App Shell | Mobile PWA & Desktop web shells, palette tokens | **Complete** |
| **M1: Core Mobile Suite** | Today, My Tasks, Detail Drawer, Radar, Settings | 10 high-fidelity mobile screens | **Complete** |
| **M2: Desktop Basesheet Architecture** | Persistent sidebar, 3-column boards, drawers | Desktop Board, Today Briefing, Radar, Calendar | **Complete** |
| **M3: Onboarding & First-Load Flow** | Cold-start splash, Empty State, 1st Task Capture | Minimalist centered ingestion & domain anchoring | **Complete** |
| **M4: Backend Implementation** | Next.js API actions, Supabase schema, Claude API | Live interactive prototype with Web Speech STT | Next Phase |
| **M5: Dogfooding & Calibration** | 2-week internal run, tuning elastic compression | Annoyance triage and heuristic rule calibration | Next Phase |
| **M6: Google Calendar & Multi-User** | Two-way GCal sync, Clerk Auth, RLS | Public multi-tenant release | Future |

---

## 8. Success Metrics & Verification Criteria

1. **Zero Silent Drops:** 100% of tasks uncompleted at midnight are loudly highlighted on the Slippage Radar.
2. **Frictionless Capture:** Voice or natural language entry requires <5 seconds from trigger to structured creation.
3. **High Briefing Trust:** Operator executes the morning plan without opening an external calendar or secondary list.
4. **Cognitive Calm:** Visual density adheres strictly to the 60-30-10 rule, preventing overwhelm even during intense multi-venture sprints.

---
*Document produced for developer@levich.co — ChronoTask / Tasks Project Engine.*
