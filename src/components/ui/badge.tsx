import { cn } from "@/lib/utils";

export function Badge({
  className,
  color,
  children,
}: {
  className?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white", className)}
      style={{ backgroundColor: color ?? "#6b7280" }}
    >
      {children}
    </span>
  );
}

/** Soft pill like Figma status chips — tinted background + colored text. */
export function SoftBadge({
  className,
  color,
  children,
}: {
  className?: string;
  color?: string;
  children: React.ReactNode;
}) {
  const c = (color ?? "#0891b2").replace("#", "");
  const bg = c.length === 6 ? `#${c}24` : "#ecfeff";
  const fg = c.length === 6 ? `#${c}` : "#0e7490";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  );
}
