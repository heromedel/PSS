// Touch-first input. Primary pointer = drag-relative movement. Other pointers = taps (used later for tether).
// Keyboard fallback for desktop testing.
export class Input {
  constructor(screen, bus) {
    this.screen = screen; this.bus = bus;
    this.primary = null;            // {id, startX, startY, curX, curY}
    this.dragDelta = { x: 0, y: 0 }; // field units moved since drag start
    this.dragActive = false;
    this.dragConsumed = { x: 0, y: 0 };
    this.keys = new Set();
    this.taps = [];                 // queued {x,y} field coords from secondary/short taps
    this.sensitivity = 1.0;
    const c = screen.canvas;
    c.addEventListener('pointerdown', e => this.down(e));
    c.addEventListener('pointermove', e => this.move(e));
    c.addEventListener('pointerup', e => this.up(e));
    c.addEventListener('pointercancel', e => this.up(e));
    c.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => { this.keys.add(e.code); if (e.code === 'Space') e.preventDefault(); });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.primary = null; this.dragActive = false; });
  }
  down(e) {
    e.preventDefault();
    const p = this.screen.toField(e.clientX, e.clientY);
    if (!this.primary) {
      this.primary = { id: e.pointerId, startX: p.x, startY: p.y, curX: p.x, curY: p.y, t: performance.now(), moved: 0 };
      this.dragActive = true; this.dragConsumed = { x: 0, y: 0 };
      try { this.screen.canvas.setPointerCapture(e.pointerId); } catch {}
    } else {
      this.taps.push({ x: p.x, y: p.y, secondary: true });
    }
  }
  move(e) {
    if (!this.primary || e.pointerId !== this.primary.id) return;
    const p = this.screen.toField(e.clientX, e.clientY);
    this.primary.moved += Math.hypot(p.x - this.primary.curX, p.y - this.primary.curY);
    this.primary.curX = p.x; this.primary.curY = p.y;
  }
  up(e) {
    if (this.primary && e.pointerId === this.primary.id) {
      const dt = performance.now() - this.primary.t;
      if (dt < 220 && this.primary.moved < 12) this.taps.push({ x: this.primary.curX, y: this.primary.curY, secondary: false });
      this.primary = null; this.dragActive = false;
    }
  }
  // Returns movement delta (field units) accumulated since last call; caller applies it to the ship.
  consumeDrag() {
    if (!this.primary) return { x: 0, y: 0 };
    const tx = (this.primary.curX - this.primary.startX) * this.sensitivity;
    const ty = (this.primary.curY - this.primary.startY) * this.sensitivity;
    const d = { x: tx - this.dragConsumed.x, y: ty - this.dragConsumed.y };
    this.dragConsumed = { x: tx, y: ty };
    return d;
  }
  keyAxis() {
    const k = this.keys; let x = 0, y = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y -= 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y += 1;
    return { x, y };
  }
  consumeTaps() { const t = this.taps; this.taps = []; return t; }
}
