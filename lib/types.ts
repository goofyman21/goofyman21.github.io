export type MarketPhase = "pre" | "open" | "post" | "closed" | "unknown";

export type QuoteSource = "yahoo" | "finnhub" | "alphavantage" | "nasdaq";

export type QuoteProvider = "yahoo" | "finnhub" | "alphavantage";

export type Quote = {
  symbol: string;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  currency: string;
  asOf: string | null;
  history: number[];
  source: QuoteSource;
  error?: string;
};

export type QuotesResponse = {
  provider: QuoteProvider;
  fetchedAt: string;
  marketPhase: MarketPhase;
  quotes: Quote[];
  stale?: boolean;
  warning?: string | null;
};

export type ProviderQuote = Quote & {
  marketPhase: MarketPhase;
};
