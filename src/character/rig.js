import * as THREE from 'three';

/**
 * Rig
 * ---
 * Drives a Mixamo-style skeleton (the FBX has no baked animations) from a small set of
 * numeric pose parameters (see poses.js).
 *
 *  - Torso, head and legs use forward kinematics with rotations expressed in the model's
 *    "rest frame" (x = character's left, y = up, z = forward). Working in that frame makes
 *    every rotation independent of how the FBX authored its local bone axes.
 *  - Arms use a two-bone IK solve: a pose specifies where each hand should be (relative to
 *    its shoulder, attached to the chest), and the rig works out the elbow.
 */

const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
const SIDES = ['Left', 'Right'];

const stripPrefix = (name) => name.replace(/^mixamorig\d*[:_]?/, '');

// parent of each driven bone, listed parent-first
const PARENT = { Hips: null, Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck' };
const BODY_ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
const ARM_ORDER = [];
const LEG_ORDER = [];
for (const S of SIDES) {
  PARENT[`${S}Shoulder`] = 'Spine2';
  BODY_ORDER.push(`${S}Shoulder`);
  PARENT[`${S}UpLeg`] = 'Hips';
  PARENT[`${S}Leg`] = `${S}UpLeg`;
  PARENT[`${S}Foot`] = `${S}Leg`;
  LEG_ORDER.push(`${S}UpLeg`, `${S}Leg`, `${S}Foot`);
  PARENT[`${S}Arm`] = `${S}Shoulder`;
  PARENT[`${S}ForeArm`] = `${S}Arm`;
  PARENT[`${S}Hand`] = `${S}ForeArm`;
  ARM_ORDER.push(`${S}Arm`, `${S}ForeArm`, `${S}Hand`);
  for (const f of FINGERS) {
    for (let i = 1; i <= 3; i++) {
      const n = `${S}Hand${f}${i}`;
      PARENT[n] = i === 1 ? `${S}Hand` : `${S}Hand${f}${i - 1}`;
      ARM_ORDER.push(n);
    }
  }
}

// bone -> child used to measure the bone's rest direction
const AIM_CHILD = {
  LeftArm: 'LeftForeArm',
  LeftForeArm: 'LeftHand',
  RightArm: 'RightForeArm',
  RightForeArm: 'RightHand',
};

const qAxis = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a);
const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const qx = (a) => qAxis(AX, a);
const qy = (a) => qAxis(AY, a);
const qz = (a) => qAxis(AZ, a);
const qEuler = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));

export class Rig {
  constructor(root) {
    this.root = root;
    root.updateMatrixWorld(true);

    this.bones = {};
    root.traverse((o) => {
      if (o.isBone) {
        const key = stripPrefix(o.name);
        if (!(key in this.bones)) this.bones[key] = o;
      }
    });
    if (!this.bones.Hips) throw new Error('Rig: no Hips bone found – is this a Mixamo character?');

    // rest data ---------------------------------------------------------
    const rootQ = new THREE.Quaternion();
    root.getWorldQuaternion(rootQ);
    const rootQInv = rootQ.clone().invert();
    const tmpQ = new THREE.Quaternion();
    const tmpV = new THREE.Vector3();
    const posOf = (b) => root.worldToLocal(b.getWorldPosition(tmpV.set(0, 0, 0)).clone());

    this.rest = {};
    for (const name of Object.keys(this.bones)) {
      const b = this.bones[name];
      const W = b.getWorldQuaternion(tmpQ).clone().premultiply(rootQInv);
      this.rest[name] = {
        pos: b.position.clone(),
        q0: b.quaternion.clone(),
        W,
        Wi: W.clone().invert(),
        worldPos: posOf(b),
        dir: null,
      };
    }
    for (const [name, childName] of Object.entries(AIM_CHILD)) {
      if (this.rest[name] && this.rest[childName]) {
        this.rest[name].dir = this.rest[childName].worldPos.clone().sub(this.rest[name].worldPos).normalize();
      }
    }

    // proportions (model units, cm for Mixamo) --------------------------
    const dist = (a, b) => (this.rest[a] && this.rest[b] ? this.rest[a].worldPos.distanceTo(this.rest[b].worldPos) : 0);
    this.upperArm = dist('LeftArm', 'LeftForeArm') || 25;
    this.foreArm = dist('LeftForeArm', 'LeftHand') || 25;
    this.legLength = dist('LeftUpLeg', 'LeftLeg') + dist('LeftLeg', 'LeftFoot') || 47;
    let top = -Infinity;
    root.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.geometry.computeBoundingBox();
        top = Math.max(top, o.geometry.boundingBox.max.y);
      }
    });
    this.height = Number.isFinite(top) && top > 0 ? top : 160;
    // targets in poses.js were authored for a 160-unit tall character
    this.k = this.height / 160;

    this.Rc = {};
    this._ident = new THREE.Quaternion();
  }

  /** Apply a full pose (see NEUTRAL in poses.js) to the skeleton. */
  apply(p) {
    const Rc = this.Rc;
    const ident = this._ident;

    const setBone = (name, Rl) => {
      const b = this.bones[name];
      const parent = PARENT[name];
      const Pc = parent && Rc[parent] ? Rc[parent] : ident;
      Rc[name] = Pc.clone().multiply(Rl);
      if (!b) return;
      const r = this.rest[name];
      // q_local = q0 * W^-1 * R * W  – applies model-space rotation R in the bone's rest frame
      b.quaternion.copy(r.q0).multiply(r.Wi).multiply(Rl).multiply(r.W);
    };
    const parentC = (name) => (PARENT[name] && Rc[PARENT[name]]) || ident;

    // -- phase 1: hips, spine, head, shoulders, legs ----------------------
    const hips = this.bones.Hips;
    const hp = this.rest.Hips.pos;
    hips.position.set(hp.x + p.hipsX * this.k, hp.y + p.hipsY * this.k, hp.z + p.hipsZ * this.k);
    setBone('Hips', qEuler(0, p.hipsYaw, p.hipsRoll));

    const sp = [
      ['Spine', 0.25],
      ['Spine1', 0.35],
      ['Spine2', 0.4],
    ];
    for (const [n, f] of sp) setBone(n, qEuler(p.spineX * f, p.spineY * f, p.spineZ * f));
    setBone('Neck', qEuler(p.headX * 0.35, p.headY * 0.35, p.headZ * 0.35));
    setBone('Head', qEuler(p.headX * 0.65, p.headY * 0.65, p.headZ * 0.65));

    for (const S of SIDES) {
      const s = S === 'Left' ? 1 : -1;
      const L = S === 'Left' ? 'L' : 'R';
      setBone(`${S}Shoulder`, qz(s * p[`shrug${L}`]));

      // legs: desired cumulative orientation is independent of the pelvis motion
      const Ph = Rc.Hips;
      const thighWorld = qz(s * p[`thighZ${L}`]).multiply(qx(p[`thighX${L}`]));
      setBone(`${S}UpLeg`, Ph.clone().invert().multiply(thighWorld));
      setBone(`${S}Leg`, qx(p[`kneeX${L}`]));
      const footWorld = qx(p[`footX${L}`]);
      setBone(`${S}Foot`, Rc[`${S}Leg`].clone().invert().multiply(footWorld));
    }

    // -- phase 2: arms via 2-bone IK ----------------------------------------
    this.root.updateMatrixWorld(true);
    const tmp = new THREE.Vector3();
    for (const S of SIDES) {
      const s = S === 'Left' ? 1 : -1;
      const L = S === 'Left' ? 'L' : 'R';
      const armBone = this.bones[`${S}Arm`];
      if (!armBone) continue;

      const P = this.root.worldToLocal(armBone.getWorldPosition(tmp.set(0, 0, 0)).clone());
      const chest = Rc.Spine2;
      const off = new THREE.Vector3(s * p[`h${L}x`], p[`h${L}y`], p[`h${L}z`]).multiplyScalar(this.k).applyQuaternion(chest);
      const T = P.clone().add(off);

      const l1 = this.upperArm;
      const l2 = this.foreArm;
      const axis = T.clone().sub(P);
      let d = axis.length();
      const maxReach = (l1 + l2) * 0.995;
      const minReach = Math.abs(l1 - l2) + 0.5;
      d = Math.min(Math.max(d, minReach), maxReach);
      axis.normalize();
      const Tc = P.clone().addScaledVector(axis, d);

      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
      const pole = new THREE.Vector3(s * p.poleX, p.poleY, p.poleZ).applyQuaternion(chest);
      pole.addScaledVector(axis, -pole.dot(axis));
      if (pole.lengthSq() < 1e-6) pole.set(0, -1, 0);
      pole.normalize();
      const E = P.clone().addScaledVector(axis, a).addScaledVector(pole, h);

      const aim = (name, dirWorld) => {
        const Pc = parentC(name);
        const local = dirWorld.clone().applyQuaternion(Pc.clone().invert());
        const Rl = new THREE.Quaternion().setFromUnitVectors(this.rest[name].dir, local);
        setBone(name, Rl);
      };
      aim(`${S}Arm`, E.clone().sub(P).normalize());
      aim(`${S}ForeArm`, Tc.clone().sub(E).normalize());
      setBone(`${S}Hand`, qx(0)); // follows forearm

      // relaxed fingers – curl toward the palm (palms face down in the rest T-pose)
      const curl = p[`fing${L}`];
      for (const f of FINGERS) {
        for (let i = 1; i <= 3; i++) {
          const amt = curl * [0.8, 1.0, 0.7][i - 1] * (f === 'Pinky' ? 1.15 : 1);
          setBone(`${S}Hand${f}${i}`, qz(-s * amt));
        }
      }
    }
  }
}
