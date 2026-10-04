import { useEffect, useRef } from "react";

const vertexSource = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Adapted from the supplied Predictive Arc: the arc responds gently to pointer movement.
const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime, uDpr, uCell, uDot;
uniform float uPeak, uHeight, uThick, uFall;
uniform vec3 uBase, uAccent, uHigh;
uniform vec2 uMouse;
uniform float uMouseRadius, uMouseStrength;
void main() {
  float cs = max(uCell, 2.0);
  vec2 ci = floor(gl_FragCoord.xy / cs);
  vec2 cc = (ci + 0.5) * cs;
  float x = cc.x / uDpr;
  float y = (uRes.y - cc.y) / uDpr;
  float w = uRes.x / uDpr;
  float h = uRes.y / uDpr;
  float normX = (x - w * 0.5) / (w * 0.75);
  float curveY = h * uPeak + normX * normX * (h * uHeight);
  float mdx = x - uMouse.x;
  float influence = uMouseStrength * exp(-(mdx * mdx) / (2.0 * uMouseRadius * uMouseRadius + 1.0));
  curveY = mix(curveY, uMouse.y, influence);
  float dist = abs(y - curveY);
  float th = (140.0 + (1.0 - abs(normX)) * 80.0) * uThick;
  float i = max(0.0, 1.0 - dist / th);
  float wave = sin(x * 0.015 + uTime) * cos(y * 0.02 + uTime);
  i = i * (0.7 + wave * 0.3);
  i *= max(0.0, 1.0 - pow(abs(normX), uFall));
  float side = uDot * i * uDpr;
  vec2 d = abs(gl_FragCoord.xy - cc);
  float cov = 1.0 - smoothstep(side * 0.5 - 1.0, side * 0.5 + 1.0, max(d.x, d.y));
  vec3 ink = mix(uBase, uAccent, clamp(pow(i, 1.1), 0.0, 1.0));
  ink = mix(ink, uHigh, smoothstep(0.72, 1.0, i));
  gl_FragColor = vec4(ink, cov * clamp(i * 1.6, 0.0, 1.0) * 0.7);
}
`;

function rgb(hex: string): [number, number, number] {
  const value = hex.trim().replace("#", "");
  if (!/^[\da-f]{6}$/i.test(value)) return [0.4, 0.6, 0.9];
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export default function PredictiveArc() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader);
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }
    const program = gl.createProgram();
    if (!program) { gl.deleteShader(vs); gl.deleteShader(fs); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(["uRes", "uTime", "uDpr", "uCell", "uDot", "uPeak", "uHeight", "uThick", "uFall", "uMouse", "uMouseRadius", "uMouseStrength", "uBase", "uAccent", "uHigh"].map(name => [name, gl.getUniformLocation(program, name)]));
    const u = (name: string) => uniforms[name] ?? null;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: 0, targetActive: 0 };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let frame = 0;
    let clock = 0;
    let last = performance.now();
    const render = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced.matches) clock = (clock + dt * 0.72) % 6283;
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      pointer.x += (pointer.targetX - pointer.x) * Math.min(1, dt * 12);
      pointer.y += (pointer.targetY - pointer.y) * Math.min(1, dt * 12);
      pointer.active += (pointer.targetActive - pointer.active) * Math.min(1, dt * 6);
      const css = getComputedStyle(wrapper);
      const base = rgb(css.getPropertyValue("--arc-base"));
      const accent = rgb(css.getPropertyValue("--arc-accent"));
      const high = rgb(css.getPropertyValue("--arc-high"));
      const cell = Math.min(width, height) / 85;
      gl.uniform2f(u("uRes"), pixelWidth, pixelHeight);
      gl.uniform1f(u("uTime"), clock);
      gl.uniform1f(u("uDpr"), dpr);
      gl.uniform1f(u("uCell"), cell * dpr);
      gl.uniform1f(u("uDot"), cell * 1.25 * dpr);
      gl.uniform1f(u("uPeak"), 0.58);
      gl.uniform1f(u("uHeight"), 0.68);
      gl.uniform1f(u("uThick"), 1.5);
      gl.uniform1f(u("uFall"), 5);
      gl.uniform2f(u("uMouse"), pointer.x, pointer.y);
      gl.uniform1f(u("uMouseRadius"), 236);
      gl.uniform1f(u("uMouseStrength"), pointer.active * 0.34);
      gl.uniform3f(u("uBase"), ...base);
      gl.uniform3f(u("uAccent"), ...accent);
      gl.uniform3f(u("uHigh"), ...high);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced.matches) frame = requestAnimationFrame(render);
    };
    const start = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); };
    const onPointerMove = (event: PointerEvent) => {
      const bounds = wrapper.getBoundingClientRect();
      pointer.targetX = event.clientX - bounds.left;
      pointer.targetY = bounds.height - (event.clientY - bounds.top);
      pointer.targetActive = 1;
      start();
    };
    const onPointerLeave = () => { pointer.targetActive = 0; start(); };
    const onVisibility = () => { last = performance.now(); start(); };
    const resize = new ResizeObserver(start);
    resize.observe(wrapper);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; if (visible) start(); else { cancelAnimationFrame(frame); frame = 0; } });
    intersection.observe(wrapper);
    const onTheme = () => start();
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onTheme);
    start();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect(); intersection.disconnect(); themeObserver.disconnect();
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onTheme);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, []);

  return <div className="predictive-arc" ref={wrapperRef} aria-hidden="true"><canvas ref={canvasRef} /></div>;
}