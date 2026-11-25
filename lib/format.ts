const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdSigned = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const percent = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const shares = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

export type Tone = "up" | "down" | "flat";

export function toneOf(value: number | null | undefined): Tone {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.005) return "flat";
  return value > 0 ? "up" : "down";
}

export function toneClass(value: number | null | undefined): string {
  const tone = toneOf(value);
  if (tone === "up") return "text-gain";
  if (tone === "down") return "text-loss";
  return "text-foreground";
}

export function formatMoney(value: number | null | undefined, signed = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return (signed ? usdSigned : usd).format(value);
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const digits = Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${percent.format(value)}%`;
}

export function formatShares(value: number): string {
  return shares.format(value);
}

export function formatOpened(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatExchangeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function phaseLabel(phase: string | null | undefined): string | null {
  switch (phase) {
    case "open":
      return "Market open";
    case "pre":
      return "Pre-market";
    case "post":
      return "After hours";
    case "closed":
      return "Market closed";
    default:
      return null;
  }
}

export function providerLabel(provider: string | null | undefined): string {
  switch (provider) {
    case "finnhub":
      return "Finnhub";
    case "alphavantage":
      return "Alpha Vantage";
    case "nasdaq":
      return "Nasdaq";
    case "yahoo":
    default:
      return "Yahoo Finance";
  }
}
