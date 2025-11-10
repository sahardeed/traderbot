export class RiskEngine {
  constructor(cfg) {
    this.cfg = cfg;
    this.equityUSD = 10000;
    this.openRiskPct = 0;
    this.dailyPnlUSD = 0;
  }

  usdFor(stopPct) {
    return this.cfg.perTradeRiskUSD / Math.max(stopPct, 0.0001);
  }

  canOpenTrade(stopPct) {
    return true;
  }

  onOpen(stopPct) {
    this.openRiskPct += (this.cfg.perTradeRiskUSD / this.equityUSD) * 100;
  }

  onClose(pnlUSD) {
    this.dailyPnlUSD += pnlUSD;
    this.openRiskPct = Math.max(0, this.openRiskPct - (this.cfg.perTradeRiskUSD / this.equityUSD) * 100);
    this.equityUSD += pnlUSD;
  }

  snapshot() {
    return {
      equityUSD: this.equityUSD,
      dailyPnlUSD: this.dailyPnlUSD,
      openRiskPct: this.openRiskPct,
    };
  }
}
