import { cn } from "@/lib/utils";
import { appearanceForColor, lozengeAppearance } from "@/components/ui/jira";

const lozengeBase =
  "inline-flex max-w-full items-center truncate rounded-[3px] px-1 text-[11px] font-bold uppercase leading-4";

/** Jira lozenge — tinted background + coloured uppercase text. */
export function SoftBadge({
  className,
  color,
  children,
}: {
  className?: string;
  color?: string;
  children: React.ReactNode;
}) {
  const appearance = appearanceForColor(color ?? "#6b7280");
  if (appearance) {
    return <span className={cn(lozengeBase, lozengeAppearance[appearance], className)}>{children}</span>;
  }
  // Custom colours (e.g. admin-configured statuses) fall back to a tint of that colour.
  const c = (color ?? "").replace("#", "");
  return (
    <span
      className={cn(lozengeBase, className)}
      style={{ backgroundColor: `#${c}26`, color: `color-mix(in srgb, #${c} 70%, #172b4d)` }}
    >
      {children}
    </span>
  );
}

/** Kept for existing call sites; renders the same subtle Jira lozenge. */
export const Badge = SoftBadge;
