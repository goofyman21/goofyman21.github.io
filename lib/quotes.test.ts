import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dayKey,
  parseAlphaQuote,
  parseFinnhubQuote,
  parseMoney,
  parseNasdaqInfo,
  parseYahooChart,
  tidyName,
} from "./quotes";

const session = Math.floor(Date.parse("2026-11-24T21:00:00Z") / 1000);
const prior = Math.floor(Date.parse("2026-11-23T14:30:00Z") / 1000);
const todayBar = Math.floor(Date.parse("2026-11-24T14:30:00Z") / 1000);
const regularStart = Math.floor(Date.parse("2026-11-24T14:30:00Z") / 1000);
const regularEnd = Math.floor(Date.parse("2026-11-24T21:00:00Z") / 1000);

describe("quote parsing", () => {
  it("tidies company names", () => {
    assert.equal(tidyName("Astera Labs, Inc."), "Astera Labs");
    assert.equal(tidyName("Rocket Lab USA, Inc."), "Rocket Lab USA");
    assert.equal(tidyName("Rocket Lab Corporation"), "Rocket Lab");
    assert.equal(tidyName("Nebius Group"), "Nebius Group");
    assert.equal(tidyName("Oklo Inc. Common Stock"), "Oklo");
    assert.equal(tidyName("Strategy Inc Common Stock Class A"), "Strategy");
    assert.equal(tidyName("AST SpaceMobile, Inc. Class A"), "AST SpaceMobile");
    assert.equal(tidyName("Nebius Group N.V. Class A Ordinary Shares"), "Nebius Group");
    assert.equal(tidyName("IREN Limited Ordinary Shares"), "IREN");
  });

  it("parses money strings", () => {
    assert.equal(parseMoney("$1,234.50"), 1234.5);
    assert.equal(parseMoney("-32.42"), -32.42);
    assert.equal(parseMoney("($4.00)"), -4);
    assert.equal(parseMoney(""), null);
    assert.equal(parseMoney("N/A"), null);
  });

  it("uses the prior daily close when the last bar is the regular session", () => {
    const parsed = parseYahooChart(
      {
        chart: {
          result: [
            {
              meta: {
                symbol: "ALAB",
                longName: "Astera Labs, Inc.",
                currency: "USD",
                regularMarketPrice: 191.3,
                regularMarketTime: session,
                exchangeTimezoneName: "America/New_York",
                currentTradingPeriod: {
                  pre: { start: regularStart - 3600, end: regularStart },
                  regular: { start: regularStart, end: regularEnd },
                  post: { start: regularEnd, end: regularEnd + 3600 },
                },
              },
              timestamp: [prior - 86400, prior, todayBar, todayBar + 60],
              indicators: { quote: [{ close: [210, 222.12, null, 190] }] },
            },
          ],
        },
      },
      "ALAB",
      regularStart + 60,
    );

    assert.equal(dayKey(session, "America/New_York"), "2026-11-24");
    assert.equal(parsed.price, 191.3);
    assert.equal(parsed.previousClose, 222.12);
    assert.equal(parsed.name, "Astera Labs");
    assert.deepEqual(parsed.history, [210, 222.12, 191.3]);
    assert.equal(parsed.marketPhase, "open");
  });

  it("keeps the latest completed session when that bar is the regular-market print", () => {
    const parsed = parseYahooChart(
      {
        chart: {
          result: [
            {
              meta: {
                symbol: "MSTR",
                shortName: "Strategy Inc",
                regularMarketPrice: 150,
                regularMarketTime: prior,
                exchangeTimezoneName: "America/New_York",
              },
              timestamp: [prior - 86400, prior],
              indicators: { quote: [{ close: [140, 150] }] },
            },
          ],
        },
      },
      "MSTR",
      prior + 10,
    );

    assert.equal(parsed.previousClose, 140);
    assert.equal(parsed.price, 150);
    assert.equal(parsed.name, "Strategy");
    assert.equal(parsed.marketPhase, "unknown");
  });

  it("uses the last bar as previous close when the session day has no bar yet", () => {
    const parsed = parseYahooChart(
      {
        chart: {
          result: [
            {
              meta: {
                symbol: "MSTR",
                regularMarketPrice: 150,
                regularMarketTime: session,
                exchangeTimezoneName: "America/New_York",
              },
              timestamp: [prior - 86400, prior],
              indicators: { quote: [{ close: [140, 150] }] },
            },
          ],
        },
      },
      "MSTR",
      session,
    );

    assert.equal(parsed.previousClose, 150);
  });

  it("derives Nasdaq previous close from the session change", () => {
    const parsed = parseNasdaqInfo(
      {
        data: {
          companyName: "Astera Labs, Inc. Common Stock",
          marketStatus: "Closed",
          primaryData: { lastSalePrice: "$189.70", netChange: "" },
          secondaryData: { lastSalePrice: "$189.70", netChange: "-32.42" },
        },
      },
      "ALAB",
    );

    assert.equal(parsed.price, 189.7);
    assert.equal(parsed.previousClose, 222.12);
    assert.equal(parsed.name, "Astera Labs");
    assert.equal(parsed.source, "nasdaq");
    assert.equal(parsed.marketPhase, "closed");
  });

  it("reads Finnhub and Alpha Vantage quotes", () => {
    const finnhub = parseFinnhubQuote({ c: 20, pc: 18, t: session }, "OKLO");
    assert.equal(finnhub.price, 20);
    assert.equal(finnhub.previousClose, 18);

    assert.throws(() => parseFinnhubQuote({ c: 0, pc: 18 }, "OKLO"), /Finnhub price missing/);

    const alpha = parseAlphaQuote(
      { "Global Quote": { "01. symbol": "RKLB", "05. price": "53.25", "08. previous close": "51.00" } },
      "RKLB",
    );
    assert.equal(alpha.price, 53.25);
    assert.equal(alpha.previousClose, 51);

    assert.throws(() => parseAlphaQuote({ Note: "Thank you for using Alpha Vantage" }, "RKLB"), /Alpha Vantage/);
  });
});
