import { Hammer, FlaskConical, Rocket, CircleCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The app lifecycle pipeline, in order. Single source of truth for stage
// labels, colors, icons, and the tooltip copy — used by the user-facing
// StageBadge below, the Manage Apps pipeline picker, and Access Studio.
//
// Stage is informational only: it tells users how mature an app is when
// they're about to click it. It never affects access.
export interface StageMeta {
  value: string; // matches the Prisma AppStage enum
  label: string;
  /** One-liner shown as the badge tooltip and under the admin picker. */
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the badge chip (bg + text + border). */
  badge: string;
}

export const APP_STAGES: StageMeta[] = [
  {
    value: "IN_DEV",
    label: "In Dev",
    description:
      "Under construction — actively being built. Expect changes, gaps, and rough edges.",
    icon: Hammer,
    // Dashed amber border for an under-construction feel.
    badge: "border border-dashed border-warning/50 bg-warning/10 text-warning",
  },
  {
    value: "VALIDATION",
    label: "Validation",
    description:
      "In testing — feature-complete and being validated with a pilot group. Feedback welcome.",
    icon: FlaskConical,
    badge: "border border-info/30 bg-info/10 text-info",
  },
  {
    value: "MVP",
    label: "Early Access",
    description:
      "MVP / early access — the core features work and are safe to rely on; more is on the way.",
    icon: Rocket,
    badge: "border border-success/30 bg-success/10 text-success",
  },
  {
    value: "DEPLOYED",
    label: "Deployed",
    description: "Fully released and supported.",
    icon: CircleCheck,
    // Deliberately quiet — deployed is the norm, not news.
    badge: "border border-fs-warm-gray bg-fs-warm-white text-fs-copper-light",
  },
];

export function stageMeta(stage: string): StageMeta {
  return APP_STAGES.find((s) => s.value === stage) ?? APP_STAGES[3];
}

/**
 * Pill badge showing an app's lifecycle stage, with a tooltip explaining it.
 *
 * DEPLOYED renders nothing by default (mature apps shouldn't carry noise);
 * pass `showDeployed` where seeing every stage matters (admin screens).
 */
export default function StageBadge({
  stage,
  showDeployed = false,
  className = "",
}: {
  stage: string;
  showDeployed?: boolean;
  className?: string;
}) {
  if (stage === "DEPLOYED" && !showDeployed) return null;
  const meta = stageMeta(stage);
  const Icon = meta.icon;
  return (
    <span
      title={`${meta.label}: ${meta.description}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.badge} ${className}`}
    >
      <Icon size={10} className="shrink-0" />
      {meta.label}
    </span>
  );
}
