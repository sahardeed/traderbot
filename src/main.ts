import "dotenv/config";
import { Bot } from "./system/bot.js";
import { RiskEngine } from "./risk/risk.js";
import { MomentumStrategy } from "./strategies/momentum.js";
import { PaperExecutor } from "./execution/paper.js";

const risk = new RiskEngine({
  perTradeRiskUSD: 50,
  maxOpenRiskPct: 3,
  dailyLossCapPct: 3,
  slippageBps: 40,
  feeBpsPerSide: 30,
});

const strat = new MomentumStrategy({
  ret3m: 0.04,
  volImpulse: 2.0,
  breakoutLookbackMin: 20,
  minLiquidityUSD: 80000,
  maxSpreadPct: 1.2,
  holderTop10MaxPct: 65,
  stopPct: 0.09,
});

const exec = new PaperExecutor(30);

const bot = new Bot({ risk, strat, exec });
bot.run().catch(console.error);
