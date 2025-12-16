// src/data/base_scanner.ts
import fetch from "node-fetch";

/**
 * Fetch detailed market data for a token
 * Uses DexScreener token endpoint (EVM-safe)
 */
export async function getTokenMarketData(address: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`DexScreener token fetch failed (status ${res.status})`);
  }

  const data = await res.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error("No pairs found for token.");
  }

  // Pick highest-liquidity pair
  const pair = data.pairs.sort(
    (a: any, b: any) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  return {
    price: Number(pair.priceUsd || 0),
    liquidity: pair.liquidity?.usd || 0,
    volume1h: pair.volume?.h1 || 0,
    volume24h: pair.volume?.h24 || 0,
    changePct1h: pair.priceChange?.h1 ?? 0,
    volatility1h:
      Math.abs(pair.priceChange?.h1 ?? 0),
    spread: pair.priceImpact || 0,
    pair,
  };
}

/**
 * Get active Base tokens using DexScreener unblocked endpoints
 */
export async function getActiveBaseTokens(limit = 60) {
  const endpoints = [
    "https://api.dexscreener.com/latest/dex/search?q=base",
    "https://api.dexscreener.com/latest/dex/search?q=uniswap%20base",
    "https://api.dexscreener.com/latest/dex/trending?chain=base",
  ];

  const headers = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  };

  const results = await Promise.all(
    endpoints.map(async (url) => {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return data.pairs || [];
      } catch {
        return [];
      }
    })
  );

  const pairs = results.flat();
  const map = new Map<string, any>();

  for (const p of pairs) {
    if (!p) continue;
    if (p.chainId !== "base") continue;
    if (!p.baseToken?.address) continue;

    const address = p.baseToken.address.toLowerCase();
    const liquidity = p.liquidity?.usd || 0;
    const volume1h = p.volume?.h1 || 0;
    const price = Number(p.priceUsd || 0);
    const spread = p.priceImpact || 0;
    const changePct1h = p.priceChange?.h1 ?? 0;

    // Keep highest-liquidity version per token
    if (!map.has(address) || map.get(address).liquidity < liquidity) {
      map.set(address, {
        address,
        symbol: p.baseToken.symbol,
        liquidity,
        volume1h,
        price,
        spread,
        changePct1h,
      });
    }
  }

  const tokens = [...map.values()]
    .filter((t) => t.liquidity >= 1_200)
    .filter((t) => t.volume1h >= 200)
    .filter((t) => Math.abs(t.changePct1h) >= 0.3) // 🔥 REAL momentum
    .filter((t) => t.spread <= 40)
    .sort((a, b) => b.volume1h - a.volume1h)
    .slice(0, limit);

  console.log("TOKENS AFTER FILTER:", tokens.length);
  return tokens;
}
