import { useEffect, useRef } from "react";
import {
  BufferAttribute, BufferGeometry, Color, Group, LineBasicMaterial, LineSegments,
  Mesh, MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial, Quaternion,
  Scene, SphereGeometry, Vector3, WebGLRenderer, WireframeGeometry,
} from "three";
import landPoints from "@/assets/earth-land-points.json";

const locations = [
  { name: "Kigali", lat: -1.95, lng: 30.06 },
  { name: "London", lat: 51.51, lng: -0.13 },
  { name: "New York", lat: 40.71, lng: -74.01 },
  { name: "Singapore", lat: 1.35, lng: 103.82 },
  { name: "São Paulo", lat: -23.55, lng: -46.63 },
];

const radius = 1.48;
const toPosition = (lat: number, lng: number, r = radius) => {
  const phi = lat * Math.PI / 180;
  const theta = lng * Math.PI / 180;
  return new Vector3(r * Math.cos(phi) * Math.sin(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(theta));
};

/** Locally sourced point globe, with screen-axis dragging and frame-independent inertia. */
export default function EarthGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 5.4;
    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    container.prepend(renderer.domElement);

    const globe = new Group();
    globe.rotation.set(0.18, -0.48, 0);
    scene.add(globe);
    const ocean = new Mesh(new SphereGeometry(radius - 0.014, 48, 36), new MeshBasicMaterial());
    globe.add(ocean);
    const wireGeometry = new WireframeGeometry(new SphereGeometry(radius, 24, 16));
    const wire = new LineSegments(wireGeometry, new LineBasicMaterial({ transparent: true, opacity: 0.1, depthWrite: false }));
    globe.add(wire);
    const positions = new Float32Array(landPoints.length * 3);
    landPoints.forEach(([lat, lng], i) => {
      const point = toPosition(lat ?? 0, lng ?? 0);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const land = new Points(geometry, new PointsMaterial({ size: 0.021, sizeAttenuation: true }));
    globe.add(land);

    const markerPositions = locations.map(({ lat, lng }) => toPosition(lat, lng, radius + 0.015));
    const projected = new Vector3();
    const yawAxis = new Vector3(0, 1, 0);
    const pitchAxis = new Vector3(1, 0, 0);
    const turn = new Quaternion();
    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let lastPointerTime = 0;
    let velocityX = 0;
    let velocityY = 0;

    const rotate = (dx: number, dy: number) => {
      turn.setFromAxisAngle(yawAxis, dx);
      globe.quaternion.premultiply(turn);
      turn.setFromAxisAngle(pitchAxis, dy);
      globe.quaternion.premultiply(turn);
      globe.quaternion.normalize();
    };
    const draw = () => {
      renderer.render(scene, camera);
      globe.updateMatrixWorld();
      markerPositions.forEach((position, i) => {
        const marker = markerRefs.current[i];
        if (!marker) return;
        projected.copy(position).applyMatrix4(globe.matrixWorld);
        const facing = projected.z > 0.22;
        if (!facing) { marker.style.opacity = "0"; return; }
        projected.project(camera);
        marker.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        marker.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
        marker.style.opacity = "1";
      });
    };
    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.hidden) { lastTime = 0; return; }
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      if (pointerId === null) {
        const moving = Math.abs(velocityX) + Math.abs(velocityY) > 0.015;
        if (moving) {
          rotate(velocityX * dt, velocityY * dt);
          const friction = Math.exp(-4 * dt);
          velocityX *= friction;
          velocityY *= friction;
        } else {
          velocityX = 0;
          velocityY = 0;
          if (!reduceMotion.matches) rotate(0.16 * dt, 0);
        }
      }
      draw();
      if (!reduceMotion.matches || pointerId !== null || Math.abs(velocityX) + Math.abs(velocityY) > 0.015) {
        frame = requestAnimationFrame(tick);
      }
    };
    const start = () => { if (visible && !document.hidden && !frame) frame = requestAnimationFrame(tick); };
    const refreshTheme = () => {
      const css = getComputedStyle(container);
      (ocean.material as MeshBasicMaterial).color = new Color(css.getPropertyValue("--globe-ocean").trim());
      (land.material as PointsMaterial).color = new Color(css.getPropertyValue("--globe-land").trim());
      (wire.material as LineBasicMaterial).color = new Color(css.getPropertyValue("--globe-grid").trim());
      draw();
    };
    refreshTheme();
    const mutation = new MutationObserver(refreshTheme);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const resize = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      draw();
    });
    resize.observe(container);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) start();
      else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    }, { threshold: 0.05 });
    intersection.observe(container);
    const onVisibility = () => { if (!document.hidden) start(); else lastTime = 0; };
    const onMotionChange = () => { if (reduceMotion.matches && pointerId === null) { cancelAnimationFrame(frame); frame = 0; draw(); } else start(); };
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", onMotionChange);

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      lastPointerTime = event.timeStamp;
      velocityX = 0;
      velocityY = 0;
      container.setPointerCapture(event.pointerId);
      start();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = (event.clientX - lastX) * 0.006;
      const dy = (event.clientY - lastY) * 0.006;
      const elapsed = Math.max((event.timeStamp - lastPointerTime) / 1000, 0.008);
      rotate(dx, dy);
      velocityX = Math.max(-3.5, Math.min(3.5, dx / elapsed));
      velocityY = Math.max(-3.5, Math.min(3.5, dy / elapsed));
      lastX = event.clientX;
      lastY = event.clientY;
      lastPointerTime = event.timeStamp;
      draw();
      start();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
      start();
    };
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      mutation.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionChange);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      geometry.dispose();
      (land.material as PointsMaterial).dispose();
      wireGeometry.dispose();
      (wire.material as LineBasicMaterial).dispose();
      ocean.geometry.dispose();
      (ocean.material as MeshBasicMaterial).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="earth-globe" aria-label="Interactive globe of Earth; drag left, right, up, or down to rotate" role="img">
    {locations.map((place, i) => <span key={place.name} ref={el => { markerRefs.current[i] = el; }} className="globe-ping globe-location"><i />{place.name}</span>)}
  </div>;
}