import pino from "pino";
const log = pino({ level: "info" });

export class PaperExecutor {
  constructor(feeBpsPerSide) {
    this.feeBpsPerSide = feeBpsPerSide;
    this.open = null;
  }

  hasOpen() {
    return !!this.open;
  }

  buy(nowPx, qtyUSD, stopPx, ts) {
    const fee = qtyUSD * (this.feeBpsPerSide / 10000);
    this.open = { entryPx: nowPx, qtyUSD: qtyUSD - fee, ts, stopPx };
    log.info({ nowPx, qtyUSD, stopPx }, "BUY filled (paper)");
  }

  close(nowPx, ts) {
    if (!this.open) return null;
    const fee = this.open.qtyUSD * (this.feeBpsPerSide / 10000);
    const pnlUSD = this.open.qtyUSD * (nowPx / this.open.entryPx - 1) - fee;
    this.open = null;
    log.info({ nowPx, pnlUSD }, "EXIT (paper)");
    return { pnlUSD };
  }
}
