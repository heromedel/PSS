// Tiny event bus. Every emit is also recorded in the ring log for the debug overlay.
export class EventBus {
  constructor() { this.handlers = new Map(); this.log = []; this.logMax = 200; this.listeners = []; }
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { const a = this.handlers.get(type); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  emit(type, data = {}, { quiet = false } = {}) {
    if (!quiet) this.record(type, data);
    const a = this.handlers.get(type); if (a) for (const fn of a.slice()) fn(data);
    const all = this.handlers.get('*'); if (all) for (const fn of all.slice()) fn(type, data);
  }
  record(type, data) {
    const entry = { t: performance.now(), type, data };
    this.log.push(entry); if (this.log.length > this.logMax) this.log.shift();
    for (const l of this.listeners) l(entry);
  }
  onLog(fn) { this.listeners.push(fn); }
}
export function fmtEvent(e) {
  const parts = [];
  for (const k in e.data) {
    const v = e.data[k];
    if (v == null) continue;
    if (typeof v === 'object') continue;
    parts.push(`${k}=${typeof v === 'number' ? +v.toFixed(2) : v}`);
  }
  return `${e.type} ${parts.join(' ')}`;
}
