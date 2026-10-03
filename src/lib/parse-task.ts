import type { Domain } from "@/db/schema";

export type ParsedTask = {
  title: string;
  domainId?: string;
  durationMin?: number;
  timeHint?: string;
};

/**
 * Lightweight, non-AI parser for the quick-add field. Extracts @domain,
 * a duration like "90m", and a time hint like "before 11am". Phase 4 replaces
 * this with an LLM call for true natural-language understanding.
 */
export function parseNaturalTask(input: string, domains: Domain[]): ParsedTask {
  let text = ` ${input.trim()} `;
  const result: ParsedTask = { title: input.trim() };

  // @domain -> match by tag
  const tag = text.match(/@([\w-]+)/i);
  if (tag) {
    const found = domains.find((d) => d.tag === tag[1].toLowerCase());
    if (found) result.domainId = found.id;
    text = text.replace(tag[0], " ");
  }

  // duration: "90m", "45 min", "2h"
  const dur = text.match(/\b(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins)\b/i);
  if (dur) {
    const n = Number(dur[1]);
    result.durationMin = /^h/i.test(dur[2]) ? n * 60 : n;
    text = text.replace(dur[0], " ");
  }

  // time hint: "before 11am", "by 2pm", "at 9:30"
  const time = text.match(
    /\b(before|by|after|around|at)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i,
  );
  if (time) {
    result.timeHint = time[0].trim();
    text = text.replace(time[0], " ");
  }

  const title = text
    .replace(/\bfor\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (title) result.title = title;

  return result;
}
