import fetch from "node-fetch";

export interface PairInfo {
  pairAddress: string;
  priceUsd: number;
  volume24h: number;
  buysH1: number;
  sellsH1: number;
}

export async function findBestSolanaPair(): Promise<PairInfo | null> {
  const url = "https://api.dexscreener.com/latest/dex/pairs/solana";
  const res = await fetch(url);

  if (!res.ok) return null;

  const json = await res.json();
  if (!json?.pairs) return null;

  // Extract real DexScreener Solana pairs
  const solPairs = json.pairs.filter((p: any) =>
    Number(p.priceUsd) > 0 &&                     // must have valid price
    (p.volume?.h24 ?? 0) > 5000 &&                // loosened volume floor
    (p.liquidity?.usd ?? 0) > 500 &&              // loosened liquidity floor
    ((p.txns?.h1?.buys ?? 0) + (p.txns?.h1?.sells ?? 0)) > 5 // loosened activity filter
  );

  if (solPairs.length === 0) {
    return null;
  }

  // Score active pairs
  const scored = solPairs.map((p: any) => {
    const buys = p.txns?.h1?.buys ?? 0;
    const sells = p.txns?.h1?.sells ?? 0;
    const volume = p.volume?.h24 ?? 0;

    return {
      pairAddress: p.pairAddress,
      priceUsd: Number(p.priceUsd),
      volume24h: volume,
      buysH1: buys,
      sellsH1: sells,
      score: (buys - sells) + volume / 20000, // slightly slower weight
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0];
}
