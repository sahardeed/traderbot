export class Executor {
  async simulateBuy({ token, price, amountUsd }) {
    console.log(`🟢 SIM BUY: ${token} at $${price} with $${amountUsd}`);
    return { fillPrice: price };
  }

  async simulateSell({ token, price, amountUsd }) {
    console.log(`🔴 SIM SELL: ${token} at $${price} with $${amountUsd}`);
    return { fillPrice: price };
  }
}
