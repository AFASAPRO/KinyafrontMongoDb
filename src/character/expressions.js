/**
 * Expression state
 * ----------------
 * kinya-character.glb is now a real rigged skeleton (arms, legs, spine,
 * head all move), but it still has no facial blendshapes/morph targets —
 * RigBake's auto-rig only bakes body bones, not a face rig. So real 3D
 * facial expressions still aren't possible; we drive a small 2D expression
 * badge instead (see ExpressionBadge.vue) that floats above the model and
 * always shows one of the character sheet's six expressions: happy,
 * thinking, excited, winking, surprised, cool.
 *
 * deriveExpression() is a pure function of the conversation state so it's
 * easy to reason about and test — it never touches the DOM or three.js.
 */

export const EXPRESSIONS = ['happy', 'thinking', 'excited', 'winking', 'surprised', 'cool']

// One-shot moves map to a specific expression while they're playing.
const MOVE_EXPRESSION = {
  wow: 'surprised',
  cheer: 'excited',
  dance: 'excited',
  spin: 'excited',
  clap: 'excited',
  laugh: 'excited',
  jump: 'excited',
  wink: 'winking',
  think: 'thinking',
  shrug: 'thinking',
  sad: 'thinking',
  shake: 'thinking',
  wave: 'happy',
  nod: 'happy',
  bow: 'happy',
}

/**
 * @param {{mode:'idle'|'listen'|'think'|'talk', move:string|null, energy:number}} state
 * @returns {string} one of EXPRESSIONS
 */
export function deriveExpression({ mode, move, energy = 0 }) {
  if (move && MOVE_EXPRESSION[move]) return MOVE_EXPRESSION[move]

  switch (mode) {
    case 'listen':
      return 'happy'
    case 'think':
      return 'thinking'
    case 'talk':
      return energy > 0.5 ? 'excited' : 'happy'
    case 'idle':
    default:
      return 'cool'
  }
}
