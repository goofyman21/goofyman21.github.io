import { POSITIONS } from "@/lib/positions";
import { formatPercent } from "@/lib/format";
import type { PricedPosition } from "@/lib/portfolio";

const COLORS = ["#d6b17a", "#8fb9a8", "#d7a3a3", "#a9b7c9", "#e4d2ae", "#b7a4c4", "#c4b39a", "#8aa0b4"];

export function Allocation({ rows, pending }: { rows: PricedPosition[]; pending: boolean }) {
  const colorFor = new Map(POSITIONS.map((position, index) => [position.ticker, COLORS[index % COLORS.length]]));
  const segments = rows
    .filter((row) => row.weight != null && row.weight > 0)
    .slice()
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  return (
    <section aria-label="Allocation" className="glass rounded-[28px] p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl tracking-tight">Allocation</h2>
        <p className="text-xs uppercase tracking-[0.16em] text-faint">By market value</p>
      </div>
      {pending || segments.length === 0 ? (
        <div className="shimmer mt-5 h-2.5 rounded-full" />
      ) : (
        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/5">
          {segments.map((segment) => (
            <div
              key={segment.position.ticker}
              style={{
                width: `${segment.weight}%`,
                background: colorFor.get(segment.position.ticker),
              }}
              title={`${segment.position.ticker} ${formatPercent(segment.weight).replace("+", "")}`}
            />
          ))}
        </div>
      )}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {(pending ? rows : segments).map((row) => (
          <li key={row.position.ticker} className="flex items-center gap-2 text-xs text-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: colorFor.get(row.position.ticker) }}
              aria-hidden
            />
            <span className="text-foreground">{row.position.ticker}</span>
            <span className="num text-faint">
              {pending || row.weight == null ? "—" : formatPercent(row.weight).replace(/^\+/, "")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
