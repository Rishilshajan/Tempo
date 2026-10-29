import { ArrowUpRight, Check, ChevronDown, Circle, Clock3, MoreHorizontal, Sun } from "lucide-react";
import styles from "./landing.module.css";

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
export function PreviewTask({ title, domain, time, priority, rolled, done, compact }: PreviewTaskProps) {
  return (
    <div className={`${styles.previewTask} ${compact ? styles.compactTask : ""} ${done ? styles.doneTask : ""}`}>
      <span className={styles.taskCheck} aria-hidden="true">{done ? <Check size={12} /> : <Circle size={14} />}</span>
      <div className={styles.taskContent}>
        <div className={styles.taskTitle}>{title}</div>
        <div className={styles.taskMeta}>
          <span className={styles.domainLabel}><i className={domain === "Personal" ? styles.personalDot : domain === "Studio" ? styles.studioDot : styles.workDot} />{domain}</span>
          <span>{time}</span>
          {rolled && <span className={styles.rollBadge}>Roll forward</span>}
        </div>
      </div>
      {priority && <span className={priority === "High" ? styles.highPriority : styles.normalPriority}>{priority}</span>}
    </div>
  );
}

export function ProductPreview() {
  return (
    <figure className={styles.productFigure} aria-label="Illustrative Tempo Today dashboard with sample tasks">
      <div className={styles.previewWindow}>
        <div className={styles.previewTopbar}>
          <span className={styles.previewBrand}><Sun size={14} /> Today <ChevronDown size={11} /></span>
          <span className={styles.previewDate}>Thursday, October 29</span>
          <span className={styles.previewAvatar}>J</span>
        </div>
        <div className={styles.previewBody}>
          <div className={styles.previewGreeting}><div><span className={styles.eyebrow}>A LITTLE CLARITY FOR YOUR DAY</span><h2>Let’s find your rhythm.</h2></div><Sun size={26} strokeWidth={1.3} /></div>
          <div className={styles.domainPills}><span className={styles.activePill}>All domains</span><span><i className={styles.workDot} />Acme</span><span><i className={styles.studioDot} />Studio</span><span><i className={styles.personalDot} />Personal</span></div>
          <div className={styles.previewSectionLabel}><span>NEEDS ATTENTION</span><span>01</span></div>
          <PreviewTask title="Send the project proposal" domain="Studio" time="Due Oct 28" priority="High" rolled />
          <div className={styles.previewSectionLabel}><span>YOUR TIMELINE</span><span>24-HOUR VIEW</span></div>
          <div className={styles.timeline}>
            <div className={styles.timelineRow}><time>00:00</time><span className={styles.quietTime}>Your day, at your pace</span></div>
            <div className={styles.timelineRow}><time>09:00</time><div className={styles.timelineTask}><span className={styles.timelineTaskLabel}>Product team catch-up <MoreHorizontal size={14} /></span><span className={styles.taskMeta}><span className={styles.domainLabel}><i className={styles.workDot} />Acme</span>09:00 – 09:30</span></div></div>
            <div className={styles.timelineRow}><time>10:00</time><div className={`${styles.timelineTask} ${styles.focusTask}`}><span className={styles.timelineTaskLabel}>Make room for deep work <ArrowUpRight size={14} /></span><span className={styles.taskMeta}><span className={styles.domainLabel}><i className={styles.studioDot} />Studio</span>10:00 – 11:30</span></div></div>
            <div className={styles.timelineRow}><time>12:00</time><span className={styles.freeTime}>A little breathing room.</span></div>
            <div className={styles.timelineRow}><time>23:00</time><span className={styles.quietTime}>End the day on your terms</span></div>
          </div>
          <div className={styles.previewSectionLabel}><span>FLEXIBLE · WHEN YOU HAVE A MOMENT</span><span>01</span></div>
          <PreviewTask title="Book a weekend escape" domain="Personal" time="No fixed time" />
        </div>
        <div className={styles.previewBottom}><span><Clock3 size={11} /> A plan with room for real life.</span><span>Tempo</span></div>
      </div>
      <figcaption className={styles.previewCaption}>A glimpse of Tempo · Illustrative preview with sample tasks</figcaption>
    </figure>
  );
}
