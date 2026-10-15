import { cn } from "@/lib/utils";

// Atlassian button appearances: primary, default (neutral fill), subtle, warning, danger.
const variants = {
  default: "bg-ourcloud-600 text-white hover:bg-ourcloud-700 active:bg-ourcloud-800",
  secondary: "bg-[#091e420f] text-slate-600 hover:bg-[#091e4224] active:bg-[#091e424f]",
  reply: "bg-ourcloud-600 text-white hover:bg-ourcloud-700 active:bg-ourcloud-800",
  internal: "bg-[#f5cd47] text-slate-900 hover:bg-[#e2b203] active:bg-[#cf9f02]",
  ghost: "text-slate-600 hover:bg-[#091e420f] active:bg-[#091e4224]",
  danger: "bg-[#c9372c] text-white hover:bg-[#ae2e24] active:bg-[#5d1f1a]",
};

const sizes = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-8 px-3 text-sm",
  lg: "h-10 px-4 text-sm",
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
        "inline-flex items-center justify-center whitespace-nowrap rounded-[3px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ourcloud-400 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
