---
name: Sage Focus
colors:
  surface: '#FFFFFF'
  surface-dim: '#cdded5'
  surface-bright: '#ecfef4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e6f8ee'
  surface-container: '#e0f2e9'
  surface-container-high: '#dbece3'
  surface-container-highest: '#d5e7dd'
  on-surface: '#101e19'
  on-surface-variant: '#3f4943'
  inverse-surface: '#24342d'
  inverse-on-surface: '#e3f5eb'
  outline: '#6f7a73'
  outline-variant: '#bec9c1'
  surface-tint: '#156b4d'
  primary: '#11694a'
  on-primary: '#ffffff'
  primary-container: '#338262'
  on-primary-container: '#f5fff7'
  inverse-primary: '#88d6b1'
  secondary: '#206d1f'
  on-secondary: '#ffffff'
  secondary-container: '#a3f394'
  on-secondary-container: '#257123'
  tertiary: '#006a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#258450'
  on-tertiary-container: '#f6fff4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f3cc'
  primary-fixed-dim: '#88d6b1'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005138'
  secondary-fixed: '#a5f697'
  secondary-fixed-dim: '#8ad97d'
  on-secondary-fixed: '#002201'
  on-secondary-fixed-variant: '#005308'
  tertiary-fixed: '#99f6b7'
  tertiary-fixed-dim: '#7ed99c'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#00522c'
  background: '#ecfef4'
  on-background: '#101e19'
  surface-variant: '#d5e7dd'
  bg-canvas: '#F7F6F2'
  border-subtle: '#E7E5DF'
  text-muted: '#5B6B62'
  status-urgent: '#F0705A'
  status-medium: '#F2B24C'
  status-ontrack: '#5DB87E'
  status-rolled: '#7C87D6'
  table-header: '#EEF3F0'
  code-bg: '#1F2B26'
  code-text: '#E8EFE9'
typography:
  headline-xl:
    fontFamily: Figtree
    fontSize: 2.6rem
    fontWeight: '800'
    lineHeight: 3.1rem
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Figtree
    fontSize: 2rem
    fontWeight: '800'
    lineHeight: 2.4rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Figtree
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Figtree
    fontSize: 1.15rem
    fontWeight: '700'
    lineHeight: 1.6rem
    letterSpacing: -0.01em
  body-lead:
    fontFamily: Figtree
    fontSize: 1.08rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Figtree
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.65rem
  body-sm:
    fontFamily: Figtree
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.4rem
  label-md:
    fontFamily: Figtree
    fontSize: 0.8125rem
    fontWeight: '600'
    lineHeight: 1.2rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Figtree
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.9rem
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1.25rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system embodies a calm, disciplined, and cognitively gentle productivity ecosystem designed for founders, knowledge workers, and multi-venture operators managing complex personal and work commitments. It resolves task-induced anxiety by transforming the task list into an ambient delegation partner: vigilant, reassuring, and structurally transparent.

The design movement synthesizes **Modern Organic Minimalism** with the systematic clarity of modern application architecture. Surfaces feel tactile and grounded—eschewing sterile cold-tech grays in favor of warm paper-like backdrops, herbal greens, and soft earthy neutrals. 

Key attributes:
- **Calm Authority:** Eliminates panic-driven red alerts. Urgency is signaled using warm, motivating corals and amber tones rather than alarming stop-sign reds.
- **Cognitive Ease (60-30-10 Rule):** 60% soothing warm neutral backdrop (`#F7F6F2`), 30% crisp structured surface and sage brand infrastructure, and only 10% energizing or status-critical color to guide eyes directly to what matters.
- **Vigilant & Explicit:** Visual cues communicate agentic reasoning clearly—revealing inferred dependencies, elastic time estimates, and accumulated slippage without visual chaos.

## Colors

The color palette centers on biological balance: botanical tones provide grounding, while energetic chartreuse and corals inject life without causing panic.

### Semantic Color Application
- **Primary (`#4C9A78` - Sage):** Represents stability, agency, and steady accomplishment. Used for primary interactive actions, high-level headers, active navigation tabs, and focal identity markers.
- **Secondary (`#7BC96F` - Lime Accent):** An energizing spark that captures forward momentum. Used sparingly (under 10% visual surface) for voice/NL triggers, active recording rings, and morning briefing highlights.
- **Tertiary (`#5DB87E` - Calm Green):** Indicates on-track status, completed sub-tasks, and healthy calendar density.
- **Neutral (`#22312B` - Slate Ink):** A deep, green-tinted charcoal serving as the dominant text ink. Softer and less abrasive to the retina than pure black (`#000000`), it maintains rich contrast against both canvas and surface layers.

### Status Indicators
- **Urgent / ASAP (`#F0705A` - Warm Coral):** Alerts requiring prompt attention; warmer and more motivating than conventional error red.
- **Medium Priority (`#F2B24C` - Soft Amber):** Indicates impending cluster bottlenecks or soft afternoon deadlines.
- **Rolled-Forward / Deferred (`#7C87D6` - Muted Periwinkle):** Surfaces slippage distinctly from new tasks, highlighting deferred items without shame.

## Typography

Typography relies on **Figtree**, a geometric yet humanist sans-serif that combines clean technical precision with friendly roundness. Its open counters and clean geometry ensure clarity on dense task cards and high-density calendar grids.

### Editorial Hierarchy & Rhythm
- **Display & Section Titles:** Emphasize weight (`700` and `800`) paired with subtle negative tracking (`-0.02em` to `-0.03em`) to anchor dashboards firmly.
- **Body Text:** Uses a comfortable `1.65` relative line-height to reduce visual crowding across multi-item task descriptions.
- **Micro-Data & Badges:** Rendered in small (`11px` to `13px`) medium/semibold weights with positive letter-spacing (`0.01em` to `0.03em`) to maintain legibility when set inside pill backgrounds and status chips.
- **Monospace Elements:** Code snippets, time-tracking totals, and programmatic timestamps default to system monospaced stacks (`ui-monospace`, `SFMono-Regular`, `Menlo`, `monospace`) rendered cleanly at `13px`.

## Layout & Spacing

The layout is built around a content-focused grid engineered for multi-tasking density and responsive flexibility across desktop, tablet, and mobile PWA viewports.

### Shell Architecture
- **Desktop (≥ 1024px):** Fixed left navigation sidebar (240px) pinned to canvas, responsive fluid 3-column workspace (List, Kanban board, or Calendar view), and an overlayable right-hand detail drawer (420px max-width) using `gutter-lg` (24px) spacing.
- **Tablet (681px – 1023px):** Collapsible sidebar rail (64px icon navigation), 2-column or single-column main views with standard 16px gutters (`gutter`).
- **Mobile (≤ 680px):** Single-column presentation with fixed sticky bottom navigation bar (56px height + safe area insets), fixed floating quick-capture natural language input bar, and full-screen bottom sheet modals for task details.

### Spacing Philosophy
Consistent visual rhythm follows a 4px sub-grid with primary jumps at 8px, 16px, 24px, and 36px. Component padding is scaled to content priority:
- Compact chips and badges utilize tight `space-xs` (4px) to `space-sm` (8px) internal bounds.
- Task cards maintain generous `1.375rem` (22px) vertical and `1.5rem` (24px) horizontal padding to allow room for meta tags, dependencies, and action triggers without feeling cramped.

## Elevation & Depth

This design system avoids artificial drop shadows and glossy plastic skeumorphism. Depth is achieved via **organic ambient layering** and **text-tinted atmospheric diffusion**.

### Layering Rules
- **Canvas Base (`#F7F6F2`):** Ground level. Represents the surrounding environment.
- **Card & Sheet Surfaces (`#FFFFFF`):** Sits 1 level up. Every card, table block, and floating drawer rests on a crisp white surface bordered by a subtle 1px stroke of `var(--border-subtle)` (`#E7E5DF`).
- **Depth Shadows:** Shadows do not use generic black or cool slate. Instead, they are cast using the primary slate-green text hue (`rgba(34, 49, 43, ...)`), resulting in warm, naturalistic depth:
  - *Standard Surface Shadow:* `0 1px 3px rgba(34, 49, 43, 0.05), 0 8px 24px rgba(34, 49, 43, 0.04)`
  - *Active / Dragging / Floating Dialog:* `0 4px 12px rgba(34, 49, 43, 0.08), 0 16px 36px rgba(34, 49, 43, 0.08)`
- **Drawer & Modal Backdrop:** Translucent wash of the deep text tone: `rgba(34, 49, 43, 0.35)` with an 8px backdrop blur (`backdrop-filter: blur(8px)`).

## Shapes

The interface balances functional precision with friendly, approachable geometry through structured corner radii tiers:

- **Full Pills (`999px`):** Reserved strictly for interactive badges, category chips, status tags, floating voice indicators, and recommendation pills (`.rec`).
- **Cards & Primary Modules (`1rem` / `16px`):** Applied to individual task cards, morning briefing modules, popover dialogs, and kanban containers.
- **Inline Containers & Inputs (`0.75rem` / `12px`):** Applied to text field inputs, natural language capture bars, quick-action sheets, and tables.
- **Sub-elements & Micro-controls (`0.375rem` / `6px`):** Applied to inline code blocks, dependency chips, subtask checkboxes, and color swatch markers.

## Components

### Buttons
- **Primary:** Solid Sage (`#4C9A78`) background, white text (`#FFFFFF`), `12px` roundedness, font weight `600`. On hover, slightly shift lightness to `#3E8365`.
- **Secondary / Ghost:** Transparent background with `1px solid var(--border-subtle)`, text in Slate Ink (`#22312B`). On hover, surface shifts to `#EEF3F0`.
- **Agentic / Accent Action:** Fresh Lime gradient or solid (`#7BC96F`), dark slate text (`#22312B`), weight `700`. Used exclusively for AI parsing, "Plan My Day", and morning briefing triggers.

### Natural Language Quick-Add Bar with Voice Trigger
- Floating or docked command input styled with a `12px` radius, white surface, and ambient shadow.
- Houses a Lucide `Sparkles` icon on the left, an unbordered text input accepting fluid dates and hints ("Prepare Q3 report tomorrow 10am flexible 30m"), and a dedicated right-aligned microphone button (`Mic`).
- Activating voice switches the mic icon into a pulsing Lime (`#7BC96F`) circular waveform ripple indicating active browser Web Speech STT listening.

### Morning Briefing Card
- Distinctive container styled with a `16px` radius, white surface, and a prominent `4px` left accent border in brand Sage (`#4C9A78`) or energizing Lime (`#7BC96F`).
- Features a header combining a Lucide `Sunrise` or `Coffee` icon with a friendly morning greeting and an unhurried, priority-ranked summary generated by Claude.
- Contains an inline summary chip array (e.g., "3 High Priority", "1 Rolled Forward", "Zero Clashes").

### Rich Task Cards
- White surface, `1px solid var(--border-subtle)` outline, `16px` border radius.
- **Top Row:** Status progression icon (Lucide `CircleDashed` → `CircleDot` → `CircleCheck`), category tag pill, and rollforward warning chip if deferred (`History` + "3x").
- **Title & Details:** Figtree `700` task name, optional soft time hint (e.g., "before noon"), and dependency indicators (`blocks #14` or `waiting on #12`).
- **Elastic Task Indicator:** A Lucide `Minimize2` glyph indicating whether duration can collapse from 45 mins to an elastic 15-minute minimum when calendar clustering occurs.

### Status Chips & Priority Badges
- Fully rounded pills (`999px`), `6px 13px` padding, Figtree `600` at `13px`.
- **Urgent Badge:** Light coral tint background (`rgba(240, 112, 90, 0.12)`), text in `#F0705A`.
- **Medium Priority Badge:** Soft amber tint background (`rgba(242, 178, 76, 0.14)`), text in `#C78828`.
- **On-track / Flexible Badge:** Calm green tint background (`rgba(93, 184, 126, 0.14)`), text in `#388A56`.
- **Rolled-Forward Badge:** Muted periwinkle background (`rgba(124, 135, 214, 0.14)`), text in `#5560B0`.

### Checkboxes & Selection Controls
- Custom `18px × 18px` checkbox with `4px` border radius.
- Inactive state: `1.5px solid #5B6B62` on white.
- Completed state: Sage background (`#4C9A78`), displaying a crisp white Lucide `Check` icon. Triggers a soft strike-through on task text with a 150ms ease-out transition.

### Input Fields
- `12px` roundedness, `11px 14px` internal padding, `1px solid var(--border-subtle)`.
- Background `#FFFFFF`, placeholder text `#5B6B62` at 60% opacity.
- Focus state: `1.5px solid var(--primary)` with an ambient `0 0 0 3px rgba(76, 154, 120, 0.15)` ring.