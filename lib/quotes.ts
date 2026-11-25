import type { MarketPhase, ProviderQuote, QuoteSource } from "@/lib/types";

type TradingWindow = { start?: number; end?: number };
type TradingPeriod = { pre?: TradingWindow; regular?: TradingWindow; post?: TradingWindow };

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

const NAME_SUFFIXES = [
  /,\s*Inc\.?$/i,
  /\s+Inc\.?$/i,
  /\s+Corporation$/i,
  /\s+Corp\.?$/i,
  /\s+Limited$/i,
  /\s+Ltd\.?$/i,
  /\s+N\.V\.$/i,
  /\s+S\.A\.$/i,
  /\s+Common Stock$/i,
  /\s+Ordinary Shares$/i,
  /\s+Class [A-C]$/i,
];

export function tidyName(name: string): string {
  let value = name.replace(/\s+/g, " ").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of NAME_SUFFIXES) {
      const next = value.replace(suffix, "").replace(/,\s*$/, "").trim();
      if (next && next !== value) {
        value = next;
        changed = true;
      }
    }
  }
  return value;
}

export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(n\/a|na|--|-|unch)$/i.test(trimmed)) return null;
  const negative = trimmed.startsWith("-") || /^\(.*\)$/.test(trimmed);
  const numeric = Number(trimmed.replace(/[$,%\s()]/g, "").replace(/^\+/, ""));
  if (!Number.isFinite(numeric)) return null;
  return negative ? -Math.abs(numeric) : numeric;
}

export function roundPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function dayKey(unixSeconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function marketPhase(period: unknown, nowSec: number): MarketPhase {
  const windows = asRecord(period) as TradingPeriod;
  const inside = (window: TradingWindow | undefined) =>
    typeof window?.start === "number" &&
    typeof window.end === "number" &&
    nowSec >= window.start &&
    nowSec < window.end;

  if (inside(windows.regular)) return "open";
  if (inside(windows.pre)) return "pre";
  if (inside(windows.post)) return "post";
  if (windows.regular?.start != null && windows.regular.end != null) return "closed";
  return "unknown";
}

function blankQuote(symbol: string, source: QuoteSource, error: string): ProviderQuote {
  return {
    symbol,
    name: null,
    price: null,
    previousClose: null,
    currency: "USD",
    asOf: null,
    history: [],
    source,
    marketPhase: "unknown",
    error,
  };
}

export function failedQuote(symbol: string, source: QuoteSource, error: unknown): ProviderQuote {
  const message = error instanceof Error ? error.message : "Quote unavailable";
  return blankQuote(symbol, source, message);
}

export function parseYahooChart(
  payload: unknown,
  requestedSymbol: string,
  nowSec = Date.now() / 1000,
): ProviderQuote {
  const chart = asRecord(asRecord(payload).chart);
  const result = Array.isArray(chart.result) ? asRecord(chart.result[0]) : null;
  if (!result) {
    const description = asRecord(chart.error).description;
    throw new Error(typeof description === "string" ? description : "Yahoo returned no chart");
  }

  const meta = asRecord(result.meta);
  const indicators = asRecord(result.indicators);
  const series = Array.isArray(indicators.quote) ? indicators.quote : [];
  const quote = asRecord(series[0]);
  const closes = Array.isArray(quote.close) ? quote.close : [];
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const bars: Array<{ t: number; c: number }> = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const time = timestamps[index];
    const close = closes[index];
    if (typeof time === "number" && typeof close === "number" && close > 0) {
      bars.push({ t: time, c: close });
    }
  }

  const marketPrice = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
  const price = marketPrice != null && marketPrice > 0 ? marketPrice : (bars.at(-1)?.c ?? null);
  if (price == null) throw new Error("Yahoo price missing");

  const timeZone =
    typeof meta.exchangeTimezoneName === "string" ? meta.exchangeTimezoneName : "America/New_York";
  const session = typeof meta.regularMarketTime === "number" ? meta.regularMarketTime : null;
  let previousClose: number | null = null;

  if (bars.length >= 2) {
    const last = bars[bars.length - 1];
    if (session == null) {
      previousClose = bars[bars.length - 2].c;
    } else {
      const sameSession = dayKey(last.t, timeZone) === dayKey(session, timeZone);
      previousClose = sameSession ? bars[bars.length - 2].c : last.c;
    }
  } else if (bars.length === 1) {
    previousClose = bars[0].c;
  }

  const history = bars.slice(-12).map((bar) => bar.c);
  const lastBar = bars.at(-1);
  if (
    history.length > 0 &&
    lastBar &&
    session != null &&
    dayKey(lastBar.t, timeZone) === dayKey(session, timeZone)
  ) {
    history[history.length - 1] = price;
  }

  const rawName =
    (typeof meta.longName === "string" && meta.longName) ||
    (typeof meta.shortName === "string" && meta.shortName) ||
    null;

  return {
    symbol: typeof meta.symbol === "string" ? meta.symbol : requestedSymbol,
    name: rawName ? tidyName(rawName) : null,
    price,
    previousClose,
    currency: typeof meta.currency === "string" ? meta.currency : "USD",
    asOf: session ? new Date(session * 1000).toISOString() : null,
    history,
    source: "yahoo",
    marketPhase: marketPhase(meta.currentTradingPeriod, nowSec),
  };
}

export function parseNasdaqInfo(payload: unknown, symbol: string): ProviderQuote {
  const data = asRecord(asRecord(payload).data ?? payload);
  const primary = asRecord(data.primaryData);
  const secondary = asRecord(data.secondaryData);
  const price = parseMoney(primary.lastSalePrice) ?? parseMoney(secondary.lastSalePrice);
  if (price == null || price <= 0) throw new Error("Nasdaq price missing");

  const change = parseMoney(primary.netChange) ?? parseMoney(secondary.netChange);
  const previousClose = change == null ? null : roundPrice(price - change);
  const company = typeof data.companyName === "string" ? tidyName(data.companyName) : null;
  const status = typeof data.marketStatus === "string" ? data.marketStatus.toLowerCase() : "";

  let phase: MarketPhase = "unknown";
  if (status.includes("pre")) phase = "pre";
  else if (status.includes("after") || status.includes("post")) phase = "post";
  else if (status.includes("open")) phase = "open";
  else if (status.includes("close")) phase = "closed";

  return {
    symbol,
    name: company,
    price,
    previousClose,
    currency: "USD",
    asOf: null,
    history: [],
    source: "nasdaq",
    marketPhase: phase,
  };
}

export function parseFinnhubQuote(payload: unknown, symbol: string): ProviderQuote {
  const quote = asRecord(payload);
  const price = typeof quote.c === "number" ? quote.c : null;
  if (price == null || price <= 0) throw new Error("Finnhub price missing");
  const previousClose = typeof quote.pc === "number" && quote.pc > 0 ? quote.pc : null;
  const timestamp = typeof quote.t === "number" && quote.t > 0 ? quote.t : null;

  return {
    symbol,
    name: null,
    price,
    previousClose,
    currency: "USD",
    asOf: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    history: [],
    source: "finnhub",
    marketPhase: "unknown",
  };
}

export function parseAlphaQuote(payload: unknown, symbol: string): ProviderQuote {
  const root = asRecord(payload);
  const note = root.Note ?? root.Information ?? root["Error Message"];
  if (typeof note === "string" && note.trim()) {
    throw new Error(note.replace(/\s+/g, " ").slice(0, 180));
  }

  const quote = asRecord(root["Global Quote"]);
  const price = parseMoney(quote["05. price"]);
  if (price == null || price <= 0) throw new Error("Alpha Vantage price missing");

  return {
    symbol: typeof quote["01. symbol"] === "string" ? quote["01. symbol"] : symbol,
    name: null,
    price,
    previousClose: parseMoney(quote["08. previous close"]),
    currency: "USD",
    asOf: null,
    history: [],
    source: "alphavantage",
    marketPhase: "unknown",
  };
}
