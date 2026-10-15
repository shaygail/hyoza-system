import { cn } from "@/lib/utils";

// Atlassian text field: neutral border, light hover fill, blue focus ring.
const field =
  "w-full rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400 disabled:cursor-not-allowed disabled:bg-slate-100";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-[100px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-xs font-semibold text-slate-500", className)} {...props}>
      {children}
    </label>
  );
}
