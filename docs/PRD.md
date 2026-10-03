# Product Requirements Document (PRD) - Tasks (Agentic Personal Task Manager)

**Project Name:** Tasks (ChronoTask Engine)
**Author:** developer@levich.co / Elena Rostova
**Date:** October 2026
**Status:** Approved for Implementation (Rapid-Test & MVP Phase)
**Target Form Factors:** Mobile PWA (~390px) & Desktop Web Workspace (1440px+)
**Design System:** Sage Focus (`#4c9a78` Sage, `#7bc96f` Lime, `#f7f6f2` Canvas Background)

---

## 1. Executive Summary & Vision

### 1.1 The Core Problem
High-output operators juggle fragmented responsibilities across multiple discrete domains
(Venture `@alpha`, Advisory `@beta`, Corporate Governance/Tax, Personal Life Ops).
Standard task managers fail under this load:
1. **Silent Slippage:** low-friction postponement lets urgent items slide indefinitely.
2. **Flat Context Blindness:** a single linear list fails to represent dependencies, cognitive weight, or cascade risk.
3. **Friction at Ingestion:** capturing nuance takes too many clicks.
4. **Time & Energy Agnosticism:** tasks scheduled without regard for ultradian focus rhythms or calendar clashes.

### 1.2 The Solution
An agentic personal task manager that co-manages commitments with the user:
- **Domain Anchoring** - every commitment bound to an operational domain.
- **Cognitive Shielding & Chrono-Mapping** - clusters high-load work into morning peak window (8:30-11:30 AM).
- **Elastic Scheduling** - contracts tasks to minimum duration floors instead of slipping.
- **Slippage Watchdog** - flags repeatedly pushed tasks, calculates cascade risk.
- **Zero-Friction Ambient Capture** - NL typing + Web Speech API voice -> structured tasks, sub-milestones, time hints.

---

## 2. Target Persona & User Stories

Primary persona: Elena Rostova, multi-venture founder; peak energy 8:30-11:30 AM.

- US-1 (Capture): type/speak NL -> system extracts domain, urgency, duration, milestones.
- US-2 (Morning Briefing): curated schedule tuned to peak focus window.
- US-3 (Slippage Radar): alerted when a task is postponed >1 time or blocks a downstream deadline.
- US-4 (Basesheet Task Detail): persistent right drawer (desktop) / bottom sheet (mobile) with dependencies, elastic sliders, milestones.
- US-5 (Batch Triage): inbox-zero workflow for uncategorized captures.

---

## 3. Key Product Pillars
1. You supply judgment; the agent supplies vigilance & math.
2. No silent magic (auditability) - every recommendation surfaces its heuristic trigger.
3. 60-30-10 visual harmony - 60% calm canvas `#F7F6F2`/white, 30% sage `#4C9A78`/slate `#22312B`,
   10% accents: coral `#F0705A` urgent, amber `#F2B24C` medium, periwinkle `#7C87D6` rolled, lime `#7BC96F` on-track.

---

## 4. Screen Architecture
- Cold Start / Branded Hydration -> Empty State (1st load) or Hydrated Workspace.
- 4.1 Today: chrono-header (date, focus block, agent status), curated briefing card (shielded hours, counts, clashes),
  chronological time blocks (Morning Focus / Afternoon & Compliance / Evening Recharge), task row badges.
- 4.2 My Tasks: List / Board (Kanban) / Calendar switcher; filter bar (domains + Important/Elastic/Uncategorized);
  Kanban columns Not Started -> Active -> Done -> Rolled-Forward; calendar timetable with shaded energy windows.
- 4.3 Rolled-Forward (Slippage Radar): watchdog metrics (rolled count, cascade risk, reclaimed time);
  interventions for tasks pushed >=3x (Reschedule Today / Shrink to 15m / Drop-Delegate / Archive); cascade warnings.
- 4.4 Batch Triage: ingest uncategorized quick-adds & voice notes; bulk Assign Domain / Set Priority / Allow Elastic; inbox-zero.
- 4.5 Task Detail Drawer (Basesheet): lifecycle dropdown; inferred priority rationale; time & dynamics + elastic toggle;
  relational dependencies; deconstructed milestones with checkboxes + estimates; primary "Mark Completed & Release Blockers".
- 4.6 Settings: Domains CRUD (name, @shortcode, glyph, color); productivity calibration (focus window, elastic cushion);
  auditable rules engine toggles (cascade, clustering, rollforward watchdog, elastic compression).

---

## 5. Technical Architecture & Data Model

Stack: Next.js (App Router) + React; Tailwind + shadcn/ui; Lucide; Figtree; Supabase (Postgres);
Claude 3.5 Sonnet (Anthropic) for NL parse/decomposition/briefing; Web Speech API STT; Vercel Cron.

### 5.2 Schema (single-user rapid-test)

```sql
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    shortcode TEXT NOT NULL UNIQUE,
    color_hex TEXT NOT NULL,
    glyph_icon TEXT NOT NULL,
    morning_bias BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE task_status AS ENUM ('not_started','in_progress','done','rolled_forward');
CREATE TYPE task_importance AS ENUM ('important','medium','flexible');

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
    time_hint TEXT,
    duration_min INT DEFAULT 45,
    min_duration_min INT DEFAULT 15,
    is_elastic BOOLEAN DEFAULT true,
    rollforward_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_est_min INT DEFAULT 15,
    is_completed BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0
);

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocking_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (blocking_task_id, dependent_task_id)
);

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
- 6.1 NL capture & decomposition: detect `@domain`, parse time hint, set duration + elastic floor,
  generate 3-4 sub-milestones, reserve a morning-focus slot.
- 6.2 Cascade risk: if a prerequisite slips, dependent flags Cascade Risk; flexible prerequisite escalates to Urgent/Critical Path when the dependent has a fixed deadline.
- 6.3 Nightly rollforward (11:59 PM) + morning briefing (7:30 AM): roll uncompleted, increment count, re-anchor; synthesize top-3 vs 3h budget.

---

## 7. Release Milestones
- M0 Foundation & Design System - Complete
- M1 Core Mobile Suite - Complete
- M2 Desktop Basesheet Architecture - Complete
- M3 Onboarding & First-Load - Complete
- M4 Backend Implementation (Next.js actions, Supabase, Claude, Web Speech) - Next Phase
- M5 Dogfooding & Calibration - Next Phase
- M6 Google Calendar & Multi-User (Clerk, RLS) - Future

---

## 8. Success Metrics
1. Zero silent drops - 100% of midnight-uncompleted tasks on the Slippage Radar.
2. Frictionless capture - <5s from trigger to structured creation.
3. High briefing trust - operator runs the morning plan without an external calendar.
4. Cognitive calm - strict 60-30-10 density.
