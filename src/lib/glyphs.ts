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
  BookOpen,
  GraduationCap,
  FlaskConical,
  Shield,
  UsersRound,
  Building2,
  Leaf,
  Brain,
  Dumbbell,
  Plane,
  House,
  ShoppingBag,
  Wrench,
  Music2,
  Coffee,
  ClipboardList,
  Database,
  CalendarDays,
  Landmark,
  CircleDollarSign,
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
  { key: "book-open", label: "Book", icon: BookOpen },
  { key: "graduation-cap", label: "Education", icon: GraduationCap },
  { key: "flask-conical", label: "Research", icon: FlaskConical },
  { key: "shield", label: "Security", icon: Shield },
  { key: "users", label: "Team", icon: UsersRound },
  { key: "building", label: "Organization", icon: Building2 },
  { key: "leaf", label: "Environment", icon: Leaf },
  { key: "brain", label: "Ideas", icon: Brain },
  { key: "dumbbell", label: "Fitness", icon: Dumbbell },
  { key: "plane", label: "Travel", icon: Plane },
  { key: "house", label: "Home", icon: House },
  { key: "shopping-bag", label: "Shopping", icon: ShoppingBag },
  { key: "wrench", label: "Operations", icon: Wrench },
  { key: "music", label: "Music", icon: Music2 },
  { key: "coffee", label: "Personal", icon: Coffee },
  { key: "clipboard-list", label: "Planning", icon: ClipboardList },
  { key: "database", label: "Data", icon: Database },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "landmark", label: "Finance", icon: Landmark },
  { key: "dollar", label: "Budget", icon: CircleDollarSign },
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
