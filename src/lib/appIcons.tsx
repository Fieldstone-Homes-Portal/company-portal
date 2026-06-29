/**
 * Shared mapping from a PortalApp's `icon` string to a Lucide icon component.
 * Used by both the Toolbox tiles (AppTile) and the Home page's "recently
 * opened" tiles so the two stay visually consistent.
 */
import {
  Map,
  BarChart3,
  FileText,
  Wrench,
  Globe,
  Calculator,
  Users,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export const APP_ICON_MAP: Record<string, LucideIcon> = {
  map: Map,
  chart: BarChart3,
  file: FileText,
  tool: Wrench,
  globe: Globe,
  calculator: Calculator,
  users: Users,
  briefcase: Briefcase,
};

/** Resolve an icon key to a Lucide component, falling back to a generic tool. */
export function appIcon(key: string | null | undefined): LucideIcon {
  return APP_ICON_MAP[key || "tool"] || Wrench;
}
