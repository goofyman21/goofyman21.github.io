"use client";

import { useState, type ReactNode } from "react";
import { Figure } from "@/components/figure";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/cn";
import {
  formatMoney,
  formatOpened,
  formatPercent,
  formatPrice,
  formatShares,
  toneClass,
} from "@/lib/format";
import type { PricedPosition } from "@/lib/portfolio";

type SortKey =
  | "ticker"
  | "price"
  | "previousClose"
  | "shares"
  | "marketValue"
  | "costBasis"
  | "unrealized"
  | "day";

type SortDirection = "asc" | "desc";

const COLUMNS: Array<{ key: SortKey; label: string; align: "left" | "right" }> = [
  { key: "ticker", label: "Ticker", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "previousClose", label: "Prev close", align: "right" },
  { key: "shares", label: "Qty", align: "right" },
  { key: "marketValue", label: "Market value", align: "right" },
  { key: "costBasis", label: "Cost basis", align: "right" },
  { key: "unrealized", label: "Unrealized", align: "right" },
  { key: "day", label: "Day", align: "right" },
];

function sortValue(row: PricedPosition, key: SortKey): number | string | null {
  switch (key) {
    case "ticker":
      return row.position.ticker;
    case "price":
      return row.price;
    case "previousClose":
      return row.previousClose;
    case "shares":
      return row.position.shares;
    case "marketValue":
      return row.marketValue;
    case "costBasis":
      return row.position.costBasis;
    case "unrealized":
      return row.unrealized;
    case "day":
      return row.dayAmount;
  }
}

function compare(a: PricedPosition, b: PricedPosition, key: SortKey, direction: SortDirection) {
  const sign = direction === "asc" ? 1 : -1;
  const left = sortValue(a, key);
  const right = sortValue(b, key);
  if (left == null && right == null) return a.position.ticker.localeCompare(b.position.ticker);
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === "string" && typeof right === "string") return left.localeCompare(right) * sign;
  return (Number(left) - Number(right)) * sign;
}

function MoneyStack({
  amount,
  percent,
  loading,
}: {
  amount: number | null;
  percent: number | null;
  loading: boolean;
}) {
  return (
    <div className={cn("num", toneClass(amount))}>
      <div>
        <Figure loading={loading} width="w-20" height="h-4">
          {formatMoney(amount, true)}
        </Figure>
      </div>
      <div className="mt-0.5 text-xs opacity-80">
        <Figure loading={loading} width="w-14" height="h-3">
          {formatPercent(percent)}
        </Figure>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-faint">{label}</dt>
      <dd className="num mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function PositionCard({ row, pending }: { row: PricedPosition; pending: boolean }) {
  const name = row.quote?.name || row.position.name;
  return (
    <article className="glass rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-[1.7rem] leading-none tracking-tight">{row.position.ticker}</h3>
            <span className="num text-xs text-faint">
              {pending || row.weight == null ? "" : formatPercent(row.weight).replace(/^\+/, "")}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-muted">{name}</p>
          <p className="mt-1 text-xs text-faint">Opened {formatOpened(row.position.openedOn)}</p>
        </div>
        <div className="text-right">
          <MoneyStack amount={row.unrealized} percent={row.unrealizedPct} loading={pending} />
          <div className="mt-2 flex justify-end">
            <Sparkline values={row.quote?.history ?? []} sign={row.dayAmount} />
          </div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4">
        <Stat label="Price">
          <Figure loading={pending} width="w-16" height="h-4">
            {formatPrice(row.price)}
          </Figure>
        </Stat>
        <Stat label="Prev close">
          <Figure loading={pending} width="w-16" height="h-4">
            {formatPrice(row.previousClose)}
          </Figure>
        </Stat>
        <Stat label="Quantity">{formatShares(row.position.shares)}</Stat>
        <Stat label="Day">
          <span className={toneClass(row.dayAmount)}>
            <Figure loading={pending} width="w-16" height="h-4">
              {formatMoney(row.dayAmount, true)}
            </Figure>
          </span>
          <span className={cn("ml-1 text-xs", toneClass(row.dayPct))}>
            <Figure loading={pending} width="w-12" height="h-3">
              {formatPercent(row.dayPct)}
            </Figure>
          </span>
        </Stat>
        <Stat label="Market value">
          <Figure loading={pending} width="w-20" height="h-4">
            {formatMoney(row.marketValue)}
          </Figure>
        </Stat>
        <Stat label="Cost basis">
          {formatMoney(row.position.costBasis)}
          <span className="mt-0.5 block text-xs text-faint">{formatMoney(row.averageCost)} / sh</span>
        </Stat>
      </dl>
      {row.quote?.error && row.price == null ? (
        <p className="mt-3 text-xs text-loss">Price unavailable</p>
      ) : null}
    </article>
  );
}

export function PositionList({ rows, pending }: { rows: PricedPosition[]; pending: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "marketValue",
    direction: "desc",
  });

  const ordered = pending
    ? rows
    : rows.slice().sort((a, b) => compare(a, b, sort.key, sort.direction));

  function toggle(key: SortKey) {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "ticker" ? "asc" : "desc" };
    });
  }

  return (
    <section id="holdings" aria-labelledby="holdings-title" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 id="holdings-title" className="font-serif text-3xl tracking-tight">
            Positions
          </h2>
          <p className="mt-1 text-sm text-faint">Cost basis is the total paid for each lot.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:hidden">
        {ordered.map((row) => (
          <PositionCard key={row.position.ticker} row={row} pending={pending} />
        ))}
      </div>

      <div className="glass hidden overflow-hidden rounded-[28px] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Open positions with live prices, cost basis, P&amp;L, and day change</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-faint">
                {COLUMNS.map((column) => {
                  const active = sort.key === column.key;
                  return (
                    <th key={column.key} scope="col" aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} className={cn("px-4 py-4 font-medium", column.align === "right" && "text-right")}>
                      <button
                        type="button"
                        onClick={() => toggle(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md",
                          column.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {column.label}
                        <span aria-hidden className={cn("text-[10px]", active ? "text-gold" : "text-transparent")}>
                          {sort.direction === "asc" ? "↑" : "↓"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ordered.map((row) => {
                const name = row.quote?.name || row.position.name;
                return (
                  <tr key={row.position.ticker} className="border-t border-white/10 hover:bg-white/[0.03]">
                    <th scope="row" className="border-t border-white/10 px-4 py-4 text-left font-normal">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif text-xl tracking-tight text-foreground">{row.position.ticker}</span>
                            <span className="num text-xs text-faint">
                              {pending || row.weight == null ? "" : formatPercent(row.weight).replace(/^\+/, "")}
                            </span>
                          </div>
                          <div className="truncate text-xs text-muted">{name}</div>
                          <div className="text-xs text-faint">Opened {formatOpened(row.position.openedOn)}</div>
                        </div>
                        <Sparkline values={row.quote?.history ?? []} sign={row.dayAmount} />
                      </div>
                    </th>
                    <td className="num border-t border-white/10 px-4 py-4 text-right">
                      <Figure loading={pending} width="w-16" height="h-4">
                        {formatPrice(row.price)}
                      </Figure>
                    </td>
                    <td className="num border-t border-white/10 px-4 py-4 text-right text-muted">
                      <Figure loading={pending} width="w-16" height="h-4">
                        {formatPrice(row.previousClose)}
                      </Figure>
                    </td>
                    <td className="num border-t border-white/10 px-4 py-4 text-right">{formatShares(row.position.shares)}</td>
                    <td className="num border-t border-white/10 px-4 py-4 text-right">
                      <Figure loading={pending} width="w-20" height="h-4">
                        {formatMoney(row.marketValue)}
                      </Figure>
                    </td>
                    <td className="num border-t border-white/10 px-4 py-4 text-right">
                      {formatMoney(row.position.costBasis)}
                      <span className="mt-0.5 block text-xs text-faint">{formatMoney(row.averageCost)} avg</span>
                    </td>
                    <td className="border-t border-white/10 px-4 py-4 text-right">
                      <MoneyStack amount={row.unrealized} percent={row.unrealizedPct} loading={pending} />
                    </td>
                    <td className="border-t border-white/10 px-4 py-4 text-right">
                      <MoneyStack amount={row.dayAmount} percent={row.dayPct} loading={pending} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
