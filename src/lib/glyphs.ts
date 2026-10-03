import {
  Rocket,
  Briefcase,
  Code,
  BarChart3,
  Heart,
  Sparkles,
  Megaphone,
  Video,
  Tag,
  type LucideIcon,
} from "lucide-react";

export const GLYPHS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "rocket", label: "Rocket", icon: Rocket },
  { key: "briefcase", label: "Briefcase", icon: Briefcase },
  { key: "code", label: "Code", icon: Code },
  { key: "chart", label: "Chart", icon: BarChart3 },
  { key: "heart", label: "Heart", icon: Heart },
  { key: "sparkles", label: "Sparkles", icon: Sparkles },
  { key: "megaphone", label: "Megaphone", icon: Megaphone },
  { key: "video", label: "Video", icon: Video },
];

const MAP: Record<string, LucideIcon> = Object.fromEntries(
  GLYPHS.map((g) => [g.key, g.icon]),
);

export function glyphIcon(key?: string | null): LucideIcon {
  return (key && MAP[key]) || Tag;
}

export function glyphLabel(key?: string | null): string {
  return GLYPHS.find((g) => g.key === key)?.label ?? "Tag";
}
