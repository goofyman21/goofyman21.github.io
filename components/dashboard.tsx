"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type TouchEvent } from "react";
import { Allocation } from "@/components/allocation";
import { Mark } from "@/components/mark";
import { PositionList } from "@/components/position-list";
import { SummaryCards } from "@/components/summary-cards";
import { REFRESH_MS } from "@/lib/config";
import { cn } from "@/lib/cn";
import { phaseLabel } from "@/lib/format";
import { POSITIONS } from "@/lib/positions";
import { summarize, valuePosition, withWeights } from "@/lib/portfolio";
import { emptySnapshot, readSnapshot, subscribeSnapshots, writeSnapshot } from "@/lib/storage";
import type { Quote, QuotesResponse } from "@/lib/types";

type Status = "loading" | "refreshing" | "live" | "saved" | "offline" | "error";

function mergeQuotes(previous: QuotesResponse | null, next: QuotesResponse): QuotesResponse {
  if (!previous) return next;
  const prior = new Map(previous.quotes.map((quote) => [quote.symbol, quote]));
  let kept = 0;
  const quotes = next.quotes.map((quote) => {
    if (quote.price == null) {
      const older = prior.get(quote.symbol);
      if (older?.price != null) {
        kept += 1;
        return older;
      }
    }
    return quote;
  });
  const extra = kept > 0 ? `Kept the last price for ${kept} symbol${kept === 1 ? "" : "s"} that did not refresh.` : null;
  const warning = [next.warning, extra].filter(Boolean).join(" ");
  return { ...next, quotes, warning: warning || null };
}

function latestTrade(quotes: Quote[]): string | null {
  const times = quotes
    .map((quote) => (quote.asOf ? Date.parse(quote.asOf) : NaN))
    .filter((time) => Number.isFinite(time));
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

export function Dashboard() {
  const stored = useSyncExternalStore(subscribeSnapshots, readSnapshot, emptySnapshot);
  const [fetched, setFetched] = useState<QuotesResponse | null>(null);
  const snapshot = fetched ?? stored;
  const [status, setStatus] = useState<Status>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [pull, setPull] = useState(0);
  const inflight = useRef<AbortController | null>(null);
  const lastFetch = useRef(0);
  const pullRef = useRef({ active: false, startY: 0, distance: 0 });

  const refresh = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetch.current < 15_000) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const baseline = readSnapshot();
    setStatus(baseline ? "refreshing" : "loading");

    try {
      const response = await fetch("/api/quotes", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Quote request failed (${response.status})`);
      const body = (await response.json()) as QuotesResponse;
      if (!Array.isArray(body.quotes)) throw new Error("Quote response was incomplete");
      const merged = mergeQuotes(baseline, body);
      const fromWorker = response.headers.get("X-Meridian-Cache") === "sw";
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setFetched(merged);
      writeSnapshot(merged);
      lastFetch.current = Date.now();
      setNotice(merged.warning ?? null);
      if (offline || fromWorker) setStatus("offline");
      else if (body.stale) setStatus("saved");
      else setStatus("live");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (baseline) {
        setFetched((current) => current ?? baseline);
        setStatus(offline ? "offline" : "saved");
        setNotice(offline ? "You are offline. Showing the last saved prices." : "Couldn't refresh prices. Showing the last update.");
      } else {
        setStatus("error");
        setNotice("Couldn't reach the quote service. Holdings are still listed below.");
      }
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh(true);
    }, 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [refresh]);

  const rows = useMemo(() => {
    const bySymbol = new Map((snapshot?.quotes ?? []).map((quote) => [quote.symbol, quote]));
    return withWeights(POSITIONS.map((position) => valuePosition(position, bySymbol.get(position.ticker))));
  }, [snapshot]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const pending = snapshot == null;
  const shownStatus: Status = status === "loading" && snapshot ? "saved" : status;
  const priceAsOf = snapshot ? latestTrade(snapshot.quotes) : null;

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (window.scrollY > 8) return;
    pullRef.current = { active: true, startY: event.touches[0]?.clientY ?? 0, distance: 0 };
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!pullRef.current.active || window.scrollY > 8) return;
    const current = event.touches[0]?.clientY ?? pullRef.current.startY;
    const distance = Math.max(0, current - pullRef.current.startY);
    pullRef.current.distance = distance;
    setPull(Math.min(distance * 0.4, 76));
  }

  function onTouchEnd() {
    const shouldRefresh = pullRef.current.distance > 140;
    pullRef.current = { active: false, startY: 0, distance: 0 };
    setPull(0);
    if (shouldRefresh) void refresh(true);
  }

  const label =
    shownStatus === "live"
      ? "Live"
      : shownStatus === "offline"
        ? "Offline"
        : shownStatus === "error"
          ? "Unavailable"
          : shownStatus === "saved"
            ? "Saved"
            : "Updating";
  const dot =
    shownStatus === "live" ? "bg-gain" : shownStatus === "offline" || shownStatus === "error" ? "bg-loss" : "bg-gold";

  return (
    <div
      className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 pt-[max(1.1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <a
        href="#holdings"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to positions
      </a>
      <div
        style={{ height: pull }}
        className="overflow-hidden text-center text-xs tracking-wide text-faint transition-[height] duration-150"
        aria-hidden
      >
        <div className="pt-2">{pull > 56 ? "Release to refresh" : "Pull to refresh"}</div>
      </div>

      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Mark className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-[1.7rem] italic leading-none tracking-tight sm:text-[2rem]">Meridian</h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-faint">Holdings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted"
            aria-label={label}
          >
            <span className="relative flex h-2 w-2">
              {shownStatus === "live" ? (
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping", dot)} />
              ) : null}
              <span className={cn("relative h-2 w-2 rounded-full", dot)} />
            </span>
            <span className="hidden min-[380px]:inline">{label}</span>
          </p>
          <button
            type="button"
            onClick={() => void refresh(true)}
            aria-label="Refresh prices"
            className="grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-full border border-white/10 bg-white/[0.04] text-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              className={cn("h-4 w-4", (status === "loading" || status === "refreshing") && "motion-safe:animate-spin")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M20 12a8 8 0 1 1-2.2-5.5" strokeLinecap="round" />
              <path d="M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <p className="sr-only" aria-live="polite">
        {snapshot
          ? `${label}. Portfolio ${summary.pricedCount === 0 ? "waiting for prices" : "updated"}. ${phaseLabel(snapshot.marketPhase) ?? ""}`
          : "Loading prices"}
      </p>

      {notice ? (
        <p role="status" className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-6 text-gold">
          {notice}
        </p>
      ) : null}

      <main className="flex flex-col gap-6" aria-busy={pending}>
        <SummaryCards
          summary={summary}
          pending={pending}
          fetchedAt={snapshot?.fetchedAt ?? null}
          provider={snapshot?.provider ?? null}
          marketPhase={snapshot?.marketPhase ?? null}
          priceAsOf={priceAsOf}
        />
        <Allocation rows={rows} pending={pending} />
        <PositionList rows={rows} pending={pending} />
      </main>

      <footer className="mt-2 pb-2 text-center text-xs leading-5 text-faint">
        <p>Prices depend on the selected source and can be delayed. This is a private book, not a broker, and not advice.</p>
        <p className="mt-3 lg:hidden">In Safari, use Share, then Add to Home Screen, to open Meridian full screen.</p>
      </footer>
    </div>
  );
}
