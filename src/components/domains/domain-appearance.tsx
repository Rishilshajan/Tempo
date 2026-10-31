import {
  BriefcaseBusiness,
  Layers,
  Compass,
  Sparkles,
  ListChecks,
  Heart,
  PanelsTopLeft,
  Target,
  Code2,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Palette,
  Rocket,
  Globe,
  Users,
  House,
  Wallet,
  Dumbbell,
  Coffee,
  Music,
  Camera,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";

export const domainColors = [
  { id: "green", label: "Tempo green", value: "var(--primary)" },
  { id: "blue", label: "Blue", value: "#526d82" },
  { id: "teal", label: "Teal", value: "#367e80" },
  { id: "purple", label: "Purple", value: "#827099" },
  { id: "amber", label: "Amber", value: "#a77835" },
  { id: "forest", label: "Dark green", value: "#28483d" },
  { id: "coral", label: "Coral", value: "#b86351" },
  { id: "rose", label: "Rose", value: "#be456b" },
  { id: "pink", label: "Pink", value: "#b33b8d" },
  { id: "violet", label: "Violet", value: "#7753bd" },
  { id: "indigo", label: "Indigo", value: "#5260b5" },
  { id: "sky", label: "Sky blue", value: "#237ba5" },
  { id: "cyan", label: "Cyan", value: "#148691" },
  { id: "lime", label: "Lime", value: "#64832c" },
  { id: "orange", label: "Orange", value: "#bd6627" },
  { id: "slate", label: "Slate", value: "#64748b" },
] as const;

export const domainIcons = [
  { id: "briefcase", label: "Briefcase", component: BriefcaseBusiness },
  { id: "layers", label: "Layers", component: Layers },
  { id: "compass", label: "Compass", component: Compass },
  { id: "sparkles", label: "Sparkles", component: Sparkles },
  { id: "list-checks", label: "List checks", component: ListChecks },
  { id: "heart", label: "Heart", component: Heart },
  { id: "panels", label: "Workspace", component: PanelsTopLeft },
  { id: "target", label: "Target", component: Target },
  { id: "code", label: "Code", component: Code2 },
  { id: "book", label: "Book", component: BookOpen },
  { id: "education", label: "Education", component: GraduationCap },
  { id: "idea", label: "Idea", component: Lightbulb },
  { id: "design", label: "Design", component: Palette },
  { id: "rocket", label: "Rocket", component: Rocket },
  { id: "globe", label: "Globe", component: Globe },
  { id: "team", label: "Team", component: Users },
  { id: "home", label: "Home", component: House },
  { id: "finance", label: "Finance", component: Wallet },
  { id: "fitness", label: "Fitness", component: Dumbbell },
  { id: "coffee", label: "Coffee", component: Coffee },
  { id: "music", label: "Music", component: Music },
  { id: "camera", label: "Camera", component: Camera },
  { id: "nature", label: "Nature", component: Leaf },
  { id: "security", label: "Security", component: ShieldCheck },
] as const;

export type DomainAppearance = Pick<Doc<"domains">, "name" | "color" | "icon">;
export type DomainSummary = Pick<
  Doc<"domains">,
  "_id" | "name" | "purpose" | "color" | "icon"
>;

export function DomainLabel({
  name,
  color,
  icon,
  tonedIcon = false,
}: DomainAppearance & { tonedIcon?: boolean }) {
  const Icon =
    domainIcons.find((option) => option.id === icon)?.component ??
    BriefcaseBusiness;
  const selectedColor =
    domainColors.find((option) => option.id === color)?.value ??
    "var(--primary)";
  return (
    <>
      {tonedIcon ? (
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded"
          style={{
            backgroundColor: `color-mix(in srgb, ${selectedColor} 14%, transparent)`,
          }}
        >
          <Icon
            className="size-3.5"
            style={{ color: selectedColor }}
            aria-hidden="true"
          />
        </span>
      ) : (
        <Icon
          className="size-4 shrink-0"
          style={{ color: selectedColor }}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{name}</span>
    </>
  );
}

export function DomainBadge({ name, color, icon }: DomainAppearance) {
  const Icon =
    domainIcons.find((option) => option.id === icon)?.component ??
    BriefcaseBusiness;
  const selectedColor =
    domainColors.find((option) => option.id === color)?.value ??
    "var(--primary)";
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium">
      <Icon
        className="size-3.5 shrink-0"
        style={{ color: selectedColor }}
        aria-hidden="true"
      />
      <span className="truncate">{name.trim() || "New Domain"}</span>
    </span>
  );
}
