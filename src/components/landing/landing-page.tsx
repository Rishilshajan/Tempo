import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, Check, CheckCheck, Layers3, ListChecks, Plus, Route, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PreviewTask, ProductPreview } from "./product-preview";
import { MobileNavigation } from "./mobile-navigation";
import styles from "./landing.module.css";

function Wordmark() {
  return <Link href="/" aria-label="Tempo home" className={styles.wordmark}><Image src="/Tempo_Logo_original.png" alt="Tempo" width={866} height={288} className={styles.brandImage} priority /></Link>;
}

function SignupLink({ children = "Get started for free" }: { children?: React.ReactNode }) {
  return <Link href="/signup" prefetch={false} className={cn(buttonVariants(), styles.cta)}>{children}<ArrowRight size={16} aria-hidden="true" /></Link>;
}

export function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <Wordmark />
        <nav aria-label="Main navigation" className={styles.desktopNav}><a href="#features">Features</a><a href="#how-it-works">How it works</a></nav>
        <div className={styles.headerActions}><Link href="/login" prefetch={false} className={styles.login}>Log in</Link><SignupLink>Get started</SignupLink></div>
        <MobileNavigation />
      </div>
    </header>
  );
}

export function HeroSection() {
  return (
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-heading">
      <div className={styles.heroCopy}>
        <p className={styles.heroEyebrow}><span /> A LITTLE LESS CHAOS. A LITTLE MORE CLARITY.</p>
        <h1 id="hero-heading">Your work,<br /><span className={styles.highlight}>in rhythm.</span></h1>
        <p className={styles.heroDescription}>Every task, every commitment, every domain.<br className={styles.desktopBreak} /> One place to keep it all moving.</p>
        <div className={styles.heroActions}><SignupLink /><a href="#how-it-works" className={styles.secondaryLink}>See how it works <ArrowDown size={15} aria-hidden="true" /></a></div>
        <div className={styles.heroFootnote}><span><Layers3 size={14} /> All your work, together</span><span><Route size={14} /> At your own pace</span></div>
      </div>
      <ProductPreview />
    </section>
  );
}

function DomainIllustration() {
  return <div className={styles.domainIllustration} aria-hidden="true">{[{ name: "Acme", detail: "Company & team", dot: styles.workDot, count: "03" }, { name: "Studio", detail: "Projects & ideas", dot: styles.studioDot, count: "02" }, { name: "Personal", detail: "Life beyond work", dot: styles.personalDot, count: "04" }].map((domain) => <div key={domain.name}><i className={domain.dot} /><span><strong>{domain.name}</strong><small>{domain.detail}</small></span><span className={styles.domainCount}>{domain.count}</span></div>)}</div>;
}

export function BenefitsSection() {
  return (
    <section id="features" className={`${styles.container} ${styles.section}`} aria-labelledby="benefits-heading">
      <p className={styles.eyebrow}>LESS MENTAL CLUTTER. MORE MOMENTUM.</p>
      <h2 id="benefits-heading" className={styles.sectionHeading}>Designed for deliberate focus.</h2>
      <p className={styles.sectionIntro}>A calm command center for everything on your plate.<br />Not another place to feel behind.</p>
      <div className={styles.benefitGrid}>
        <article className={styles.benefitCard}><span className={styles.featureIcon}><Layers3 size={20} /></span><h3>All your work, together</h3><p>Manage tasks across companies, projects, and personal responsibilities without switching between separate task lists.</p><DomainIllustration /></article>
        <article className={styles.benefitCard}><span className={styles.featureIcon}><Route size={20} /></span><h3>Know what comes next</h3><p>Bring priorities, schedules, deadlines, and upcoming commitments into one organized view.</p><div className={styles.benefitIllustration} aria-hidden="true"><span className={styles.miniLabel}>A LITTLE STRUCTURE FOR YOUR DAY</span><PreviewTask title="Team catch-up" domain="Acme" time="09:00 – 09:30" compact /><div className={styles.miniFocus}><span>10:00 – 11:30</span><strong>Room to focus.</strong></div><PreviewTask title="Book a weekend escape" domain="Personal" time="Flexible" compact /></div></article>
        <article className={styles.benefitCard}><span className={styles.featureIcon}><CheckCheck size={20} /></span><h3>Keep unfinished work visible</h3><p>Carry unfinished tasks forward without losing visibility into their original deadlines.</p><div className={styles.benefitIllustration} aria-hidden="true"><span className={styles.miniLabel}>STILL ON YOUR RADAR</span><PreviewTask title="Send the project proposal" domain="Studio" time="Due Oct 28" rolled compact /><span className={styles.carryNote}><ArrowRight size={13} /> A fresh day. The same commitment.</span><div className={styles.miniCompleted}><Check size={13} /> Pick it up when you’re ready.</div></div></article>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className={`${styles.container} ${styles.section}`} aria-labelledby="how-heading">
      <p className={styles.eyebrow}>A SIMPLE WAY TO FIND YOUR FLOW</p>
      <h2 id="how-heading" className={styles.sectionHeading}>How Tempo works</h2>
      <p className={styles.sectionIntro}>Give everything a place. Then take it one thing at a time.</p>
      <div className={styles.stepsGrid}>
        <article className={styles.stepCard}><div className={styles.stepTop}><span>01</span><Layers3 size={19} aria-hidden="true" /></div><h3>Create your domains</h3><p>Organize work by company, project, or area of responsibility.</p><div className={styles.stepIllustration} aria-hidden="true"><div className={styles.domainForm}><span>DOMAIN NAME</span><strong>My creative studio</strong><span>PURPOSE</span><p>A home for ideas and the work that brings them to life.</p><div className={styles.colorSwatches}><i /><i /><i /><i /><span>Your work. Your colors.</span></div></div></div></article>
        <article className={styles.stepCard}><div className={styles.stepTop}><span>02</span><Plus size={20} aria-hidden="true" /></div><h3>Add and plan your tasks</h3><p>Set priorities, dates, schedules, subtasks, and recurrence.</p><div className={styles.stepIllustration} aria-hidden="true"><div className={styles.planForm}><strong>Bring the next idea to life</strong><div><span>Priority</span><span className={styles.highPriority}>High</span></div><div><span>Schedule</span><span className={styles.scheduleChoice}>Fixed <span>Flexible</span></span></div><div><span>Subtasks</span><span className={styles.subtaskSample}><Check size={12} /> Sketch the first concept</span></div></div></div></article>
        <article className={styles.stepCard}><div className={styles.stepTop}><span>03</span><Route size={20} aria-hidden="true" /></div><h3>Navigate your day your way</h3><p>Switch between Today, Calendar, List, and Kanban views.</p><div className={styles.stepIllustration} aria-hidden="true"><div className={styles.viewTabs}><span>Today</span><span>Calendar</span><span>List</span><span>Kanban</span></div><div className={styles.miniBoard}>{["Not started", "In progress", "Done"].map((label, index) => <div key={label}><span>{label}</span><div className={index === 1 ? styles.boardFocus : ""}><i /><i /></div>{index === 0 && <div><i /><i /></div>}</div>)}</div></div></article>
        <article className={styles.stepCard}><div className={styles.stepTop}><span>04</span><ListChecks size={20} aria-hidden="true" /></div><h3>Track your progress</h3><p>Complete tasks, record notes, connect related work, and review activity.</p><div className={styles.stepIllustration} aria-hidden="true"><PreviewTask title="Shape the first concept" domain="Studio" time="Completed today" done compact /><PreviewTask title="Write the project notes" domain="Studio" time="Completed today" done compact /><div className={styles.activitySample}><span /> You completed “Shape the first concept”<small>Today, 11:30</small></div></div></article>
      </div>
    </section>
  );
}

export function FinalCTASection() {
  return <section className={`${styles.container} ${styles.finalSection}`} aria-labelledby="cta-heading"><div className={styles.finalCard}><Sparkles size={25} strokeWidth={1.4} aria-hidden="true" /><h2 id="cta-heading">Make space in your mind <br />for the work that matters.</h2><p>Bring your commitments together and move through<br className={styles.desktopBreak} /> your day with clarity.</p><SignupLink /></div></section>;
}

export function LandingFooter() {
  return <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}><div><Wordmark /><p>Your work. A little more in rhythm.</p></div><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/login" prefetch={false}>Log in</Link><Link href="/signup" prefetch={false}>Get started <ArrowRight size={12} aria-hidden="true" /></Link></nav><span className={styles.copyright}>© {new Date().getFullYear()} Tempo</span></div></footer>;
}
