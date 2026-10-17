// Fixed-timestep simulation, variable-rate render. Time scale and pause live here for the debug overlay.
export class Loop {
  constructor({ update, render, dt = 1 / 60 }) {
    this.update = update; this.render = render; this.dt = dt;
    this.acc = 0; this.last = 0; this.timeScale = 1; this.paused = false; this.stepOnce = false;
    this.fps = 0; this._frames = 0; this._fpsT = 0; this.simTime = 0; this.tick = 0;
    this.running = false;
  }
  start() { this.running = true; this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }
  frame(now) {
    if (!this.running) return;
    let elapsed = (now - this.last) / 1000; this.last = now;
    if (elapsed > 0.25) elapsed = 0.25; // tab switch / hitch guard
    this._frames++; this._fpsT += elapsed;
    if (this._fpsT >= 0.5) { this.fps = Math.round(this._frames / this._fpsT); this._frames = 0; this._fpsT = 0; }
    if (!this.paused) this.acc += elapsed * this.timeScale;
    if (this.stepOnce) { this.acc = this.dt; this.stepOnce = false; }
    let steps = 0;
    while (this.acc >= this.dt && steps < 8) {
      this.update(this.dt); this.simTime += this.dt; this.tick++; this.acc -= this.dt; steps++;
    }
    if (steps === 8) this.acc = 0;
    this.render(this.acc / this.dt);
    requestAnimationFrame(t => this.frame(t));
  }
}
