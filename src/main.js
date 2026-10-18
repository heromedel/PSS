import { Screen } from './engine/canvas.js';
import { Input } from './engine/input.js';
import { EventBus } from './engine/events.js';
import { RNG, seedFromString } from './engine/rng.js';
import { Loop } from './engine/loop.js';
import { Game } from './game/game.js';
import { DebugOverlay } from './debug/overlay.js';

const params = new URLSearchParams(location.search);
const seedText = params.get('seed') || String(Date.now() % 1000000);
const rng = new RNG(seedFromString(seedText));

const screen = new Screen(document.getElementById('game'));
const bus = new EventBus();
const input = new Input(screen, bus);

const loop = new Loop({ update: dt => { game.update(dt); }, render: () => { game.render(); dbg.update(); } });
const game = new Game({ screen, input, bus, rng, seedText, loop });
const dbg = new DebugOverlay(game);
if (params.has('debug')) dbg.setVisible(true);
if (params.get('replay') === 'pending') { const t = sessionStorage.getItem('pss.replay'); sessionStorage.removeItem('pss.replay'); if (t) game.recorder.attach(JSON.parse(t)); }
if (params.has('pause')) loop.paused = true;

window.PSS = { game, loop, bus, rng, dbg }; // console access for desktop testing
window.addEventListener('error', e => bus.emit('error', { msg: e.message, src: (e.filename || '').split('/').pop(), line: e.lineno }));
loop.start();
