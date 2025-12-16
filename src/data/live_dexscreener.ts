import axios from "axios";

const QUERIES = [
  "solana",
  "sol",
  "eth",
  "ethereum",
  "bsc",
  "binance",
  "base"
];

export async function getTopPairsMultiChain() {
  const results: any[] = [];

  for (const q of QUERIES) {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${q}`;

    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "application/json",
        },
      });

      const data = res.data;

      console.log(`🔍 Query '${q}' returned:`,
        Array.isArray(data.pairs) ? data.pairs.length : "NO PAIRS KEY"
      );

      if (data.pairs && data.pairs.length > 0) {
        // sort by 24h volume descending
        const sorted = data.pairs.sort((a, b) =>
          (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0)
        );

        // take the top 15 for each search
        results.push(...sorted.slice(0, 15));
      }

    } catch (err: any) {
      console.log(`[WARN] DexScreener search '${q}' failed:`, err.message);
    }
  }

  if (results.length === 0) {
    throw new Error("No pairs found across all search queries.");
  }

  return results;
}
