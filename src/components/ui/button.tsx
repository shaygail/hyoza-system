import { cn } from "@/lib/utils";

const variants = {
  default: "bg-ourcloud-600 text-white hover:bg-ourcloud-700",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
  reply: "bg-[#2563eb] text-white hover:bg-blue-700",
  internal: "bg-[#d97706] text-white hover:bg-amber-600",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ourcloud-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
