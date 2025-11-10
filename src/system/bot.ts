import fs from "fs";
import pino from "pino";
import { MomentumStrategy } from "../strategies/momentum.js";
import { RiskEngine } from "../risk/risk.js";
import { PaperExecutor } from "../execution/paper.js";
import { liveDexFeed, getTopSolanaPairs } from "../data/live_dexscreener.js";

const log = pino({ level: "info" });

export class Bot {
  constructor(opts) {
    this.risk = opts.risk;
    this.strat = opts.strat;
    this.exec = opts.exec;
    this.csvPath = "trade_log.csv";
    if (!fs.existsSync(this.csvPath))
      fs.writeFileSync(this.csvPath, "timestamp,price,side,pnlUSD,equity\n");
  }

  async run() {
    log.info("🌐 Starting LIVE DexScreener scout mode...");

    // --- tweakable time settings ---
    const MIN_WATCH_MIN = 20;   // must observe a coin for at least this long
    const MAX_WATCH_MIN = 40;   // force switch after this time
    const SCAN_INTERVAL_MIN = 15; // rescan DexScreener this often

    while (true) {
      // Step 1: choose the best coin
      const pairs = await getTopSolanaPairs(5);
      if (!pairs.length) throw new Error("No Solana pairs found on DexScreener");

      const pair = pairs[0];
      log.info(
        `🚀 Tracking ${pair.baseToken.symbol}/${pair.quoteToken.symbol} | Score: ${pair.score.toFixed(2)}`
      );

      // Step 2: stream data for this coin
      let startTime = Date.now();
      const hist = [];
      let nextScan = Date.now() + SCAN_INTERVAL_MIN * 60000;

      for await (const tick of liveDexFeed(pair.pairAddress, 5)) {
        const price = tick.price;
        const ts = tick.ts;
        hist.push(tick);
        if (hist.length > 240) hist.shift();

        const snap = {
          ts,
          price,
          ret3m:
            hist.length > 3
              ? (price - hist[hist.length - 3].price) /
                hist[hist.length - 3].price
              : 0,
          volImpulse: 1,
          high20m: Math.max(...hist.map((h) => h.price)),
          liquidityUSD: tick.liquidityUSD,
          spreadPct: 0.5,
          top10HolderPct: 50,
        };

        // --- trade logic ---
        if (!this.exec.hasOpen() && this.strat.shouldEnter(snap)) {
          const order = this.strat.buildOrder();
          if (this.risk.canOpenTrade(order.stopPct)) {
            const notional = this.risk.usdFor(order.stopPct);
            const stopPx = snap.price * (1 - order.stopPct);
            this.exec.buy(snap.price, notional, stopPx, snap.ts);
            this.risk.onOpen(order.stopPct);
            log.info(`BUY @ ${snap.price.toFixed(6)}`);
            fs.appendFileSync(
              this.csvPath,
              `${snap.ts},${snap.price},"BUY",0,${this.risk.snapshot().equityUSD}\n`
            );
          }
        }

        if (this.exec.hasOpen() && hist.length % 12 === 0) {
          const res = this.exec.close(snap.price * 1.02, snap.ts);
          if (res) {
            this.risk.onClose(res.pnlUSD);
            log.info(`SELL @ ${(snap.price * 1.02).toFixed(6)} | PnL: ${res.pnlUSD.toFixed(2)}`);
            fs.appendFileSync(
              this.csvPath,
              `${snap.ts},${snap.price},"SELL",${res.pnlUSD},${this.risk.snapshot().equityUSD}\n`
            );
          }
        }

        // --- attention span logic ---
        const minutesWatched = (Date.now() - startTime) / 60000;
        if (minutesWatched > MIN_WATCH_MIN && (Date.now() > nextScan || minutesWatched > MAX_WATCH_MIN)) {
          log.info("⏩ Time to re-scan market for a hotter coin...");
          await this.updateSummary(`${pair.baseToken.symbol}/${pair.quoteToken.symbol}`, this.exec.history ?? []);
          this.exec.history = []; // reset for next coin
          break; // exit inner loop to switch to a new pair
        }
      }
    }
  }
  async updateSummary(pairSymbol, trades) {
  const SUMMARY_PATH = "summary_by_coin.csv";
  if (!fs.existsSync(SUMMARY_PATH))
    fs.writeFileSync(SUMMARY_PATH, "pairSymbol,totalTrades,avgPnLUSD,totalPnLUSD\n");

  if (!trades || trades.length === 0) return;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnlUSD || 0), 0);
  const avgPnL = totalPnL / trades.length;
  const line = `${pairSymbol},${trades.length},${avgPnL.toFixed(2)},${totalPnL.toFixed(2)}\n`;
  fs.appendFileSync(SUMMARY_PATH, line);
}

}
