// src/data/live_pairs.ts
import fetch from "node-fetch";

export interface PairInfo {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: string;
  quoteToken: string;
  priceUsd: number;
  volume24h: number;
  buysH1: number;
  sellsH1: number;
  score: number;
}

// Chains to scan
const CHAINS = ["base", "ethereum", "bsc", "arbitrum", "polygon"];

function chainUrl(chain: string) {
  return `https://api.dexscreener.com/latest/dex/pairs/${chain}`;
}

export async function findBestPairs(limit: number = 5): Promise<PairInfo[]> {
  const results: PairInfo[] = [];

  for (const chain of CHAINS) {
    try {
      const res = await fetch(chainUrl(chain), {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
        },
      });

      if (!res.ok) continue;

      const json = await res.json();
      if (!json?.pairs) continue;

      for (const p of json.pairs) {
        if (!p.priceUsd || !p.txns) continue;

        const buys = p.txns?.h1?.buys ?? 0;
        const sells = p.txns?.h1?.sells ?? 0;
        const volume = p.volume?.h24 ?? 0;

        const score =
          (buys - sells) * 2 +
          volume / 20000 +
          (Number(p.priceUsd) > 0.000001 ? 1 : -1);

        results.push({
          chainId: p.chainId,
          dexId: p.dexId,
          pairAddress: p.pairAddress,
          baseToken: p.baseToken?.symbol ?? "?",
          quoteToken: p.quoteToken?.symbol ?? "?",
          priceUsd: Number(p.priceUsd),
          volume24h: volume,
          buysH1: buys,
          sellsH1: sells,
          score,
        });
      }
    } catch (err) {
      console.log(`⚠️ Chain fetch failed: ${chain}`);
      continue;
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
