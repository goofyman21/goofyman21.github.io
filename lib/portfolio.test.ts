import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POSITIONS } from "./positions";
import { summarize, valuePosition, withWeights } from "./portfolio";
import type { Quote } from "./types";

function quote(partial: Partial<Quote> & Pick<Quote, "symbol" | "price" | "previousClose">): Quote {
  return {
    name: partial.symbol,
    currency: "USD",
    asOf: null,
    history: [],
    source: "yahoo",
    ...partial,
  };
}

describe("positions", () => {
  it("matches the hardcoded book", () => {
    assert.deepEqual(
      POSITIONS.map((position) => [
        position.ticker,
        position.shares,
        position.costBasis,
        position.openedOn,
      ]),
      [
        ["ALAB", 75, 15872, "2026-11-10"],
        ["ASTS", 495, 15889.55, "2026-11-10"],
        ["IONQ", 463, 16098.88, "2026-11-10"],
        ["IREN", 831, 16001.75, "2026-11-10"],
        ["MSTR", 126, 19310.72, "2026-10-12"],
        ["NBIS", 120, 15888.2, "2026-11-10"],
        ["OKLO", 642, 16125.62, "2026-11-10"],
        ["RKLB", 335, 17914.1, "2026-10-26"],
      ],
    );
  });

  it("treats cost basis as the total dollars paid", () => {
    const cents = Math.round(POSITIONS.reduce((sum, position) => sum + position.costBasis, 0) * 100);
    assert.equal(cents, 13310082);
  });
});

describe("portfolio math", () => {
  it("computes market value, unrealized P&L, and day change", () => {
    const position = { ticker: "TEST", name: "Test", shares: 5, costBasis: 40, openedOn: "2026-11-10" };
    const row = valuePosition(position, quote({ symbol: "TEST", price: 10, previousClose: 8 }));
    assert.equal(row.marketValue, 50);
    assert.equal(row.unrealized, 10);
    assert.equal(row.unrealizedPct, 25);
    assert.equal(row.dayAmount, 10);
    assert.equal(row.dayPct, 25);
    assert.equal(row.averageCost, 8);
  });

  it("keeps an unpriced position out of the totals", () => {
    const priced = valuePosition(
      { ticker: "AAA", name: "A", shares: 5, costBasis: 40, openedOn: "2026-11-10" },
      quote({ symbol: "AAA", price: 10, previousClose: 8 }),
    );
    const missing = valuePosition(
      { ticker: "BBB", name: "B", shares: 2, costBasis: 30, openedOn: "2026-11-10" },
      quote({ symbol: "BBB", price: null, previousClose: null }),
    );
    const rows = withWeights([priced, missing]);
    const summary = summarize(rows);

    assert.equal(summary.positionCount, 2);
    assert.equal(summary.pricedCount, 1);
    assert.equal(summary.marketValue, 50);
    assert.equal(summary.costBasis, 40);
    assert.equal(summary.unrealized, 10);
    assert.equal(summary.dayAmount, 10);
    assert.equal(summary.dayPct, 25);
    assert.equal(rows[0]?.weight, 100);
    assert.equal(rows[1]?.weight, null);
  });

  it("weights two priced positions by market value", () => {
    const rows = withWeights([
      valuePosition(
        { ticker: "AAA", name: "A", shares: 1, costBasis: 10, openedOn: "2026-11-10" },
        quote({ symbol: "AAA", price: 25, previousClose: 20 }),
      ),
      valuePosition(
        { ticker: "BBB", name: "B", shares: 1, costBasis: 70, openedOn: "2026-11-10" },
        quote({ symbol: "BBB", price: 75, previousClose: 80 }),
      ),
    ]);
    const summary = summarize(rows);
    assert.equal(summary.marketValue, 100);
    assert.equal(summary.unrealized, 20);
    assert.equal(rows[0]?.dayAmount, 5);
    assert.equal(rows[1]?.dayAmount, -5);
    assert.equal(summary.dayAmount, 0);
    assert.equal(summary.dayPct, 0);
    assert.equal(rows[0]?.weight, 25);
    assert.equal(rows[1]?.weight, 75);
  });
});
