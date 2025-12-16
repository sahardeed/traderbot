// src/data/price_feed.ts
import fetch from "node-fetch";

export interface MarketSnapshot {
  priceUsd: number;
  changePct1h: number;
  volume1h: number;
  liquidityUsd: number;
  pairAddress: string;
  dexId: string;
}

/**
 * Fetch best available market data for an EVM token using DexScreener
 * - Selects highest-liquidity pair
 * - Uses Dex-native price + momentum
 * - No Jupiter (Solana-only, incompatible here)
 */
export async function getMarketSnapshot(
  tokenAddress: string
): Promise<MarketSnapshot> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 3000,
  });

  if (!res.ok) {
    throw new Error(`DexScreener fetch failed (${res.status})`);
  }

  const data = await res.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error("No DexScreener pairs found");
  }

  // Pick highest liquidity USD pair
  const bestPair = data.pairs.sort(
    (a: any, b: any) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  return {
    priceUsd: Number(bestPair.priceUsd),
    changePct1h: Number(bestPair.priceChange?.h1 ?? 0),
    volume1h: Number(bestPair.volume?.h1 ?? 0),
    liquidityUsd: Number(bestPair.liquidity?.usd ?? 0),
    pairAddress: bestPair.pairAddress,
    dexId: bestPair.dexId,
  };
}
