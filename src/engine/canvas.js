// Logical 16:9 field. Canvas is letterboxed to the window; all game coords are in field units.
export const FIELD = { w: 1280, h: 720 };

export class Screen {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.scale = 1; this.offX = 0; this.offY = 0; this.dpr = 1;
    this.resize(); window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));
  }
  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.min(vw / FIELD.w, vh / FIELD.h);
    const cw = Math.floor(FIELD.w * s), ch = Math.floor(FIELD.h * s);
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    this.canvas.width = Math.floor(cw * this.dpr); this.canvas.height = Math.floor(ch * this.dpr);
    this.scale = s;
    const r = this.canvas.getBoundingClientRect(); this.offX = r.left; this.offY = r.top;
    this.portrait = vh > vw;
    document.getElementById('rotate')?.classList.toggle('show', this.portrait);
  }
  // client (CSS px) -> field coords
  toField(cx, cy) { return { x: (cx - this.offX) / this.scale, y: (cy - this.offY) / this.scale }; }
  begin() {
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    return c;
  }
}
