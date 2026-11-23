/**
 * TEMPO-001 — Landing hero, feature and workflow showcases, and footer.
 * Code map: src/components/code-map.md
 */
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  Layers3,
  ListChecks,
  Plus,
  Route,
} from "lucide-react";
import { PreviewTask, ProductPreview } from "./product-preview";
import { SignupLink, Wordmark } from "./site-header";

/**
 * TEMPO-001-F05 — HeroSection
 * Purpose: Pairs the landing headline and actions with the Today preview.
 * Used by: LandingPage.
 * Trigger: Visitor opens /.
 */
export function HeroSection() {
  return (
    <section
      className="landing-container landing-hero"
      aria-labelledby="hero-heading"
    >
      <div className="landing-hero-copy">
        <h1 id="hero-heading">
          Your work,
          <br />
          <span className="landing-highlight">in rhythm.</span>
        </h1>
        <p className="landing-hero-description">
          Every task, every commitment, every domain.
          <br className="landing-desktop-break" /> One place to keep it all
          moving.
        </p>
        <div className="landing-hero-actions">
          <SignupLink />
          <a href="#how-it-works" className="landing-secondary-link">
            See how it works <ArrowDown size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
      <ProductPreview />
    </section>
  );
}

/**
 * TEMPO-001-F06 — DomainIllustration
 * Purpose: Displays illustrative work domains.
 * Used by: BenefitsSection.
 * Trigger: Feature cards render.
 */
function DomainIllustration() {
  return (
    <div className="landing-domain-illustration" aria-hidden="true">
      {[
        {
          name: "Acme",
          detail: "Company & team",
          dot: "landing-work-dot",
          count: "03",
        },
        {
          name: "Studio",
          detail: "Projects & ideas",
          dot: "landing-studio-dot",
          count: "02",
        },
        {
          name: "Personal",
          detail: "Life beyond work",
          dot: "landing-personal-dot",
          count: "04",
        },
      ].map((domain) => (
        <div key={domain.name}>
          <i className={domain.dot} />
          <span>
            <strong>{domain.name}</strong>
            <small>{domain.detail}</small>
          </span>
          <span className="landing-domain-count">{domain.count}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * TEMPO-001-F07 — BenefitsSection
 * Purpose: Displays the three feature cards.
 * Used by: LandingPage.
 * Trigger: Route renders; #features scrolls to this section.
 */
export function BenefitsSection() {
  return (
    <section
      id="features"
      className="landing-container landing-section"
      aria-label="Features"
    >
      <div className="landing-benefit-grid">
        <article className="landing-benefit-card">
          <span className="landing-feature-icon">
            <Layers3 size={20} />
          </span>
          <h3>All your work, together</h3>
          <p>
            Manage tasks across companies, projects, and personal
            responsibilities without switching between separate task lists.
          </p>
          <DomainIllustration />
        </article>
        <article className="landing-benefit-card">
          <span className="landing-feature-icon">
            <Route size={20} />
          </span>
          <h3>Know what comes next</h3>
          <p>
            Bring priorities, schedules, deadlines, and upcoming commitments
            into one organized view.
          </p>
          <div className="landing-benefit-illustration" aria-hidden="true">
            <span className="landing-mini-label">
              A LITTLE STRUCTURE FOR YOUR DAY
            </span>
            <PreviewTask
              title="Team catch-up"
              domain="Acme"
              time="09:00 – 09:30"
              compact
            />
            <div className="landing-mini-focus">
              <span>10:00 – 11:30</span>
              <strong>Room to focus.</strong>
            </div>
            <PreviewTask
              title="Book a weekend escape"
              domain="Personal"
              time="Flexible"
              compact
            />
          </div>
        </article>
        <article className="landing-benefit-card">
          <span className="landing-feature-icon">
            <CheckCheck size={20} />
          </span>
          <h3>Keep unfinished work visible</h3>
          <p>
            Carry unfinished tasks forward without losing visibility into their
            original deadlines.
          </p>
          <div className="landing-benefit-illustration" aria-hidden="true">
            <span className="landing-mini-label">STILL ON YOUR RADAR</span>
            <PreviewTask
              title="Send the project proposal"
              domain="Studio"
              time="Due Oct 28"
              rolled
              compact
            />
            <span className="landing-carry-note">
              <ArrowRight size={13} /> A fresh day. The same commitment.
            </span>
            <div className="landing-mini-completed">
              <Check size={13} /> Pick it up when you’re ready.
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/**
 * TEMPO-001-F08 — HowItWorksSection
 * Purpose: Displays the four workflow steps.
 * Used by: LandingPage.
 * Trigger: Route renders; #how-it-works scrolls here.
 */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="landing-container landing-section"
      aria-labelledby="how-heading"
    >
      <h2 id="how-heading" className="landing-section-heading">
        How Tempo works
      </h2>
      <p className="landing-section-intro">
        Give everything a place. Then take it one thing at a time.
      </p>
      <div className="landing-steps-grid">
        <article className="landing-step-card">
          <div className="landing-step-top">
            <span>01</span>
            <Layers3 size={19} aria-hidden="true" />
          </div>
          <h3>Create your domains</h3>
          <p>Organize work by company, project, or area of responsibility.</p>
          <div className="landing-step-illustration" aria-hidden="true">
            <div className="landing-domain-form">
              <span>DOMAIN NAME</span>
              <strong>My creative studio</strong>
              <span>PURPOSE</span>
              <p>A home for ideas and the work that brings them to life.</p>
              <div className="landing-color-swatches">
                <i />
                <i />
                <i />
                <i />
                <span>Your work. Your colors.</span>
              </div>
            </div>
          </div>
        </article>
        <article className="landing-step-card">
          <div className="landing-step-top">
            <span>02</span>
            <Plus size={20} aria-hidden="true" />
          </div>
          <h3>Add and plan your tasks</h3>
          <p>Set priorities, dates, schedules, subtasks, and recurrence.</p>
          <div className="landing-step-illustration" aria-hidden="true">
            <div className="landing-plan-form">
              <strong>Bring the next idea to life</strong>
              <div>
                <span>Priority</span>
                <span className="landing-high-priority">High</span>
              </div>
              <div>
                <span>Schedule</span>
                <span className="landing-schedule-choice">
                  Fixed <span>Flexible</span>
                </span>
              </div>
              <div>
                <span>Subtasks</span>
                <span className="landing-subtask-sample">
                  <Check size={12} /> Sketch the first concept
                </span>
              </div>
            </div>
          </div>
        </article>
        <article className="landing-step-card">
          <div className="landing-step-top">
            <span>03</span>
            <Route size={20} aria-hidden="true" />
          </div>
          <h3>Navigate your day your way</h3>
          <p>Switch between Today, Calendar, List, and Kanban views.</p>
          <div className="landing-step-illustration" aria-hidden="true">
            <div className="landing-view-tabs">
              <span>Today</span>
              <span>Calendar</span>
              <span>List</span>
              <span>Kanban</span>
            </div>
            <div className="landing-mini-board">
              {["Not started", "In progress", "Done"].map((label, index) => (
                <div key={label}>
                  <span>{label}</span>
                  <div className={index === 1 ? "landing-board-focus" : ""}>
                    <i />
                    <i />
                  </div>
                  {index === 0 && (
                    <div>
                      <i />
                      <i />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="landing-step-card">
          <div className="landing-step-top">
            <span>04</span>
            <ListChecks size={20} aria-hidden="true" />
          </div>
          <h3>Track your progress</h3>
          <p>
            Complete tasks, record notes, connect related work, and review
            activity.
          </p>
          <div className="landing-step-illustration" aria-hidden="true">
            <PreviewTask
              title="Shape the first concept"
              domain="Studio"
              time="Completed today"
              done
              compact
            />
            <PreviewTask
              title="Write the project notes"
              domain="Studio"
              time="Completed today"
              done
              compact
            />
            <div className="landing-activity-sample">
              <span /> You completed “Shape the first concept”
              <small>Today, 11:30</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/**
 * TEMPO-001-F09 — LandingFooter
 * Purpose: Displays branding, navigation, and copyright.
 * Used by: LandingPage.
 * Trigger: Visitor reaches the landing footer.
 */
export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div>
          <Wordmark />
          <p>Your work. A little more in rhythm.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/login" prefetch={false}>
            Log in
          </Link>
          <Link href="/signup" prefetch={false}>
            Get started <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </nav>
        <span className="landing-copyright">
          © {new Date().getFullYear()} Tempo
        </span>
      </div>
    </footer>
  );
}
