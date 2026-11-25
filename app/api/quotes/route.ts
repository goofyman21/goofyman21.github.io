import { connection } from "next/server";
import { cacheTtlMs, loadQuotes, resolveProvider } from "@/lib/quote-providers";
import type { QuotesResponse } from "@/lib/types";

type Memory = {
  at: number;
  body: QuotesResponse;
};

let memory: Memory | null = null;
let pending: Promise<QuotesResponse> | null = null;

function json(body: QuotesResponse, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  await connection();
  const now = Date.now();

  if (memory && now - memory.at < cacheTtlMs(memory.body.provider)) {
    return json(memory.body);
  }

  try {
    if (!pending) {
      pending = loadQuotes().finally(() => {
        pending = null;
      });
    }
    const body = await pending;
    memory = { at: Date.now(), body };
    return json(body);
  } catch (error) {
    console.error("[quotes] refresh failed", error instanceof Error ? error.message : "unknown");
    if (memory) {
      return json({
        ...memory.body,
        stale: true,
        warning: "Live quotes are temporarily unavailable. Showing the last successful prices.",
      });
    }

    return json({
      provider: resolveProvider(),
      fetchedAt: new Date().toISOString(),
      marketPhase: "unknown",
      quotes: [],
      stale: true,
      warning: "Live quotes are temporarily unavailable.",
    });
  }
}
