import { formatMoney } from "@/components/finance/format";

/**
 * Single-series column chart (one hue, no legend — the section title names it).
 * Hover shows each month's value; only the latest month is direct-labelled.
 * A visually hidden table carries the same data for screen readers.
 */
export function MonthlyInvoicedChart({
  months,
  currency,
}: {
  months: { label: string; total: number }[];
  currency: string;
}) {
  const max = Math.max(...months.map((m) => m.total), 1);
  const last = months.length - 1;

  return (
    <figure>
      <div className="relative flex h-44 items-end gap-0.5 border-b border-slate-300" aria-hidden>
        {months.map((m, i) => {
          const height = m.total === 0 ? 0 : Math.max(2, (m.total / max) * 100);
          return (
            <div key={m.label} className="group relative flex h-full flex-1 items-end justify-center px-2">
              {i === last && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-slate-900"
                  style={{ bottom: `calc(${height}% + 4px)` }}
                >
                  {formatMoney(m.total, currency)}
                </span>
              )}
              <div
                className="w-full max-w-12 rounded-t-[4px] bg-ourcloud-500 transition-colors group-hover:bg-ourcloud-700"
                style={{ height: `${height}%` }}
              />
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[3px] bg-slate-900 px-2 py-1 text-xs text-white shadow-overlay group-hover:block">
                {m.label}: {formatMoney(m.total, currency)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-0.5" aria-hidden>
        {months.map((m) => (
          <span key={m.label} className="flex-1 text-center text-xs text-slate-500">
            {m.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Approved invoice totals per month, excluding GST</caption>
        <tbody>
          {months.map((m) => (
            <tr key={m.label}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
