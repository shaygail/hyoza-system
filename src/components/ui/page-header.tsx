import Link from "next/link";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

const PROJECT_CRUMBS: Crumb[] = [
  { label: "Projects", href: "/app/dashboard" },
  { label: "HYOZA Service Desk", href: "/app/dashboard" },
];

/** Jira page header: breadcrumbs, title, optional description and actions. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs = [],
  projectCrumbs = true,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  projectCrumbs?: boolean;
  className?: string;
}) {
  const crumbs = [...(projectCrumbs ? PROJECT_CRUMBS : []), ...breadcrumbs];
  return (
    <div className={cn("space-y-2", className)}>
      {crumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {c.href ? (
                <Link href={c.href} className="hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
  );
}
