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
