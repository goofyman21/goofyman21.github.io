import type { Position } from "@/lib/positions";
import type { Quote } from "@/lib/types";

export type PricedPosition = {
  position: Position;
  quote: Quote | null;
  price: number | null;
  previousClose: number | null;
  marketValue: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
  dayAmount: number | null;
  dayPct: number | null;
  averageCost: number;
  weight: number | null;
};

export type PortfolioSummary = {
  marketValue: number;
  costBasis: number;
  unrealized: number;
  unrealizedPct: number | null;
  dayAmount: number;
  dayPct: number | null;
  positionCount: number;
  pricedCount: number;
  dayCount: number;
};

export function averageCost(position: Position): number {
  if (position.shares === 0) return 0;
  return position.costBasis / position.shares;
}

export function valuePosition(position: Position, quote: Quote | undefined): Omit<PricedPosition, "weight"> {
  const price = quote?.price ?? null;
  const previousClose = quote?.previousClose ?? null;
  const marketValue = price == null ? null : price * position.shares;
  const unrealized = marketValue == null ? null : marketValue - position.costBasis;
  const unrealizedPct =
    unrealized == null || position.costBasis === 0 ? null : (unrealized / position.costBasis) * 100;
  const dayAmount =
    price == null || previousClose == null ? null : (price - previousClose) * position.shares;
  const dayPct =
    price == null || previousClose == null || previousClose === 0
      ? null
      : ((price - previousClose) / previousClose) * 100;

  return {
    position,
    quote: quote ?? null,
    price,
    previousClose,
    marketValue,
    unrealized,
    unrealizedPct,
    dayAmount,
    dayPct,
    averageCost: averageCost(position),
  };
}

export function withWeights(rows: Array<Omit<PricedPosition, "weight">>): PricedPosition[] {
  const total = rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0);
  return rows.map((row) => ({
    ...row,
    weight: row.marketValue == null || total === 0 ? null : (row.marketValue / total) * 100,
  }));
}

export function summarize(rows: PricedPosition[]): PortfolioSummary {
  let marketValue = 0;
  let costBasis = 0;
  let dayAmount = 0;
  let previousValue = 0;
  let pricedCount = 0;
  let dayCount = 0;

  for (const row of rows) {
    if (row.marketValue == null) continue;
    pricedCount += 1;
    marketValue += row.marketValue;
    costBasis += row.position.costBasis;
    if (row.dayAmount != null && row.previousClose != null) {
      dayCount += 1;
      dayAmount += row.dayAmount;
      previousValue += row.previousClose * row.position.shares;
    }
  }

  const unrealized = marketValue - costBasis;
  return {
    marketValue,
    costBasis,
    unrealized,
    unrealizedPct: pricedCount === 0 || costBasis === 0 ? null : (unrealized / costBasis) * 100,
    dayAmount,
    dayPct: dayCount === 0 || previousValue === 0 ? null : (dayAmount / previousValue) * 100,
    positionCount: rows.length,
    pricedCount,
    dayCount,
  };
}
