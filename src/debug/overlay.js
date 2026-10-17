// On-screen debug overlay (DOM). Phone-friendly: big buttons, live log, admin hooks.
import { fmtEvent } from '../engine/events.js';

export class DebugOverlay {
  constructor(game) {
    this.game = game; this.bus = game.bus; this.loop = game.loop;
    this.el = document.getElementById('dbg'); this.toggle = document.getElementById('dbg-toggle');
    this.visible = false; this.flags = { god: false, hitboxes: false, tags: false };
    this.toggle.addEventListener('click', () => this.setVisible(!this.visible));
    this.build();
    this.bus.onLog(e => this.appendLog(e));
    this.logLines = [];
  }
  setVisible(v) { this.visible = v; this.el.classList.toggle('show', v); this.toggle.style.opacity = v ? 1 : .55; }
  build() {
    this.el.innerHTML = '';
    const h = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
    const row = () => { const r = h('div', 'row'); this.el.appendChild(r); return r; };
    const btn = (label, fn, parent) => { const b = h('button', '', label); b.addEventListener('click', fn); (parent || row()).appendChild(b); return b; };
    const flagBtn = (label, key, parent) => { const b = btn(label, () => { this.flags[key] = !this.flags[key]; b.classList.toggle('on', this.flags[key]); this.bus.emit('debug.flag', { flag: key, on: this.flags[key] }); }, parent); return b; };

    this.el.appendChild(h('h4', '', 'status'));
    this.status = h('div', 'kv'); this.el.appendChild(this.status);

    this.el.appendChild(h('h4', '', 'time'));
    let r = row();
    this.pauseBtn = btn('pause', () => { this.loop.paused = !this.loop.paused; this.pauseBtn.classList.toggle('on', this.loop.paused); }, r);
    btn('step', () => { this.loop.paused = true; this.pauseBtn.classList.add('on'); this.loop.stepOnce = true; }, r);
    for (const s of [0.25, 0.5, 1, 2]) btn('x' + s, () => { this.loop.timeScale = s; }, r);

    this.el.appendChild(h('h4', '', 'flags'));
    r = row(); flagBtn('god', 'god', r); flagBtn('hitboxes', 'hitboxes', r); flagBtn('tags', 'tags', r);

    this.el.appendChild(h('h4', '', 'seed'));
    r = row();
    this.seedInput = h('input'); this.seedInput.value = this.game.seedText; r.appendChild(this.seedInput);
    btn('reseed', () => { location.href = location.pathname + '?seed=' + encodeURIComponent(this.seedInput.value); }, r);
    btn('random', () => { location.href = location.pathname; }, r);

    this.el.appendChild(h('h4', '', 'admin'));
    this.adminRow = row();
    btn('clear log', () => { this.logLines = []; this.logEl.textContent = ''; }, this.adminRow);

    this.el.appendChild(h('h4', '', 'log'));
    this.logEl = h('div'); this.logEl.id = 'log'; this.el.appendChild(this.logEl);
  }
  // game modules register admin buttons here
  addAdmin(label, fn) { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', fn); this.adminRow.appendChild(b); return b; }
  appendLog(e) {
    const line = `${(e.t / 1000).toFixed(1)} ${fmtEvent(e)}`;
    this.logLines.push(line); if (this.logLines.length > 40) this.logLines.shift();
    if (this.visible) { this.logEl.textContent = this.logLines.join('\n'); this.logEl.scrollTop = this.logEl.scrollHeight; }
  }
  update() {
    if (!this.visible) return;
    const g = this.game, l = this.loop;
    this.status.innerHTML =
      `fps <b>${l.fps}</b> tick <b>${l.tick}</b> sim <b>${l.simTime.toFixed(1)}s</b> x<b>${l.timeScale}</b><br>` +
      `seed <b>${g.seedText}</b> rng calls <b>${g.rng.calls}</b><br>` +
      `entities <b>${g.world.count()}</b> bullets <b>${g.world.countTag('bullet')}</b><br>` +
      `player <b>${g.player.x.toFixed(0)},${g.player.y.toFixed(0)}</b> drag <b>${g.input.dragActive ? 'yes' : 'no'}</b>`;
  }
}
