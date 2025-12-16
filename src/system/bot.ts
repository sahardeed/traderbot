import pino from "pino";
import { getActiveBaseTokens, getTokenMarketData } from "../data/base_scanner.ts";
import { getMomentumSignal } from "../signals/momentum.js";
import { RiskManager } from "../risk/risk.js";
import { Executor } from "../execution/executor.js";

export class Bot {
  private log = pino({ level: "info" });
  private risk = new RiskManager(1000);
  private executor = new Executor();
  private interval: number;

  constructor(intervalMs: number) {
    this.interval = intervalMs;
  }

  async run() {
    this.log.info("🔍 Fetching liquid tokens...");

    let tokens: any[] = [];
    try {
      tokens = await getActiveBaseTokens(40);
    } catch (err) {
      this.log.warn({ err: String(err) }, "⚠️ Token discovery failed");
      await new Promise((r) => setTimeout(r, this.interval));
      return this.run();
    }

    for (const t of tokens) {
      this.log.info({ tokenObj: t }, "RAW TOKEN INPUT");

      try {
        const md = await getTokenMarketData(t.address);

        // ------------------------------
        // 1. LIQUIDITY FILTER
        // ------------------------------
        if (md.liquidity < 20000) {
          this.log.info(
            { token: t.symbol, liq: md.liquidity },
            "Skipping low liquidity"
          );
          continue;
        }

        // ------------------------------
        // 2. SPREAD FILTER
        // Allow a realistic Base spread
        // ------------------------------
        if (md.spread > 20) {
          this.log.info(
            { token: t.symbol, spread: md.spread },
            "Skipping wide spread"
          );
          continue;
        }

        // ------------------------------
        // 3. MOMENTUM CHECK
        // Make realistic thresholds
        // ------------------------------
        const signal = await getMomentumSignal(t.address);

        const goodMomentum =
          signal.changePct > 0.01 && signal.volatility > 0.01;

        if (!goodMomentum) {
          this.log.info(
            {
              token: t.symbol,
              reason: "Weak momentum",
              changePct: signal.changePct,
              volatility: signal.volatility,
            },
            "Skipping weak momentum"
          );
          continue;
        }

        // ------------------------------
        // 4. EXECUTE BUY
        // ------------------------------
        const positionUsd = this.risk.sizePosition();

        const buy = await this.executor.simulateBuy({
          token: t.symbol,
          price: md.price,
          amountUsd: positionUsd,
        });

        const target = buy.fillPrice * 1.003; // +0.3%
        const stop = buy.fillPrice * 0.997;   // -0.3%

        this.log.info(
          {
            token: t.symbol,
            entry: buy.fillPrice,
            target,
            stop,
          },
          "📥 BUY EXECUTED — watching price"
        );

        // Wait 4 seconds before checking
        await new Promise((r) => setTimeout(r, 4000));

        // ------------------------------
        // 5. EXIT TRADE
        // ------------------------------
        const md2 = await getTokenMarketData(t.address);
        const currentPrice = md2.price;

        let result: string;
        if (currentPrice >= target) result = "TP";
        else if (currentPrice <= stop) result = "SL";
        else result = "TIMEOUT";

        const sell = await this.executor.simulateSell({
          token: t.symbol,
          price: currentPrice,
          amountUsd: positionUsd,
        });

        const pnl =
          ((sell.fillPrice - buy.fillPrice) / buy.fillPrice) * positionUsd;

        this.log.info(
          {
            token: t.symbol,
            entry: buy.fillPrice,
            exit: sell.fillPrice,
            pnl,
            result,
          },
          "💾 TRADE RESULT"
        );
      } catch (err) {
        this.log.warn({ token: t.symbol, err: String(err) }, "⚠️ SKIPPED TOKEN");
      }
    }

    this.log.info("🔁 Loop complete. Restarting...");
    await new Promise((r) => setTimeout(r, this.interval));
    return this.run();
  }
}
