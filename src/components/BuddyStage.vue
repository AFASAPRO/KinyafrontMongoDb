<template>
  <div class="buddy-stage-host" ref="hostRef">
    <div
      v-if="phase === 'ready'"
      class="buddy-mouth"
      :class="{ talking: talking }"
      :style="mouthStyle"
      aria-hidden="true"
    >
      <svg viewBox="0 0 60 34" class="mouth-svg">
        <ellipse cx="30" cy="17" :ry="mouthRy" rx="15" class="mouth-fill" />
        <ellipse cx="30" cy="17" :ry="Math.max(1.5, mouthRy * 0.42)" rx="9.5" class="mouth-inner" />
      </svg>
    </div>

    <div v-if="phase !== 'ready'" class="buddy-loading" :class="{ 'is-error': phase === 'error' }" role="status">
      <template v-if="phase === 'error'">
        <i class="fas fa-triangle-exclamation"></i>
        <p>{{ error || 'Could not load the character.' }}</p>
      </template>
      <template v-else>
        <p>Waking up your buddy…</p>
        <div class="buddy-bar"><span :style="{ width: `${Math.round(progress * 100)}%` }"></span></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Rig } from '../character/rig.js'

const props = defineProps({
  controller: { type: Object, required: true },
  audioLevel: { type: Number, default: 0 },   // 0..1 live speech amplitude
  talking: { type: Boolean, default: false },
})
const emit = defineEmits(['poke', 'ready'])

const hostRef = ref(null)
const phase = ref('loading') // loading | ready | error
const progress = ref(0)
const error = ref('')

// Screen-space mouth overlay, projected from the character's head each frame.
const mouthPos = ref({ x: 0, y: 0, scale: 1, visible: false })
const mouthOpen = ref(0) // smoothed 0..1

const mouthRy = computed(() => 3 + mouthOpen.value * 10)
const mouthStyle = computed(() => ({
  transform: `translate3d(${mouthPos.value.x}px, ${mouthPos.value.y}px, 0) translate(-50%, -50%) scale(${mouthPos.value.scale})`,
  opacity: mouthPos.value.visible ? 1 : 0,
}))

let renderer, scene, camera, controls, ro, headBone, container
let disposed = false
let el, hitbox, pokeDown = null
const targetLevel = { v: 0 }

watch(() => props.audioLevel, (v) => { targetLevel.v = Math.max(0, Math.min(1, v)) })

onMounted(() => {
  const host = hostRef.value
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (e) {
    phase.value = 'error'
    error.value = 'Your browser could not start WebGL, which is needed to show your buddy.'
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'buddy-canvas'
  host.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  const TARGET = new THREE.Vector3(0, 0.82, 0)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(TARGET)
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = 1.0
  controls.maxPolarAngle = 1.65
  controls.minAzimuthAngle = -1.1
  controls.maxAzimuthAngle = 1.1
  controls.rotateSpeed = 0.55

  let userMoved = false
  controls.addEventListener('start', () => { userMoved = true })

  const fit = () => {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const dist = Math.max(2.75 / 2 / tan, 1.0 / (tan * camera.aspect))
    controls.minDistance = dist * 0.62
    controls.maxDistance = dist * 1.3
    if (!userMoved) {
      camera.position.set(0, TARGET.y + 0.2, dist)
      controls.update()
    }
  }
  fit()
  ro = new ResizeObserver(fit)
  ro.observe(host)

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc7cad1, 0.65))
  const key = new THREE.DirectionalLight(0xffffff, 2.3)
  key.position.set(2.2, 3.6, 3.4)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -2; key.shadow.camera.right = 2
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -1
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 12
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xd7dbe3, 1.4)
  rim.position.set(-3, 2.6, -2.6)
  scene.add(rim)

  const groundColor = new THREE.Color(getComputedStyle(host).getPropertyValue('--vm-accent') || '#f5a524')
  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 40),
    new THREE.MeshBasicMaterial({ color: groundColor, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }),
  )
  spot.rotation.x = -Math.PI / 2
  spot.position.y = 0.001
  scene.add(spot)
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.22 }))
  shadowCatcher.rotation.x = -Math.PI / 2
  shadowCatcher.position.y = 0.002
  shadowCatcher.receiveShadow = true
  scene.add(shadowCatcher)

  hitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.75, 12), new THREE.MeshBasicMaterial({ visible: false }))
  hitbox.position.y = 0.875
  scene.add(hitbox)

  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  el = renderer.domElement
  const hits = (ev) => {
    const r = el.getBoundingClientRect()
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1))
    ray.setFromCamera(ndc, camera)
    return ray.intersectObject(hitbox).length > 0
  }
  const onDown = (ev) => { pokeDown = { x: ev.clientX, y: ev.clientY, t: performance.now() } }
  const onUp = (ev) => {
    if (!pokeDown) return
    const moved = Math.hypot(ev.clientX - pokeDown.x, ev.clientY - pokeDown.y)
    const quick = performance.now() - pokeDown.t < 450
    pokeDown = null
    if (moved < 6 && quick && hits(ev)) emit('poke')
  }
  const onMove = (ev) => {
    const r = el.getBoundingClientRect()
    const nx = ((ev.clientX - r.left) / r.width) * 2 - 1
    const ny = -(((ev.clientY - r.top) / r.height) * 2 - 1)
    props.controller.setLook(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny - 0.2)))
    if (!pokeDown) el.style.cursor = hits(ev) ? 'pointer' : 'grab'
  }
  const onLeave = () => props.controller.setLook(0, 0)
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)

  container = new THREE.Group()
  scene.add(container)
  let model = null

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  loader.load(
    `${import.meta.env.BASE_URL}models/character.glb`,
    (gltf) => {
      if (disposed) return
      const obj = gltf.scene
      obj.scale.setScalar(0.01) // model is authored in ~160cm units
      obj.traverse((o) => {
        if (!o.isMesh) return
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
        if (o.isBone) return
        const mat = o.material
        if (mat) { mat.envMapIntensity = 0.55; if (mat.map) mat.map.anisotropy = 8 }
      })
      obj.traverse((o) => { if (o.isBone && /Head$/.test(o.name)) headBone = o })
      container.add(obj)
      model = obj
      try {
        props.controller.attach(new Rig(obj), container)
      } catch (e) {
        phase.value = 'error'
        error.value = e.message
        return
      }
      phase.value = 'ready'
      props.controller.perform('wave')
      emit('ready')
    },
    (e) => {
      if (disposed) return
      const total = e.lengthComputable && e.total ? e.total : 1000000
      progress.value = Math.min(0.99, e.loaded / total)
    },
    (e) => {
      if (disposed) return
      phase.value = 'error'
      error.value = 'Could not load your buddy. Please check your connection and try again.'
      console.error(e)
    },
  )

  const tmpV = new THREE.Vector3()
  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta()
    props.controller.update(dt)

    // mouth level: smooth toward target, add a little idle wobble while talking
    const k = 1 - Math.exp(-dt * 12)
    mouthOpen.value += (targetLevel.v - mouthOpen.value) * k
    if (props.talking) mouthOpen.value = Math.max(mouthOpen.value, 0.06 + 0.04 * Math.sin(performance.now() / 90))

    if (headBone && host) {
      headBone.getWorldPosition(tmpV)
      tmpV.applyMatrix4(container.matrixWorld)
      // small offset down/forward from the head pivot to sit roughly at the mouth
      const local = tmpV.clone()
      local.y -= 0.12
      local.z += 0.01
      local.project(camera)
      const w = host.clientWidth, h = host.clientHeight
      const x = (local.x * 0.5 + 0.5) * w
      const y = (-local.y * 0.5 + 0.5) * h
      const dist = camera.position.distanceTo(tmpV)
      mouthPos.value = { x, y, scale: Math.max(0.5, Math.min(1.6, 2.4 / dist)), visible: local.z < 1 }
    }

    const lift = Math.max(0, (props.controller.lastPose?.hipsY || 0) / 100)
    const s = 1 - Math.min(lift / 0.7, 0.6)
    spot.scale.setScalar(Math.max(0.35, s))
    spot.material.opacity = 0.1 * (1 - Math.min(lift / 0.8, 0.8))
    spot.position.x = container.position.x
    spot.position.z = container.position.z

    controls.update()
    renderer.render(scene, camera)
  })
})

onBeforeUnmount(() => {
  disposed = true
  if (renderer) renderer.setAnimationLoop(null)
  ro?.disconnect()
  if (el) {
    el.replaceWith?.(el.cloneNode(false)) // drop listeners quickly; full dispose below is enough for GC
  }
  controls?.dispose()
  scene?.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    mats.forEach((m) => {
      ['map', 'normalMap'].forEach((k) => m[k]?.dispose?.())
      m.dispose()
    })
  })
  renderer?.dispose()
  renderer?.domElement?.remove()
})
</script>

<style scoped>
.buddy-stage-host { position: relative; width: 100%; height: 100%; touch-action: none; }
.buddy-stage-host :deep(.buddy-canvas) { width: 100%; height: 100%; display: block; }

.buddy-mouth {
  position: absolute; top: 0; left: 0;
  width: 62px; height: 34px;
  pointer-events: none;
  transition: opacity .25s ease;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,.35));
}
.mouth-svg { width: 100%; height: 100%; overflow: visible; }
.mouth-fill { fill: #6b2a2a; stroke: rgba(0,0,0,.15); stroke-width: 0.5; }
.mouth-inner { fill: #d97a76; }

.buddy-loading {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: rgba(255,255,255,.85); text-align: center; padding: 24px;
}
.buddy-loading.is-error i { font-size: 26px; color: #fca5a5; margin-bottom: 4px; }
.buddy-bar { width: 180px; height: 6px; border-radius: 99px; background: rgba(255,255,255,.14); overflow: hidden; }
.buddy-bar span { display: block; height: 100%; background: var(--vm-accent, #f5a524); transition: width .15s ease; }
</style>
