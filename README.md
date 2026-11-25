# Meridian

A private portfolio dashboard. It marks eight hardcoded holdings to live prices, shows unrealized P&L against total cost basis, and installs on an iPhone home screen as a standalone app.

Meridian is not a broker and it does not place orders.

## Book

Cost basis is the **total dollars paid for the lot**, not the price per share. Average cost is `cost basis / shares`. Edit the book in [`lib/positions.ts`](lib/positions.ts).

| Ticker | Shares | Cost basis | Opened |
| --- | ---: | ---: | --- |
| ALAB | 75 | $15,872.00 | 2026-11-10 |
| ASTS | 495 | $15,889.55 | 2026-11-10 |
| IONQ | 463 | $16,098.88 | 2026-11-10 |
| IREN | 831 | $16,001.75 | 2026-11-10 |
| MSTR | 126 | $19,310.72 | 2026-10-12 |
| NBIS | 120 | $15,888.20 | 2026-11-10 |
| OKLO | 642 | $16,125.62 | 2026-11-10 |
| RKLB | 335 | $17,914.10 | 2026-10-26 |

Combined cost basis: **$133,100.82**.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- A server route proxies quotes so API keys never reach the browser
- Installable PWA: web manifest, Apple touch icon and startup images, service worker

## Requirements

- Node.js 20.9 or newer

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Yahoo Finance is the default source and does not need a key. `.env.local` is optional unless you change provider. It is gitignored. Commit `.env.example` only.

### Environment

| Variable | Purpose |
| --- | --- |
| `PRICE_PROVIDER` | `yahoo` (default), `finnhub`, or `alphavantage` |
| `FINNHUB_API_KEY` | Server-only. Required for `PRICE_PROVIDER=finnhub`. If it is empty, Meridian falls back to Yahoo and says so. |
| `ALPHA_VANTAGE_API_KEY` | Server-only. Required for `PRICE_PROVIDER=alphavantage`. Same fallback if empty. |
| `QUOTE_CACHE_SECONDS` | How long the server reuses a successful fetch. Default 20 seconds for Yahoo and Finnhub, 12 hours for Alpha Vantage. |
| `NEXT_PUBLIC_REFRESH_SECONDS` | How often the open app asks for prices. Clamped to 30–60. Default 45. |

Get a Finnhub key at [finnhub.io/register](https://finnhub.io/register) or an Alpha Vantage key at [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key).

Alpha Vantage's free tier cannot refresh eight symbols every minute. Leave the cache at 12 hours, or set `QUOTE_CACHE_SECONDS` if you have a higher quota.

If Yahoo rate-limits a symbol, that symbol is filled from Nasdaq's public quote endpoint.

## Scripts

```bash
npm run dev        # local development
npm run test       # portfolio math and quote parsers
npm run lint
npm run typecheck
npm run build
npm run start      # production server, required to exercise the service worker
npm run icons      # regenerate icons and iPhone splash screens
```

## What the screen shows

- Portfolio value, unrealized gain or loss, day change, position count, and the last refresh time
- Per position: ticker, price, previous close, quantity, market value, total cost basis, unrealized dollars and percent, and day change
- A 12-session sparkline when the source provides daily closes
- Allocation by market value

Day change is the latest regular-session price versus the previous session close. Totals skip any position that did not return a price, and the card says so. The last good price for a symbol is kept if a later refresh misses it. A copy of the last payload is stored in `localStorage` under `meridian.snapshot.v1`, so a reload can paint immediately.

Timestamps on the Updated card use the device time zone. Last-trade time is shown in New York exchange time.

## PWA and iPhone home screen

The app is a standalone progressive web app.

- Manifest: name, short name, icons, `theme_color`, `background_color`, `display: standalone`, `start_url`, and `scope`
- Apple web app title, `black-translucent` status bar, `apple-touch-icon`, and portrait startup images for common iPhones
- Service worker caches the shell and the last successful quote response. A later visit with no network opens the cached app, and the screen falls back to the last saved book
- `viewport-fit=cover` plus safe-area padding so the layout clears the notch and the home indicator

The service worker registers in production only (`npm run build && npm run start`). Development stays uncached so reloads stay honest.

### Add it on an iPhone

1. Deploy the app over HTTPS, or open it from a machine Safari can reach. iOS only treats a site as an installable web app in a secure context. `localhost` on the phone itself qualifies; a desktop `localhost` does not.
2. Open the site in Safari.
3. Tap Share, then **Add to Home Screen**.
4. Open Meridian from the icon. It launches without Safari's address bar, on the dark startup image, then shows the book.

Chrome on desktop can install it from the address bar once you are on the production server. The installed scope is `/`.

### Icons

Generated files:

- `app/icon.png`, `app/apple-icon.png`
- `public/favicon.ico`
- `public/icons/favicon-32.png`
- `public/icons/icon-192.png`, `public/icons/icon-512.png`
- `public/icons/icon-maskable-192.png`, `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`
- `public/splash/*.png` for iPhone SE, 11, 14 / 14 Plus, 14 Pro / Pro Max, 16 Pro, and 16 Pro Max

iPhone 14 and 15 share sizes, and iPhone 16 / 16 Plus share the 14 Pro logical sizes, so those startup images cover them too. To draw them again:

```bash
python3 -m pip install pillow
npm run icons
```

The generator is [`scripts/generate-pwa-assets.py`](scripts/generate-pwa-assets.py). Startup media queries live in [`lib/startup-images.ts`](lib/startup-images.ts); keep the two lists aligned if you add a device.

## Deploy

The quote route needs a Node server. Vercel, or any host that runs `next build` and `next start`, works. GitHub Pages cannot host this app because it only serves static files and cannot proxy Yahoo, Finnhub, or Alpha Vantage.

Set the environment variables in the host's secret store. Do not commit `.env.local`.

## Project layout

```
app/                routes, manifest, global styles, icons Next serves automatically
app/api/quotes      server quote proxy
components/         dashboard UI
lib/positions.ts    the book
lib/portfolio.ts    P&L math
lib/quotes.ts       response parsers
lib/quote-providers.ts
public/sw.js        offline shell
public/offline.html
public/icons        manifest and Apple icons
public/splash       iPhone startup images
```

## Privacy

Holdings live in this repository and in the browser's local storage. The server requests only the eight symbols above. Provider keys stay on the server.
