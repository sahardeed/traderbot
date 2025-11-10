// simple synthetic “market” so you see trades fire immediately
export type Tick = { ts: number; price: number; vol: number };
export function* mockTicks(startPx = 1, steps = 1800): Generator<Tick> {
  let px = startPx;
  const now = Date.now();
  for (let i = 0; i < steps; i++) {
    // drift + bursts to trigger momentum
    const burst = Math.random() < 0.02 ? (Math.random() * 0.05) : 0;
    const noise = (Math.random() - 0.5) * 0.004;
    px *= 1 + burst + noise;
    yield { ts: now + i * 1000, price: Math.max(0.01, px), vol: 100 + Math.random() * 500 };
  }
}

// crude features from ticks (rolling windows in seconds)
export function computeSnap(history: Tick[]): {
  ts: number; price: number; ret3m: number; volImpulse: number; high20m: number;
  liquidityUSD: number; spreadPct: number; top10HolderPct: number;
} {
  const last = history[history.length - 1];
  const price = last.price;
  const ts = last.ts;

  const ago = (sec: number) => {
    const t = ts - sec * 1000;
    for (let i = history.length - 1; i >= 0; i--) if (history[i].ts <= t) return history[i]; 
    return history[0];
  };

  const p3m = ago(180)?.price ?? price;
  const ret3m = (price - p3m) / p3m;

  const vol3m = history.filter(h => h.ts >= ts - 180000).reduce((a, b) => a + b.vol, 0);
  const vol60m = history.filter(h => h.ts >= ts - 3600000).map(h => h.vol);
  const medianVol60m = vol60m.length ? vol60m.sort((a,b)=>a-b)[Math.floor(vol60m.length/2)] : 1;
  const volImpulse = medianVol60m ? vol3m / medianVol60m : 1;

  const high20m = Math.max(...history.filter(h => h.ts >= ts - 1200000).map(h => h.price).concat(price));

  // mock microstructure
  const liquidityUSD = 120000;  // pretend pool depth
  const spreadPct = 0.005 + Math.random() * 0.005; // 0.5–1%
  const top10HolderPct = 55 + Math.random() * 10;

  return { ts, price, ret3m, volImpulse, high20m, liquidityUSD, spreadPct, top10HolderPct };
}
