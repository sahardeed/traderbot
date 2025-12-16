export class RiskManager {
  constructor(private walletUsd: number = 1000) {}

  sizePosition() {
    // Risk 5% per trade
    return this.walletUsd * 0.05;
  }
}
