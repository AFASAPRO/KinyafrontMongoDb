import { NEUTRAL, idlePose, MODE_FNS, MOVES } from './poses.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

/**
 * CharacterController
 * -------------------
 * Owns the animation state. Two channels are layered over the always-on idle pose:
 *   mode   – what the character is doing in the conversation (listen / think / talk)
 *   action – one-shot moves (wave, jump, dance…)
 * Each layer cross-fades in and out; a move only overrides the parameters it names.
 */
export class CharacterController {
  constructor() {
    this.rig = null;
    this.container = null;
    this.time = 0;
    this.layers = [];
    this.mode = 'idle';
    this.listeners = new Set();
    this.ctx = { energy: 0, legCm: 47 };
    this.speaking = false;
    this.look = { x: 0, y: 0, tx: 0, ty: 0 };
    this.lastPose = { ...NEUTRAL };
  }

  attach(rig, container) {
    this.rig = rig;
    this.container = container;
    this.ctx.legCm = rig.legLength / rig.k;
  }

  /** subscribe to changes of the currently playing action (for UI highlight) */
  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  _emit() {
    const action = this.layers.find((l) => l.channel === 'action' && !l.leaving)?.name ?? null;
    for (const cb of this.listeners) cb(action);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const l of this.layers) if (l.channel === 'mode' && !l.leaving) this._leave(l, 0.4);
    const fn = MODE_FNS[mode];
    if (fn) {
      this.layers.push({ channel: 'mode', name: mode, fn, t0: this.time, dur: Infinity, inT: 0.45, outT: 0.4, w: 0 });
    }
  }

  perform(name) {
    const def = MOVES[name];
    if (!def) return false;
    for (const l of this.layers) if (l.channel === 'action' && !l.leaving) this._leave(l, 0.18);
    this.layers.push({
      channel: 'action',
      name,
      fn: def.fn,
      t0: this.time,
      dur: def.dur,
      inT: def.blendIn ?? 0.28,
      outT: def.blendOut ?? 0.45,
      w: 0,
    });
    this._emit();
    return true;
  }

  stopAction() {
    for (const l of this.layers) if (l.channel === 'action' && !l.leaving) this._leave(l, 0.3);
    this._emit();
  }

  _leave(layer, outT) {
    layer.leaving = true;
    layer.leaveT0 = this.time;
    layer.leaveDur = outT;
    layer.leaveFrom = layer.w;
  }

  /** speech pulse – call on word boundaries */
  pulse(strength = 1) {
    this.ctx.energy = Math.max(this.ctx.energy, strength);
  }
  setSpeaking(on) {
    this.speaking = on;
  }

  /** pointer position in -1..1 (x right, y up) or null when it left the stage */
  setLook(x, y) {
    this.look.tx = x;
    this.look.ty = y;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const c = this.ctx;

    // speech energy: decays between word boundaries, with a floor while speaking
    c.energy *= Math.exp(-dt / 0.45);
    if (this.speaking) c.energy = Math.max(c.energy, 0.22 + 0.1 * Math.sin(this.time * 7));

    // smooth look-at
    const k = 1 - Math.exp(-dt * 5);
    this.look.x += (this.look.tx - this.look.x) * k;
    this.look.y += (this.look.ty - this.look.y) * k;

    const pose = idlePose(this.time);
    let rootYaw = 0;
    let hadAction = false;

    // mode layers first, action layers on top
    const ordered = [...this.layers].sort((a, b) => (a.channel === b.channel ? a.t0 - b.t0 : a.channel === 'mode' ? -1 : 1));
    for (const l of ordered) {
      const t = this.time - l.t0;
      let w = smooth(t / l.inT);
      if (l.leaving) {
        w = Math.min(w, l.leaveFrom) * (1 - clamp01((this.time - l.leaveT0) / l.leaveDur));
      } else if (Number.isFinite(l.dur)) {
        w *= smooth((l.dur - t) / l.outT);
        if (t >= l.dur) {
          l.leaving = true;
          l.leaveT0 = this.time;
          l.leaveDur = 0.01;
          l.leaveFrom = 0;
          hadAction = hadAction || l.channel === 'action';
        }
      }
      l.w = w;
      if (w <= 0) continue;
      const ov = l.fn(Math.min(t, Number.isFinite(l.dur) ? l.dur : t), c);
      for (const key in ov) {
        if (key === 'rootYaw') {
          rootYaw = ov[key];
          continue;
        }
        pose[key] += (ov[key] - pose[key]) * w;
      }
    }
    // drop dead layers
    const before = this.layers.length;
    this.layers = this.layers.filter((l) => !(l.leaving && (this.time - l.leaveT0 >= l.leaveDur || l.w <= 0.001)));
    if (hadAction || this.layers.length !== before) this._emit();

    // pointer-driven glance (softer while talking or mid-move)
    const busy = this.layers.some((l) => l.channel === 'action' && l.w > 0.2);
    const lw = busy ? 0.25 : this.mode === 'talk' ? 0.5 : 1;
    pose.headY += this.look.x * 0.5 * lw;
    pose.headX += -this.look.y * 0.28 * lw;
    pose.spineY += this.look.x * 0.12 * lw;

    pose.rootYaw = rootYaw;
    this.lastPose = pose;

    if (this.rig) {
      this.rig.apply(pose);
      if (this.container) {
        this.container.rotation.y = pose.rootYaw;
        this.container.position.x = pose.rootX * 0.01;
        this.container.position.z = pose.rootZ * 0.01;
      }
    }
    return pose;
  }
}
