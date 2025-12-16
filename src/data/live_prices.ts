// src/data/live_prices.ts
import fetch from "node-fetch";
import EventEmitter from "events";

export class LivePriceFeed extends EventEmitter {
  interval: any;
  pairAddress: string;

  constructor(pairAddress: string) {
    super();
    this.pairAddress = pairAddress;
  }

  start(intervalMs = 2000) {
    this.interval = setInterval(async () => {
      try {
        const url = `https://api.dexscreener.com/latest/dex/pairs/${this.pairAddress}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const json = await res.json();
        if (!json?.pairs?.length) return;

        const p = json.pairs[0];

        const price = Number(p.priceUsd);
        const volume = p.volume?.h24 ?? 0;

        this.emit("tick", { price, volume, pair: this.pairAddress });
      } catch (e) {
        this.emit("error", e);
      }
    }, intervalMs);
  }

  stop() {
    clearInterval(this.interval);
  }
}
