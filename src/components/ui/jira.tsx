import {
  Bookmark,
  SquareCheck,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Equal,
  RefreshCw,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Jira-style visual atoms: status lozenges, priority arrows, issue-type icons, avatars.

export const lozengeAppearance = {
  default: "bg-[#dcdfe4] text-[#44546f]",
  inprogress: "bg-[#cce0ff] text-[#0055cc]",
  moved: "bg-[#f8e6a0] text-[#7f5f01]",
  success: "bg-[#baf3db] text-[#216e4e]",
  removed: "bg-[#ffd5d2] text-[#ae2e24]",
  new: "bg-[#dfd8fd] text-[#5e4db2]",
};

export type LozengeAppearance = keyof typeof lozengeAppearance;

/** Maps the Tailwind-palette hex colours stored in the DB/seed to Jira lozenge appearances. */
const hexAppearance: Record<string, LozengeAppearance> = {
  "22c55e": "success",
  "16a34a": "success",
  "10b981": "success",
  "6b7280": "default",
  "9ca3af": "default",
  "64748b": "default",
  "3b82f6": "inprogress",
  "2563eb": "inprogress",
  "0891b2": "inprogress",
  "06b6d4": "inprogress",
  f59e0b: "moved",
  f97316: "moved",
  eab308: "moved",
  ef4444: "removed",
  dc2626: "removed",
  "6366f1": "new",
  "8b5cf6": "new",
  a855f7: "new",
  "0f766e": "new",
};

export function appearanceForColor(color?: string | null): LozengeAppearance | null {
  if (!color) return null;
  return hexAppearance[color.replace("#", "").toLowerCase()] ?? null;
}

type StatusLike = { name: string; code?: string; category?: string };

function statusAppearance(status: StatusLike): keyof typeof lozengeAppearance {
  if (status.code === "cancelled") return "removed";
  if (status.category === "resolved" || status.category === "closed") return "success";
  if (status.category === "waiting") return "moved";
  if (status.code === "in_progress" || status.category === "in_progress") return "inprogress";
  return "default";
}

export function StatusLozenge({ status, className }: { status: StatusLike; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-[3px] px-1 text-[11px] font-bold uppercase leading-4",
        lozengeAppearance[statusAppearance(status)],
        className
      )}
    >
      {status.name}
    </span>
  );
}

const priorityIcons: Record<string, { Icon: typeof ChevronUp; color: string }> = {
  critical: { Icon: ChevronsUp, color: "#c9372c" },
  highest: { Icon: ChevronsUp, color: "#c9372c" },
  urgent: { Icon: ChevronsUp, color: "#c9372c" },
  high: { Icon: ChevronUp, color: "#e2483d" },
  medium: { Icon: Equal, color: "#e2a203" },
  low: { Icon: ChevronDown, color: "#1d7afc" },
  lowest: { Icon: ChevronsDown, color: "#1d7afc" },
};

export function PriorityIcon({ name, className }: { name: string; className?: string }) {
  const { Icon, color } = priorityIcons[name.toLowerCase()] ?? priorityIcons.medium;
  return (
    <Icon
      className={cn("h-4 w-4 shrink-0", className)}
      style={{ color }}
      strokeWidth={2.75}
      aria-label={`${name} priority`}
    />
  );
}

export function PriorityLabel({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-900">
      <PriorityIcon name={name} />
      {name}
    </span>
  );
}

const typeIcons: { match: RegExp; Icon: typeof Zap; bg: string }[] = [
  { match: /incident/i, Icon: Zap, bg: "#e2483d" },
  { match: /problem/i, Icon: TriangleAlert, bg: "#e56910" },
  { match: /change/i, Icon: RefreshCw, bg: "#8f7ee7" },
  { match: /request/i, Icon: Bookmark, bg: "#22a06b" },
  { match: /task/i, Icon: SquareCheck, bg: "#1d7afc" },
];

export function TypeIcon({ name, className }: { name?: string | null; className?: string }) {
  const { Icon, bg } = typeIcons.find((t) => t.match.test(name ?? "")) ?? typeIcons[4];
  return (
    <span
      className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px]", className)}
      style={{ backgroundColor: bg }}
      title={name ?? undefined}
    >
      <Icon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
    </span>
  );
}

const avatarColors = ["#0c66e4", "#22a06b", "#e56910", "#8f7ee7", "#c9372c", "#1f845a", "#943d73", "#2898bd"];

export function Avatar({
  name,
  size = 24,
  className,
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  if (!name) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200", className)}
        style={{ width: size, height: size }}
        aria-label="Unassigned"
      >
        <svg viewBox="0 0 24 24" className="h-3/5 w-3/5 fill-slate-400" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
        </svg>
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.4)),
        backgroundColor: avatarColors[Math.abs(hash) % avatarColors.length],
      }}
      title={name}
    >
      {initials}
    </span>
  );
}
