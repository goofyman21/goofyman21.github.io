import { Figure } from "@/components/figure";
import { REFRESH_SECONDS } from "@/lib/config";
import { cn } from "@/lib/cn";
import {
  formatExchangeTime,
  formatMoney,
  formatPercent,
  formatTimestamp,
  phaseLabel,
  providerLabel,
  toneClass,
  toneOf,
} from "@/lib/format";
import type { PortfolioSummary } from "@/lib/portfolio";
import type { MarketPhase, QuoteProvider } from "@/lib/types";

function Accent({ tone }: { tone: "up" | "down" | "flat" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-3 left-0 w-0.5 rounded-full",
        tone === "up" && "bg-gain",
        tone === "down" && "bg-loss",
        tone === "flat" && "bg-white/20",
      )}
    />
  );
}

export function SummaryCards({
  summary,
  pending,
  fetchedAt,
  provider,
  marketPhase,
  priceAsOf,
}: {
  summary: PortfolioSummary;
  pending: boolean;
  fetchedAt: string | null;
  provider: QuoteProvider | null;
  marketPhase: MarketPhase | null;
  priceAsOf: string | null;
}) {
  const partial = !pending && summary.pricedCount < summary.positionCount;
  const partialDay = !pending && summary.pricedCount > 0 && summary.dayCount < summary.pricedCount;
  const market = phaseLabel(marketPhase);

  return (
    <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <article className="glass relative col-span-2 overflow-hidden rounded-[28px] p-5 sm:p-7 lg:row-span-2">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-faint">Portfolio value</p>
        <p className="num mt-4 font-serif leading-none tracking-tight text-[clamp(2.5rem,8vw,4.6rem)]">
          <Figure loading={pending} width="w-52" height="h-14">
            {formatMoney(summary.pricedCount === 0 ? null : summary.marketValue)}
          </Figure>
        </p>
        <p className="mt-4 max-w-sm text-sm text-muted">
          {partial
            ? `${summary.pricedCount} of ${summary.positionCount} positions priced. Totals skip the rest.`
            : "Market value of the open book."}
        </p>
      </article>

      <article className="glass relative col-span-2 overflow-hidden rounded-[24px] p-4 sm:col-span-1 sm:p-5">
        <Accent tone={pending ? "flat" : toneOf(summary.unrealized)} />
        <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Unrealized</p>
        <p className={cn("num mt-3 text-2xl tracking-tight", !pending && toneClass(summary.unrealized))}>
          <Figure loading={pending} width="w-28" height="h-7">
            {formatMoney(summary.pricedCount === 0 ? null : summary.unrealized, true)}
          </Figure>
        </p>
        <p className={cn("num mt-1 text-sm", !pending && toneClass(summary.unrealizedPct))}>
          <Figure loading={pending} width="w-16" height="h-4">
            {formatPercent(summary.unrealizedPct)}
          </Figure>
        </p>
        <p className="mt-3 text-xs text-faint">
          {pending || summary.pricedCount === 0
            ? "Against cost basis"
            : `Against ${formatMoney(summary.costBasis)} cost`}
        </p>
      </article>

      <article className="glass relative col-span-2 overflow-hidden rounded-[24px] p-4 sm:col-span-1 sm:p-5">
        <Accent tone={pending ? "flat" : toneOf(summary.dayAmount)} />
        <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Day change</p>
        <p className={cn("num mt-3 text-2xl tracking-tight", !pending && toneClass(summary.dayAmount))}>
          <Figure loading={pending} width="w-28" height="h-7">
            {formatMoney(summary.dayCount === 0 ? null : summary.dayAmount, true)}
          </Figure>
        </p>
        <p className={cn("num mt-1 text-sm", !pending && toneClass(summary.dayPct))}>
          <Figure loading={pending} width="w-16" height="h-4">
            {formatPercent(summary.dayPct)}
          </Figure>
        </p>
        <p className="mt-3 text-xs text-faint">
          {partialDay ? `${summary.dayCount} of ${summary.pricedCount} positions` : "Versus previous close"}
        </p>
      </article>

      <article className="glass rounded-[24px] p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Positions</p>
        <p className="num mt-3 font-serif text-4xl tracking-tight">{summary.positionCount}</p>
        <p className="mt-3 text-xs text-faint">Open holdings</p>
      </article>

      <article className="glass rounded-[24px] p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Updated</p>
        <p className="num mt-3 text-lg leading-snug tracking-tight">
          <Figure loading={pending} width="w-32" height="h-6">
            {formatTimestamp(fetchedAt)}
          </Figure>
        </p>
        <p className="mt-2 text-xs leading-5 text-faint">
          {provider ? providerLabel(provider) : "Waiting for quotes"}
          {market ? ` · ${market}` : ""}
          <span className="block">Refreshes about every {REFRESH_SECONDS}s</span>
          {priceAsOf ? <span className="block">Last trade {formatExchangeTime(priceAsOf)}</span> : null}
        </p>
      </article>
    </section>
  );
}
