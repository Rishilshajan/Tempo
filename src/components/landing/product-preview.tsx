/**
 * TEMPO-001 — Static sample task and Today illustrations; no live task operations.
 * Code map: src/components/code-map.md
 */
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  MoreHorizontal,
  Sun,
} from "lucide-react";

type PreviewTaskProps = {
  title: string;
  domain: string;
  time: string;
  priority?: string;
  rolled?: boolean;
  done?: boolean;
  compact?: boolean;
};

/** Illustrative sample data only. Intentionally has no task actions or controls. */
/**
 * TEMPO-001-F11 — PreviewTask
 * Purpose: Displays one illustrative task with optional status badges.
 * Used by: ProductPreview and landing showcase cards.
 * Trigger: Parent illustration renders.
 */
export function PreviewTask({
  title,
  domain,
  time,
  priority,
  rolled,
  done,
  compact,
}: PreviewTaskProps) {
  return (
    <div
      className={`landing-preview-task ${compact ? "landing-compact-task" : ""} ${done ? "landing-done-task" : ""}`}
    >
      <span className="landing-task-check" aria-hidden="true">
        {done ? <Check size={12} /> : <Circle size={14} />}
      </span>
      <div className="landing-task-content">
        <div className="landing-task-title">{title}</div>
        <div className="landing-task-meta">
          <span className="landing-domain-label">
            <i
              className={
                domain === "Personal"
                  ? "landing-personal-dot"
                  : domain === "Studio"
                    ? "landing-studio-dot"
                    : "landing-work-dot"
              }
            />
            {domain}
          </span>
          <span>{time}</span>
          {rolled && <span className="landing-roll-badge">Roll forward</span>}
        </div>
      </div>
      {priority && (
        <span
          className={
            priority === "High"
              ? "landing-high-priority"
              : "landing-normal-priority"
          }
        >
          {priority}
        </span>
      )}
    </div>
  );
}

/**
 * TEMPO-001-F12 — ProductPreview
 * Purpose: Displays the complete illustrative Today dashboard.
 * Used by: HeroSection.
 * Trigger: Landing hero renders.
 */
export function ProductPreview() {
  return (
    <figure
      className="landing-product-figure"
      aria-label="Illustrative Tempo Today dashboard with sample tasks"
    >
      <div className="landing-preview-window">
        <div className="landing-preview-topbar">
          <span className="landing-preview-brand">
            <Sun size={14} /> Today <ChevronDown size={11} />
          </span>
          <span className="landing-preview-date">Thursday, October 29</span>
          <span className="landing-preview-avatar">J</span>
        </div>
        <div className="landing-preview-body">
          <div className="landing-preview-greeting">
            <div>
              <span className="landing-eyebrow">
                A LITTLE CLARITY FOR YOUR DAY
              </span>
              <h2>Let’s find your rhythm.</h2>
            </div>
            <Sun size={26} strokeWidth={1.3} />
          </div>
          <div className="landing-domain-pills">
            <span className="landing-active-pill">All domains</span>
            <span>
              <i className="landing-work-dot" />
              Acme
            </span>
            <span>
              <i className="landing-studio-dot" />
              Studio
            </span>
            <span>
              <i className="landing-personal-dot" />
              Personal
            </span>
          </div>
          <div className="landing-preview-section-label">
            <span>NEEDS ATTENTION</span>
            <span>01</span>
          </div>
          <PreviewTask
            title="Send the project proposal"
            domain="Studio"
            time="Due Oct 28"
            priority="High"
            rolled
          />
          <div className="landing-preview-section-label">
            <span>YOUR TIMELINE</span>
            <span>24-HOUR VIEW</span>
          </div>
          <div className="landing-timeline">
            <div className="landing-timeline-row">
              <time>00:00</time>
              <span className="landing-quiet-time">Your day, at your pace</span>
            </div>
            <div className="landing-timeline-row">
              <time>09:00</time>
              <div className="landing-timeline-task">
                <span className="landing-timeline-task-label">
                  Product team catch-up <MoreHorizontal size={14} />
                </span>
                <span className="landing-task-meta">
                  <span className="landing-domain-label">
                    <i className="landing-work-dot" />
                    Acme
                  </span>
                  09:00 – 09:30
                </span>
              </div>
            </div>
            <div className="landing-timeline-row">
              <time>10:00</time>
              <div className="landing-timeline-task landing-focus-task">
                <span className="landing-timeline-task-label">
                  Make room for deep work <ArrowUpRight size={14} />
                </span>
                <span className="landing-task-meta">
                  <span className="landing-domain-label">
                    <i className="landing-studio-dot" />
                    Studio
                  </span>
                  10:00 – 11:30
                </span>
              </div>
            </div>
            <div className="landing-timeline-row">
              <time>12:00</time>
              <span className="landing-free-time">
                A little breathing room.
              </span>
            </div>
            <div className="landing-timeline-row">
              <time>23:00</time>
              <span className="landing-quiet-time">
                End the day on your terms
              </span>
            </div>
          </div>
          <div className="landing-preview-section-label">
            <span>FLEXIBLE · WHEN YOU HAVE A MOMENT</span>
            <span>01</span>
          </div>
          <PreviewTask
            title="Book a weekend escape"
            domain="Personal"
            time="No fixed time"
          />
        </div>
        <div className="landing-preview-bottom">
          <span>
            <Clock3 size={11} /> A plan with room for real life.
          </span>
          <span>Tempo</span>
        </div>
      </div>
      <figcaption className="landing-preview-caption">
        A glimpse of Tempo · Illustrative preview with sample tasks
      </figcaption>
    </figure>
  );
}
