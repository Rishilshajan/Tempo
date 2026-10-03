import {
  Sun,
  CircleCheck,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** show in the mobile bottom tab bar */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/today", icon: Sun, mobile: true },
  { label: "My Tasks", href: "/my-tasks", icon: CircleCheck, mobile: true },
  { label: "Rolled-Forward", href: "/rolled", icon: History, mobile: true },
  // Batch Triage is still a stub - keep it out of the nav until it's real.
];

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
  mobile: true,
};
