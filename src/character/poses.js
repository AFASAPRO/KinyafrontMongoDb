/**
 * Pose parameters + procedural moves.
 *
 * The FBX contains no animation clips, so every move is generated from math.
 * A pose is a flat object of numbers (see NEUTRAL). A move is a function
 *   (t, ctx) => partial pose
 * that returns only the parameters it wants to change; everything else keeps
 * the value from the layers below it (idle breathing, listening, talking…).
 *
 * Units: angles in radians, lengths in centimetres for a 160 cm character
 * (the rig rescales for other sizes).
 *   x = away from the body's centre line (mirrored for the right side)
 *   y = up,  z = forward
 * Hand targets are measured from the shoulder joint and ride with the chest.
 */

export const NEUTRAL = {
  // pelvis
  hipsX: 0, hipsY: 0, hipsZ: 0, hipsYaw: 0, hipsRoll: 0,
  // torso / head (x = lean forward, y = turn toward character's left, z = tilt)
  spineX: 0, spineY: 0, spineZ: 0,
  headX: 0, headY: 0, headZ: 0,
  shrugL: 0, shrugR: 0,
  // arms – hand target relative to shoulder
  hLx: 9, hLy: -42, hLz: 3,
  hRx: 9, hRy: -42, hRz: 3,
  poleX: 0.45, poleY: -1, poleZ: -0.35,
  fingL: 0.3, fingR: 0.3,
  // legs
  thighXL: 0, thighZL: 0.03, kneeXL: 0, footXL: 0,
  thighXR: 0, thighZR: 0.03, kneeXR: 0, footXR: 0,
  // whole body (applied to the container, never cross-faded)
  rootYaw: 0, rootX: 0, rootZ: 0,
};

const TAU = Math.PI * 2;
const sin = Math.sin;
const cos = Math.cos;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

const EASE = {
  smooth,
  lin: clamp01,
  out: (x) => 1 - (1 - clamp01(x)) ** 2,
  in: (x) => clamp01(x) ** 2,
};

/** keyframe sampler – keys: [{ t, e?: 'smooth'|'lin'|'out'|'in', ...params }] */
export function kf(t, keys) {
  if (t <= keys[0].t) return strip(keys[0]);
  const last = keys[keys.length - 1];
  if (t >= last.t) return strip(last);
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const f = (EASE[b.e || 'smooth'])((t - a.t) / (b.t - a.t));
  const out = {};
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of names) {
    if (k === 't' || k === 'e') continue;
    const va = a[k] ?? NEUTRAL[k];
    const vb = b[k] ?? NEUTRAL[k];
    out[k] = va + (vb - va) * f;
  }
  return out;
}
function strip(k) {
  const o = {};
  for (const key of Object.keys(k)) if (key !== 't' && key !== 'e') o[key] = k[key];
  return o;
}

/** knees bent by angle a with flat feet; hips drop so the feet stay planted */
export function crouch(a, ctx) {
  const drop = ctx.legCm * (1 - cos(a));
  return { hipsY: -drop, thighXL: -a, thighXR: -a, kneeXL: 2 * a, kneeXR: 2 * a, footXL: 0, footXR: 0 };
}

const hands = (l, r = l) => ({
  hLx: l[0], hLy: l[1], hLz: l[2],
  hRx: r[0], hRy: r[1], hRz: r[2],
});
const env = (t, dur, i = 0.3, o = 0.4) => clamp01(t / i) * clamp01((dur - t) / o);

// ---------------------------------------------------------------------------
// Idle – always running underneath everything
// ---------------------------------------------------------------------------
export function idlePose(time) {
  const p = { ...NEUTRAL };
  const breath = sin(time * 1.55);
  const shift = sin(time * 0.33);
  p.spineX = 0.012 + 0.012 * breath;
  p.shrugL = p.shrugR = 0.025 * breath;
  p.hipsX = 0.9 * shift;
  p.hipsRoll = 0.02 * shift;
  p.spineZ = -0.025 * shift;
  p.headZ = 0.035 * sin(time * 0.51 + 1);
  p.headY = 0.07 * sin(time * 0.23);
  p.headX = 0.02 * sin(time * 0.37);
  p.hLy += 0.6 * sin(time * 0.9);
  p.hRy += 0.6 * sin(time * 0.9 + 1.3);
  p.hLz += 0.8 * sin(time * 0.7);
  p.hRz += 0.8 * sin(time * 0.7 + 2);
  return p;
}

// ---------------------------------------------------------------------------
// Conversation modes (loop until replaced)
// ---------------------------------------------------------------------------
function listen(t) {
  const ph = (t % 3.4) / 3.4;
  const nod = ph < 0.22 ? sin((ph / 0.22) * Math.PI) * 0.13 : 0;
  return {
    headZ: 0.15 + 0.03 * sin(t * 0.8),
    headY: 0.1 * sin(t * 0.4),
    headX: 0.05 + nod,
    spineX: 0.08,
    ...hands([-7, -16, 15.5]),
    fingL: 0.45,
    fingR: 0.45,
  };
}

function think(t) {
  return {
    headX: -0.08 + 0.03 * sin(t * 0.9),
    headY: -0.28 + 0.05 * sin(t * 0.6),
    headZ: 0.14,
    spineX: 0.03,
    spineY: -0.06,
    hRx: -6, hRy: 14, hRz: 19.5,
    hLx: -7, hLy: -8, hLz: 17,
    fingR: 0.7,
    fingL: 0.5,
    hipsX: 1.5,
  };
}

function talk(t, c) {
  const e = c.energy;
  const g = 0.3 + 0.7 * e; // gesture size follows speech energy
  const n1 = sin(t * 2.3) + 0.5 * sin(t * 3.9 + 1.1);
  const n2 = sin(t * 1.7 + 2) + 0.5 * sin(t * 3.1);
  const n3 = sin(t * 2.9 + 0.5) + 0.5 * sin(t * 4.3 + 2);
  const n4 = sin(t * 2.1 + 4) + 0.5 * sin(t * 3.4 + 0.3);
  return {
    hLx: 8 + 9 * g + 3 * g * n1, hLy: -22 + 14 * g + 9 * g * n2, hLz: 12 + 10 * g + 4 * g * n1,
    hRx: 8 + 9 * g + 3 * g * n3, hRy: -22 + 14 * g + 9 * g * n4, hRz: 12 + 10 * g + 4 * g * n3,
    fingL: 0.25,
    fingR: 0.25,
    spineX: 0.03 + 0.03 * e * sin(t * 4.4),
    spineY: 0.05 * sin(t * 1.1),
    headX: 0.04 + 0.07 * e * sin(t * 5.2),
    headY: 0.12 * sin(t * 1.3) + 0.05 * n1 * e,
    headZ: 0.07 * sin(t * 1.7),
    hipsX: 1.3 * sin(t * 0.9),
    shrugL: 0.05 * e,
    shrugR: 0.05 * e,
  };
}

// ---------------------------------------------------------------------------
// One-shot moves
// ---------------------------------------------------------------------------
function wave(t, c) {
  const dur = 3.4;
  const e = env(t, dur, 0.35, 0.5);
  const swing = sin(t * TAU * 2.4);
  return {
    hRx: 22 + 9 * swing * e, hRy: 31, hRz: 7,
    hLx: 10, hLy: -41, hLz: 5,
    headZ: 0.14 * e,
    headY: 0.08 * e,
    spineZ: 0.06 * e,
    hipsX: -1.2 * e,
    shrugR: 0.14 * e,
    fingR: 0.05,
    ...{ spineX: 0.02 },
  };
}

function jump(t, c) {
  const H = 42;
  const a = crouch(0.78, c);
  const tuck = { thighXL: -0.55, thighXR: -0.45, kneeXL: 1.0, kneeXR: 0.85, footXL: 0.45, footXR: 0.45 };
  const armsBack = hands([13, -28, -16]);
  const armsUp = hands([28, 34, 3]);
  return kf(t, [
    { t: 0, ...hands([9, -42, 3]) },
    { t: 0.3, ...a, ...armsBack, spineX: 0.38, headX: 0.05 },
    { t: 0.42, hipsY: 2.5, thighXL: 0, thighXR: 0, kneeXL: 0, kneeXR: 0, footXL: 0.5, footXR: 0.5, ...armsUp, spineX: -0.06, headX: -0.1, e: 'out' },
    { t: 0.7, hipsY: H, ...tuck, ...armsUp, spineX: -0.04, headX: -0.12, e: 'out' },
    { t: 0.98, hipsY: 0, thighXL: -0.05, thighXR: -0.05, kneeXL: 0.05, kneeXR: 0.05, footXL: 0.3, footXR: 0.3, ...hands([16, 6, 14]), spineX: 0.04, headX: 0, e: 'in' },
    { t: 1.12, ...crouch(0.5, c), ...hands([13, -22, 16]), spineX: 0.22, headX: 0.08, e: 'out' },
    { t: 1.6, ...hands([9, -42, 3]), spineX: 0, headX: 0, e: 'smooth' },
  ]);
}

function dance(t, c) {
  const dur = 6.6;
  const e = env(t, dur, 0.5, 0.6);
  const beat = t * TAU * 2; // 2 beats / s
  const bar = t * TAU; // 1 bar / s
  const bounce = 0.5 - 0.5 * cos(beat);
  const a = (0.06 + 0.24 * bounce) * e;
  const liftL = Math.max(0, sin(bar)) ** 2 * e;
  const liftR = Math.max(0, -sin(bar)) ** 2 * e;
  const cr = crouch(a, c);
  return {
    ...cr,
    thighXL: cr.thighXL - 0.55 * liftL,
    thighXR: cr.thighXR - 0.55 * liftR,
    kneeXL: cr.kneeXL + 1.0 * liftL,
    kneeXR: cr.kneeXR + 1.0 * liftR,
    footXL: 0.35 * liftL,
    footXR: 0.35 * liftR,
    hipsX: 5 * sin(bar) * e,
    hipsRoll: 0.09 * sin(bar) * e,
    hipsYaw: 0.28 * sin(bar + 0.6) * e,
    spineZ: -0.13 * sin(bar) * e,
    spineY: -0.2 * sin(bar + 0.6) * e,
    spineX: 0.06 * e,
    headZ: 0.16 * sin(bar + 0.4) * e,
    headY: 0.22 * sin(bar * 0.5) * e,
    headX: 0.08 * sin(beat) * e,
    hLx: 16 + 5 * sin(bar), hLy: 8 + 34 * sin(bar + 0.3) * e, hLz: 12 + 4 * cos(bar),
    hRx: 16 + 5 * sin(bar + 3.14), hRy: 8 + 34 * sin(bar + 3.44) * e, hRz: 12 + 4 * cos(bar + 3.14),
    fingL: 0.1,
    fingR: 0.1,
    rootYaw: 0.5 * sin(bar * 0.25) * e,
  };
}

function clap(t) {
  const dur = 3.4;
  const e = env(t, dur, 0.4, 0.5);
  const c = 0.5 + 0.5 * cos(t * TAU * 2.7); // 1 apart, 0 together
  const x = -8 + 15 * c;
  const y = -4 + 2.5 * sin(t * TAU * 2.7);
  return {
    hLx: NEUTRAL.hLx + (x - NEUTRAL.hLx) * e, hLy: NEUTRAL.hLy + (y - NEUTRAL.hLy) * e, hLz: NEUTRAL.hLz + (22 - NEUTRAL.hLz) * e,
    hRx: NEUTRAL.hRx + (x - NEUTRAL.hRx) * e, hRy: NEUTRAL.hRy + (y - NEUTRAL.hRy) * e, hRz: NEUTRAL.hRz + (22 - NEUTRAL.hRz) * e,
    fingL: 0.05,
    fingR: 0.05,
    hipsY: 1.1 * sin(t * TAU * 2.7 * 2) * e,
    headX: -0.06 * e + 0.05 * sin(t * TAU * 2.7) * e,
    spineX: 0.04 * e,
    headZ: 0.08 * e * sin(t * 2),
  };
}

function cheer(t, c) {
  const dur = 3;
  const e = env(t, dur, 0.3, 0.5);
  const hop = Math.max(0, sin(t * TAU * 1.6)) * e; // 0..1 hops
  const air = hop ** 0.6;
  const pump = sin(t * TAU * 3.2);
  return {
    // wide "V": this character's head is large, so arms must clear it
    hLx: 30 + 3 * pump * e, hLy: 28 + 3 * pump * e, hLz: 2,
    hRx: 30 - 3 * pump * e, hRy: 28 - 3 * pump * e, hRz: 2,
    hipsY: 13 * hop,
    thighXL: -0.35 * air, thighXR: -0.25 * air,
    kneeXL: 0.7 * air, kneeXR: 0.55 * air,
    footXL: 0.35 * air, footXR: 0.35 * air,
    headX: -0.16 * e,
    spineX: -0.07 * e,
    headZ: 0.1 * sin(t * 3) * e,
    fingL: 0.15,
    fingR: 0.15,
  };
}

function laugh(t) {
  const dur = 3.4;
  const e = env(t, dur, 0.25, 0.6);
  const shake = sin(t * TAU * 6.5);
  return {
    headX: -0.24 * e + 0.05 * shake * e,
    headZ: 0.1 * sin(t * 2.2) * e,
    spineX: -0.11 * e,
    spineZ: 0.05 * sin(t * 2.2) * e,
    shrugL: 0.12 * e + 0.09 * shake * e,
    shrugR: 0.12 * e + 0.09 * shake * e,
    hipsY: 0.9 * shake * e,
    hipsZ: -1.2 * e,
    hLx: -1 + 0 * e, hLy: -20 + 1.5 * shake * e, hLz: 15.5,
    hRx: 5, hRy: -20 + 1.5 * shake * e, hRz: 15.5,
  };
}

function shrug(t) {
  return kf(t, [
    { t: 0 },
    { t: 0.35, shrugL: 0.36, shrugR: 0.36, ...hands([28, -8, 18]), headZ: 0.16, headX: 0.04, spineX: -0.03, hipsY: 0.6 },
    { t: 1.5, shrugL: 0.36, shrugR: 0.36, ...hands([28, -8, 18]), headZ: 0.16, headX: 0.04, spineX: -0.03, hipsY: 0.6 },
    { t: 2.3, e: 'smooth' },
  ]);
}

function nod(t) {
  const e = env(t, 1.7, 0.15, 0.25);
  return { headX: 0.3 * sin(t * TAU * 2.2) * e, spineX: 0.03 * e };
}

function shake(t) {
  const e = env(t, 1.9, 0.15, 0.25);
  return { headY: 0.42 * sin(t * TAU * 2.4) * e, headZ: 0.05 * sin(t * TAU * 2.4) * e };
}

function bow(t) {
  const pose = { spineX: 0.9, headX: 0.12, hipsZ: -6, hipsY: -1.2, ...hands([10, -35, 12]) };
  return kf(t, [
    { t: 0 },
    { t: 0.75, ...pose },
    { t: 1.55, ...pose },
    { t: 2.5, e: 'smooth' },
  ]);
}

function spin(t, c) {
  const dur = 1.9;
  const spinT = 1.35;
  const f = smooth(t / spinT);
  const up = sin(Math.PI * clamp01((t - 0.1) / (spinT - 0.1)));
  return {
    rootYaw: TAU * f,
    hipsY: 7 * up,
    thighXL: -0.3 * up, thighXR: -0.2 * up,
    kneeXL: 0.6 * up, kneeXR: 0.4 * up,
    ...hands([44, 6, 2]),
    headZ: 0.1,
    spineZ: -0.05,
    fingL: 0.05,
    fingR: 0.05,
  };
}

function wow(t) {
  const face = hands([25, 26, 14]);
  const tiny = { hipsZ: -8, hipsY: 3, spineX: -0.2, headX: -0.16, shrugL: 0.2, shrugR: 0.2 };
  return kf(t, [
    { t: 0 },
    { t: 0.18, ...tiny, ...face, hipsY: 5, e: 'out' },
    { t: 0.4, ...tiny, ...face, hipsY: 0 },
    { t: 1.6, ...tiny, ...face, hipsY: 0, headZ: 0.06 },
    { t: 2.3 },
  ]);
}

function sad(t) {
  const e = env(t, 3.8, 0.7, 0.9);
  return {
    headX: 0.34 * e,
    spineX: 0.2 * e,
    shrugL: -0.05 * e,
    shrugR: -0.05 * e,
    hipsY: -0.8 * e,
    hLx: 8, hLy: -41, hLz: 7 * e + 3,
    hRx: 8, hRy: -41, hRz: 7 * e + 3,
    headY: 0.1 * sin(t * 0.9) * e,
    fingL: 0.2,
    fingR: 0.2,
  };
}

const thinkAction = (t) => {
  const e = env(t, 3.6, 0.4, 0.5);
  const m = think(t);
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, NEUTRAL[k] + (v - NEUTRAL[k]) * e]));
};

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------
export const MODE_FNS = { listen, think, talk };

/** moves the user (or the AI) can trigger */
export const MOVES = {
  wave: { label: 'Wave', emoji: '👋', dur: 3.4, fn: wave },
  jump: { label: 'Jump', emoji: '🦘', dur: 1.7, fn: jump, blendIn: 0.08, blendOut: 0.2 },
  dance: { label: 'Dance', emoji: '💃', dur: 6.6, fn: dance },
  clap: { label: 'Clap', emoji: '👏', dur: 3.4, fn: clap },
  cheer: { label: 'Cheer', emoji: '🎉', dur: 3.0, fn: cheer },
  laugh: { label: 'Laugh', emoji: '😂', dur: 3.4, fn: laugh },
  spin: { label: 'Spin', emoji: '🌀', dur: 1.9, fn: spin, blendIn: 0.15 },
  wow: { label: 'Wow', emoji: '😮', dur: 2.3, fn: wow, blendIn: 0.1 },
  shrug: { label: 'Shrug', emoji: '🤷', dur: 2.3, fn: shrug },
  bow: { label: 'Bow', emoji: '🙇', dur: 2.5, fn: bow },
  nod: { label: 'Nod', emoji: '🙂', dur: 1.7, fn: nod },
  shake: { label: 'No', emoji: '🙅', dur: 1.9, fn: shake },
  think: { label: 'Think', emoji: '🤔', dur: 3.6, fn: thinkAction },
  sad: { label: 'Sad', emoji: '🥺', dur: 3.8, fn: sad },
};

export const MOVE_NAMES = Object.keys(MOVES);
