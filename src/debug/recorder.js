// Session recorder. Captures per-tick inputs and admin commands so a run can be replayed deterministically
// from its seed. Export is compact JSON; load it with PSS.replay.load(text) or the debug panel paste box.
export class Recorder {
  constructor(game) {
    this.game = game; this.frames = []; this.commands = []; this.recording = true;
    this.replay = null; this.replayIdx = 0; this.replayCmdIdx = 0;
    game.bus.emit('recorder.start', { seed: game.seedText }, { quiet: true });
  }
  // called by the game each tick with the inputs it is about to apply
  record(tick, inp) {
    if (!this.recording || this.replay) return;
    if (inp.dx || inp.dy || inp.kx || inp.ky || inp.taps.length)
      this.frames.push([tick, inp.dx, inp.dy, inp.kx, inp.ky, inp.taps.map(t => [t.x, t.y, t.secondary ? 1 : 0])]); // exact values: replays must not drift
  }
  command(tick, name, args) { if (!this.replay) this.commands.push([tick, name, args]); }
  export() {
    const g = this.game;
    return JSON.stringify({ v: 1, seed: g.seedText, ticks: g.loop.tick, frames: this.frames, commands: this.commands, build: g.playerBuild, ua: navigator.userAgent });
  }
  // --- replay ---
  // A replay must start from tick 0, so loading restarts the page with the recording parked in sessionStorage.
  load(text) {
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    sessionStorage.setItem('pss.replay', JSON.stringify(data));
    location.href = location.pathname + '?seed=' + encodeURIComponent(data.seed) + '&debug&replay=pending' + (new URLSearchParams(location.search).has('pause') ? '&pause' : '');
    return false;
  }
  // called at boot, before the loop starts
  attach(data) {
    this.replay = data; this.replayIdx = 0; this.replayCmdIdx = 0; this.recording = false;
    this.game.bus.emit('replay.start', { seed: data.seed, frames: data.frames.length, commands: data.commands.length, ticks: data.ticks });
    return true;
  }
  // returns the recorded inputs for this tick, or null when not replaying
  inputsFor(tick) {
    if (!this.replay) return null;
    const cmds = this.replay.commands;
    while (this.replayCmdIdx < cmds.length && cmds[this.replayCmdIdx][0] <= tick) { const [, name, args] = cmds[this.replayCmdIdx++]; this.game.runCommand(name, args, { fromReplay: true }); }
    const out = { dx: 0, dy: 0, kx: 0, ky: 0, taps: [] };
    const f = this.replay.frames;
    while (this.replayIdx < f.length && f[this.replayIdx][0] < tick) this.replayIdx++;
    if (this.replayIdx < f.length && f[this.replayIdx][0] === tick) {
      const r = f[this.replayIdx++]; out.dx = r[1]; out.dy = r[2]; out.kx = r[3]; out.ky = r[4]; out.taps = r[5].map(t => ({ x: t[0], y: t[1], secondary: !!t[2] }));
    }
    if (tick >= this.replay.ticks) { this.game.bus.emit('replay.end', { tick }); this.replay = null; this.game.loop.paused = true; }
    return out;
  }
}
