import { POSITIONS } from "@/lib/positions";
import {
  failedQuote,
  parseAlphaQuote,
  parseFinnhubQuote,
  parseNasdaqInfo,
  parseYahooChart,
} from "@/lib/quotes";
import type { MarketPhase, ProviderQuote, Quote, QuoteProvider, QuotesResponse } from "@/lib/types";

const YAHOO_HOSTS = ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"];
// A short UA. Yahoo's chart endpoint answers this and rate-limits a full Chrome UA from Node.
const BROWSER_UA = "Mozilla/5.0";

const DEFAULT_TTL_SECONDS: Record<QuoteProvider, number> = {
  yahoo: 20,
  finnhub: 20,
  alphavantage: 60 * 60 * 12,
};

let yahooCooldownUntil = 0;

export function resolveProvider(): QuoteProvider {
  const requested = (process.env.PRICE_PROVIDER || "yahoo").trim().toLowerCase();
  if (requested === "finnhub" || requested === "alphavantage" || requested === "yahoo") {
    return requested;
  }
  return "yahoo";
}

export function cacheTtlMs(provider = resolveProvider()): number {
  const override = Number(process.env.QUOTE_CACHE_SECONDS);
  if (Number.isFinite(override) && override > 0) return override * 1000;
  return DEFAULT_TTL_SECONDS[provider] * 1000;
}

async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  }

  const workers = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

async function fetchYahoo(symbol: string): Promise<ProviderQuote> {
  if (Date.now() < yahooCooldownUntil) {
    throw new Error("Yahoo is cooling down after a rate limit");
  }

  let lastError: Error | null = null;
  for (const host of YAHOO_HOSTS) {
    const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo&includePrePost=false`;
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
        headers: {
          Accept: "application/json",
          "User-Agent": BROWSER_UA,
        },
      });
      if (response.status === 429) {
        yahooCooldownUntil = Date.now() + 60_000;
        lastError = new Error("Yahoo rate limited");
        continue;
      }
      if (!response.ok) {
        lastError = new Error(`Yahoo HTTP ${response.status}`);
        continue;
      }
      return parseYahooChart(await readJson(response), symbol);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Yahoo request failed");
    }
  }

  throw lastError ?? new Error("Yahoo request failed");
}

async function fetchNasdaq(symbol: string): Promise<ProviderQuote> {
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/info?assetclass=stocks`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: {
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`Nasdaq HTTP ${response.status}`);
  return parseNasdaqInfo(await readJson(response), symbol);
}

async function fetchFinnhub(symbol: string): Promise<ProviderQuote> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY is empty");
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Finnhub HTTP ${response.status}`);
  return parseFinnhubQuote(await readJson(response), symbol);
}

async function fetchAlpha(symbol: string): Promise<ProviderQuote> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is empty");
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`);
  return parseAlphaQuote(await readJson(response), symbol);
}

function publicError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (/token=|apikey=|api_key=/i.test(message)) return fallback;
  return message.slice(0, 160);
}

async function loadOne(symbol: string, provider: QuoteProvider): Promise<ProviderQuote> {
  try {
    if (provider === "finnhub") return await fetchFinnhub(symbol);
    if (provider === "alphavantage") return await fetchAlpha(symbol);
    return await fetchYahoo(symbol);
  } catch (primaryError) {
    if (provider !== "yahoo") {
      return failedQuote(symbol, provider, new Error(publicError(primaryError, "Quote unavailable")));
    }
    try {
      return await fetchNasdaq(symbol);
    } catch {
      return failedQuote(symbol, "yahoo", new Error(publicError(primaryError, "Quote unavailable")));
    }
  }
}

function choosePhase(quotes: ProviderQuote[]): MarketPhase {
  const phases = quotes.map((quote) => quote.marketPhase).filter((phase) => phase !== "unknown");
  if (phases.includes("open")) return "open";
  if (phases.includes("pre")) return "pre";
  if (phases.includes("post")) return "post";
  if (phases.includes("closed")) return "closed";
  return "unknown";
}

export async function loadQuotes(): Promise<QuotesResponse> {
  const requested = resolveProvider();
  let provider: QuoteProvider = requested;
  const notes: string[] = [];

  if (requested === "finnhub" && !process.env.FINNHUB_API_KEY) {
    provider = "yahoo";
    notes.push("FINNHUB_API_KEY is empty, so Meridian used Yahoo Finance instead.");
  }
  if (requested === "alphavantage" && !process.env.ALPHA_VANTAGE_API_KEY) {
    provider = "yahoo";
    notes.push("ALPHA_VANTAGE_API_KEY is empty, so Meridian used Yahoo Finance instead.");
  }
  if (provider === "alphavantage" && !process.env.QUOTE_CACHE_SECONDS) {
    notes.push("Alpha Vantage's free tier is rate limited, so quotes are cached for 12 hours.");
  }

  const quotes = await mapPool(POSITIONS, provider === "alphavantage" ? 1 : 3, async (position, index) => {
    if (index > 0 && provider !== "alphavantage") {
      await new Promise((resolve) => setTimeout(resolve, index * 40));
    }
    return loadOne(position.ticker, provider);
  });

  const failed = quotes.filter((quote) => quote.price == null).map((quote) => quote.symbol);
  const usedNasdaq = quotes.some((quote) => quote.source === "nasdaq" && quote.price != null);
  if (usedNasdaq) notes.push("Nasdaq filled in symbols Yahoo did not return.");
  if (failed.length > 0) notes.push(`No live price for ${failed.join(", ")}.`);

  return {
    provider,
    fetchedAt: new Date().toISOString(),
    marketPhase: choosePhase(quotes),
    quotes: quotes.map(toPublicQuote),
    warning: notes.length > 0 ? notes.join(" ") : null,
  };
}

function toPublicQuote(quote: ProviderQuote): Quote {
  return {
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    previousClose: quote.previousClose,
    currency: quote.currency,
    asOf: quote.asOf,
    history: quote.history,
    source: quote.source,
    error: quote.error,
  };
}
