import fetch from "node-fetch";

/**
 * Fetch and score top Solana pairs based on activity.
 * Adjust thresholds and scoring weights below to your liking.
 */
export async function getTopSolanaPairs(limit = 10) {
  // ✅ use "by chain" endpoint instead of search
  const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=chain:solana");
  if (!res.ok) throw new Error(`DexScreener error: ${res.statusText}`);
  const json = await res.json();
  const pairs = json.pairs ?? [];

  // --- tweakable filters ---
  const MIN_LIQUIDITY = 0;
  const MAX_LIQUIDITY = 10000000;
  const MIN_VOLUME_24H = 0;
  const MIN_PRICE_CHANGE_5M = 0;
  const MIN_TXNS_5M = 0;

  // --- scoring weights ---
  const WEIGHT_VOL = 1.0;
  const WEIGHT_CHANGE = 2.0;
  const WEIGHT_TXNS = 0.5;

  const scored = pairs
    .filter((p) => {
      const liq = Number(p.liquidity?.usd ?? 0);
      const vol = Number(p.volume?.h24 ?? 0);
      const change = Number(p.priceChange?.m5 ?? 0);
      const txns = Number(p.txns?.m5 ?? 0);
      return (
        liq >= MIN_LIQUIDITY &&
        liq <= MAX_LIQUIDITY &&
        vol >= MIN_VOLUME_24H &&
        Math.abs(change) >= MIN_PRICE_CHANGE_5M &&
        txns >= MIN_TXNS_5M
      );
    })
    .map((p) => {
      const vol = Number(p.volume?.h24 ?? 0);
      const change = Number(p.priceChange?.m5 ?? 0);
      const txns = Number(p.txns?.m5 ?? 0);
      const score =
        WEIGHT_VOL * Math.log10(vol + 1) +
        WEIGHT_CHANGE * Math.abs(change) +
        WEIGHT_TXNS * txns;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    console.warn("⚠️ No pairs passed filters. Try loosening thresholds.");
  }

  return scored.slice(0, limit);
}

export async function getPairData(pairAddress) {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.pair ?? null;
}

export async function* liveDexFeed(pairAddress, intervalSec = 5) {
  console.log(`🔴 Live stream started for ${pairAddress}`);
  while (true) {
    try {
      const data = await getPairData(pairAddress);
      if (data) {
        yield {
          ts: Date.now(),
          price: Number(data.priceUsd),
          liquidityUSD: Number(data.liquidity?.usd ?? 0),
          vol24hUSD: Number(data.volume?.h24 ?? 0),
          base: data.baseToken.symbol,
          quote: data.quoteToken.symbol,
        };
      }
    } catch (err) {
      console.error("Feed error:", err.message);
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
}
