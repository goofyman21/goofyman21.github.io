export type Position = {
  ticker: string;
  /** Display name used when a quote source does not return one. */
  name: string;
  shares: number;
  /**
   * Total dollars paid for the lot, not the per-share price.
   * Average cost is costBasis / shares.
   */
  costBasis: number;
  /** Purchase date as YYYY-MM-DD. */
  openedOn: string;
};

/**
 * The book is intentional source data. Each cost basis is the total amount paid.
 * The similar dollar totals are equal-weight allocations, not per-share prices.
 */
export const POSITIONS: readonly Position[] = [
  { ticker: "ALAB", name: "Astera Labs", shares: 75, costBasis: 15872.0, openedOn: "2026-11-10" },
  { ticker: "ASTS", name: "AST SpaceMobile", shares: 495, costBasis: 15889.55, openedOn: "2026-11-10" },
  { ticker: "IONQ", name: "IonQ", shares: 463, costBasis: 16098.88, openedOn: "2026-11-10" },
  { ticker: "IREN", name: "IREN", shares: 831, costBasis: 16001.75, openedOn: "2026-11-10" },
  { ticker: "MSTR", name: "Strategy", shares: 126, costBasis: 19310.72, openedOn: "2026-10-12" },
  { ticker: "NBIS", name: "Nebius", shares: 120, costBasis: 15888.2, openedOn: "2026-11-10" },
  { ticker: "OKLO", name: "Oklo", shares: 642, costBasis: 16125.62, openedOn: "2026-11-10" },
  { ticker: "RKLB", name: "Rocket Lab", shares: 335, costBasis: 17914.1, openedOn: "2026-10-26" },
];
