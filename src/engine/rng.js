// Seeded RNG (mulberry32). Deterministic per seed so stages can be replayed or shared.
export class RNG {
  constructor(seed) { this.seed = seed >>> 0; this.s = this.seed; this.calls = 0; }
  next() {
    this.calls++;
    let t = (this.s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); } // inclusive
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  // weighted pick: items [{w:number, ...}]
  weighted(items, key = 'w') {
    let total = 0; for (const it of items) total += it[key] ?? 1;
    let r = this.next() * total;
    for (const it of items) { r -= it[key] ?? 1; if (r < 0) return it; }
    return items[items.length - 1];
  }
  fork() { return new RNG(Math.floor(this.next() * 4294967295)); }
}
export function seedFromString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
