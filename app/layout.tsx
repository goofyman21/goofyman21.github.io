import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { startupImages } from "@/lib/startup-images";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const description =
  "A private portfolio dashboard for live prices, cost basis, unrealized P&L, and day change.";

export const metadata: Metadata = {
  title: {
    default: "Meridian",
    template: "%s · Meridian",
  },
  description,
  applicationName: "Meridian",
  appleWebApp: {
    capable: true,
    title: "Meridian",
    statusBarStyle: "black-translucent",
    startupImage: startupImages.map((image) => ({
      url: image.url,
      media: image.media,
    })),
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
