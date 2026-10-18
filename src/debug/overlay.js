// On-screen debug overlay (DOM). Phone-friendly: big buttons, live log, admin hooks.
import { fmtEvent } from '../engine/events.js';
import { BASES } from '../content/bases.js';
import { componentsForSlot } from '../content/components.js';
import { EXAMPLE_BUILDS } from '../game/game.js';
import { COMBAT } from '../game/systems/combat.js';

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
    const flagBtn = (label, key, parent) => { const b = btn(label, () => { this.flags[key] = !this.flags[key]; b.classList.toggle('on', this.flags[key]); this.game.runCommand('flag', { flag: key, on: this.flags[key] }); this.bus.emit('debug.flag', { flag: key, on: this.flags[key] }); }, parent); return b; };

    this.el.appendChild(h('h4', '', 'status'));
    this.status = h('div', 'kv'); this.el.appendChild(this.status);

    this.el.appendChild(h('h4', '', 'time'));
    let r = row();
    this.pauseBtn = btn('pause', () => { this.loop.paused = !this.loop.paused; this.pauseBtn.classList.toggle('on', this.loop.paused); }, r);
    btn('step', () => { this.loop.paused = true; this.pauseBtn.classList.add('on'); this.loop.stepOnce = true; }, r);
    for (const s of [0.25, 0.5, 1, 2]) btn('x' + s, () => { this.loop.timeScale = s; }, r);

    this.el.appendChild(h('h4', '', 'flags'));
    r = row(); flagBtn('god', 'god', r); flagBtn('hitboxes', 'hitboxes', r); flagBtn('tags', 'tags', r);
    this.flags.enemyFire = true; const ef = flagBtn('enemy fire', 'enemyFire', r); ef.classList.add('on');

    this.el.appendChild(h('h4', '', 'seed'));
    r = row();
    this.seedInput = h('input'); this.seedInput.value = this.game.seedText; r.appendChild(this.seedInput);
    btn('reseed', () => { location.href = location.pathname + '?seed=' + encodeURIComponent(this.seedInput.value); }, r);
    btn('random', () => { location.href = location.pathname; }, r);

    this.el.appendChild(h('h4', '', 'inspect (tags flag on, tap an entity)'));
    this.inspectEl = h('div', 'kv', '-'); this.el.appendChild(this.inspectEl);

    this.el.appendChild(h('h4', '', 'spawn'));
    this.buildSpawnMenu(h, row, btn);

    this.el.appendChild(h('h4', '', 'admin'));
    this.adminRow = row();
    btn('clear enemies', () => this.game.clearEnemies(), this.adminRow);
    btn('clear log', () => { this.logLines = []; this.logEl.textContent = ''; }, this.adminRow);
    btn('copy log', () => this.copyLog(), this.adminRow);
    btn('copy replay', () => this.copyText(this.game.recorder.export(), 'replay'), this.adminRow);
    btn('load replay', () => { const a = this.copyArea; a.style.display = 'block'; a.value = ''; a.placeholder = 'paste replay JSON here'; a.focus();
      a.oninput = () => { try { this.game.recorder.load(a.value); } catch (e) { this.bus.emit('replay.error', { msg: e.message }); } }; }, this.adminRow);
    const tr = row(); tr.appendChild(h('span', 'kv', 'dmg transfer'));
    for (const v of [0, 0.25, 0.33, 0.5]) btn(v, () => { COMBAT.transfer = v; this.bus.emit('debug.transfer', { v }); }, tr);
    this.copyArea = h('textarea'); this.copyArea.style.cssText = 'display:none;width:100%;height:90px;background:#0b1220;color:#cfe;border:1px solid #2a4a6a;font:11px ui-monospace,monospace;';
    this.el.appendChild(this.copyArea);

    this.el.appendChild(h('h4', '', 'log'));
    this.logEl = h('div'); this.logEl.id = 'log'; this.el.appendChild(this.logEl);
  }
  buildSpawnMenu(h, row, btn) {
    const r = row();
    const baseSel = h('select'); baseSel.style.cssText = 'background:#0b1220;color:#cfe;border:1px solid #2a4a6a;padding:4px;font:12px ui-monospace,monospace;';
    for (const b of Object.values(BASES)) { if (b.faction === 'player') continue; const o = h('option', '', b.name); o.value = b.id; baseSel.appendChild(o); }
    r.appendChild(baseSel);
    btn('example', () => fill(EXAMPLE_BUILDS[baseSel.value] || {}), r);
    btn('spawn', () => { const build = {}; for (const [id, sel] of Object.entries(nodeSels)) if (sel.value) build[id] = sel.value; this.game.spawnEnemy(baseSel.value, build); }, r);
    const nodesEl = h('div'); this.el.appendChild(nodesEl);
    let nodeSels = {};
    const rebuild = () => {
      nodesEl.innerHTML = ''; nodeSels = {};
      for (const n of BASES[baseSel.value].nodes) {
        const nr = h('div', 'row'); nr.appendChild(h('span', 'kv', `${n.id} (${n.slot}${n.mirror ? ' x2' : ''})`));
        const sel = h('select'); sel.style.cssText = baseSel.style.cssText;
        sel.appendChild(h('option', '', '-')); sel.lastChild.value = '';
        for (const c of componentsForSlot(n.slot)) { const o = h('option', '', c.name); o.value = c.id; sel.appendChild(o); }
        nr.appendChild(sel); nodesEl.appendChild(nr); nodeSels[n.id] = sel;
      }
      fill(EXAMPLE_BUILDS[baseSel.value] || {});
    };
    const fill = build => { for (const [id, sel] of Object.entries(nodeSels)) sel.value = build[id] || ''; };
    baseSel.addEventListener('change', rebuild); rebuild();
  }
  // game modules register admin buttons here
  addAdmin(label, fn) { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', fn); this.adminRow.appendChild(b); return b; }
  sessionText() {
    const g = this.game, l = this.loop;
    const head = [`PSS session`, `seed=${g.seedText} tick=${l.tick} sim=${l.simTime.toFixed(1)}s fps=${l.fps} ua=${navigator.userAgent}`,
      `screen=${innerWidth}x${innerHeight} dpr=${devicePixelRatio} field_scale=${g.screen.scale.toFixed(3)}`,
      `player=${g.player.x.toFixed(0)},${g.player.y.toFixed(0)} entities=${g.world.count()}`, `--- log ---`];
    return head.concat(this.bus.log.map(e => `${(e.t / 1000).toFixed(1)} ${fmtEvent(e)}`)).join('\n');
  }
  copyLog() { return this.copyText(this.sessionText(), 'log'); }
  async copyText(txt, what) {
    try { await navigator.clipboard.writeText(txt); this.bus.emit('debug.copied', { what, chars: txt.length }); }
    catch { // iOS fallback: show a textarea the user can long-press to copy
      this.copyArea.style.display = 'block'; this.copyArea.value = txt; this.copyArea.focus(); this.copyArea.select();
    }
  }
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
    const ins = g.inspected;
    if (ins && g.world.entities.has(ins.id)) {
      const rows = Object.entries(ins.tags).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: <b>${typeof v === 'number' ? +v.toFixed(2) : v}</b>`);
      this.inspectEl.innerHTML = `#${ins.id} ${ins.def?.name || ''} @ ${ins.x.toFixed(0)},${ins.y.toFixed(0)} r=${ins.r.toFixed(0)}<br>` + rows.join('<br>');
    } else this.inspectEl.textContent = '-';
  }
}
