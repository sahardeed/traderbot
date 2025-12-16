// src/signals/momentum.ts
import fetch from "node-fetch";

function std(arr: number[]) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance =
    arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

export async function getMomentumSignal(address: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) {
    throw new Error(`DexScreener fetch failed (${res.status})`);
  }

  const data = await res.json();

  if (!data.pairs || data.pairs.length === 0) {
    return { changePct: 0, volatility: 0, direction: "NONE" };
  }

  // Highest liquidity pair = most reliable signal
  const pair = data.pairs.sort(
    (a: any, b: any) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  const changePct = Number(pair.priceChange?.h1 ?? 0);

  // Use short-term candle changes as volatility proxy
  const volatility = std([
    pair.priceChange?.m5 ?? 0,
    pair.priceChange?.m15 ?? 0,
    pair.priceChange?.h1 ?? 0,
  ]);

  return {
    changePct,
    volatility,
    direction:
      changePct > 0 ? "UP" : changePct < 0 ? "DOWN" : "NONE",
  };
}
