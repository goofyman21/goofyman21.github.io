function clampRefreshSeconds(value: number): number {
  if (!Number.isFinite(value)) return 45;
  return Math.min(60, Math.max(30, Math.round(value)));
}

/** Browser polling interval. Clamped to the 30–60 second window. */
export const REFRESH_SECONDS = clampRefreshSeconds(
  Number(process.env.NEXT_PUBLIC_REFRESH_SECONDS ?? 45),
);

export const REFRESH_MS = REFRESH_SECONDS * 1000;
