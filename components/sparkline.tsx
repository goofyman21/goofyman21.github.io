import { toneOf } from "@/lib/format";

export function Sparkline({ values, sign }: { values: number[]; sign: number | null }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 96;
  const height = 32;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const tone = toneOf(sign);
  const stroke = tone === "up" ? "var(--gain)" : tone === "down" ? "var(--loss)" : "rgba(244,239,230,0.7)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-24 shrink-0" aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
