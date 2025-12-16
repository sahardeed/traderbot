export class AggressiveMomentum {
  constructor(private cfg = { threshold: 0.003 }) {}

  shouldEnter({ price, prevPrice }) {
    if (!prevPrice) return false;

    const pct = (price - prevPrice) / prevPrice;
    return pct >= this.cfg.threshold;
  }
}
