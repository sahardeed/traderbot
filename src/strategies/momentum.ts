export class MomentumStrategy {
  constructor(p) {
    this.p = p;
  }
  shouldEnter(snap) {
    return Math.random() < 0.2; // random trigger for mock
  }
  buildOrder() {
    return { stopPct: this.p.stopPct, timeCapSec: 900 };
  }
}
