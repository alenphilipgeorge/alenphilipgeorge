// The profile banner: a kinetic installation of polished steel spheres hung on
// hairline wires, moving together in slow waves across the whole frame.
// Every frame is a pure function of t (seconds into the loop), so the recorder
// can step through it deterministically and the loop closes seamlessly.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const W = 1600;
export const H = 640;
export const LOOP = 10;

// One room per GitHub theme. The steel only shows what it reflects, so the
// light theme is a bright seamless studio with dark flags either side to keep
// the spheres' outlines, and the dark theme a gallery lit by a few softboxes.
const THEME = new URLSearchParams(location.search).get("theme") === "light" ? "light" : "dark";
const ROOM = {
  dark: {
    background: "#0b0e13",
    envBase: "#040507",
    exposure: 1.0,
    bloom: 0.35,
    wire: "#7d8696",
    panels: [
      [9, 3.5, "#fff0dc", 5, [0, 7, 2]], // broad warm overhead
      [1.4, 7, "#d6e4ff", 3.2, [-7, 1.5, 3]], // cool strip, left
      [1.2, 6, "#ffffff", 2.4, [7, 2, -2]], // rim, right
      [12, 1.2, "#ffe2bd", 0.9, [0, -2, -8]], // low glow behind
      [3, 1.2, "#ffffff", 1.6, [2, 0.5, 9]], // small kicker from the viewer's side
    ],
  },
  light: {
    background: "#eceef1",
    envBase: "#8f959d",
    exposure: 0.95,
    bloom: 0.08,
    wire: "#7a818d",
    panels: [
      [14, 6, "#ffffff", 2.4, [0, 7, 1]], // the white sweep overhead
      [3, 8, "#ffffff", 1.5, [-7, 1, 4]],
      [3, 8, "#ffffff", 1.4, [7, 1, -3]],
      [3.5, 10, "#0b0d10", 1, [-6, 0.5, -4]], // black flags that draw the spheres' edges
      [3.5, 10, "#0b0d10", 1, [6.5, 0.5, 5]],
      [26, 4, "#1c1f25", 1, [0, -3, -9]], // dark horizon low behind
    ],
  },
}[THEME];

const COLS = 84;
const ROWS = 44;
const GAP = 0.165;
const RADIUS = 0.066;

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = ROOM.exposure;

const scene = new THREE.Scene();
scene.background = new THREE.Color(ROOM.background);
scene.fog = new THREE.Fog(ROOM.background, 7, 16);

scene.environment = (() => {
  const room = new THREE.Scene();
  room.background = new THREE.Color(ROOM.envBase);
  for (const [w, h, color, power, position] of ROOM.panels) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }),
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  }
  return new THREE.PMREMGenerator(renderer).fromScene(room, 0).texture;
})();

const camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 60);
const LOOK = new THREE.Vector3(0.6, -0.35, -0.6);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const focus = new BokehPass(scene, camera, { focus: 6.6, aperture: 0.0022, maxblur: 0.008 });
composer.addPass(focus);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), ROOM.bloom, 0.3, 1.6));
composer.addPass(new OutputPass());

const key = new THREE.DirectionalLight("#ffe8cc", 2.2);
key.position.set(-2, 6, 3);
const kick = new THREE.DirectionalLight("#cfe0ff", 1.2);
kick.position.set(5, 1.5, 4);
scene.add(key, kick);

// ---------- spheres and wires ----------
const steel = new THREE.MeshStandardMaterial({ color: "#e7e9ee", metalness: 1, roughness: 0.14, envMapIntensity: 1.15 });
const spheres = new THREE.InstancedMesh(new THREE.SphereGeometry(RADIUS, 40, 28), steel, COLS * ROWS);
scene.add(spheres);

const grid = [];
for (let j = 0; j < ROWS; j++) {
  for (let i = 0; i < COLS; i++) {
    grid.push({ x: (i - (COLS - 1) / 2) * GAP, z: (j - (ROWS - 1) / 2) * GAP + 1.1 });
  }
}

// Each wire runs from its sphere up into the dark: bright at the sphere,
// fading to the room's colour well before the top of the frame.
const wirePositions = new Float32Array(grid.length * 6);
const wireColors = new Float32Array(grid.length * 6);
{
  const near = new THREE.Color(ROOM.wire);
  const far = new THREE.Color(ROOM.background);
  for (let n = 0; n < grid.length; n++) wireColors.set([near.r, near.g, near.b, far.r, far.g, far.b], n * 6);
}
const wires = new THREE.LineSegments(
  new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(wirePositions, 3))
    .setAttribute("color", new THREE.BufferAttribute(wireColors, 3)),
  new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, fog: true }),
);
scene.add(wires);

// The choreography: a long swell, a ripple that blooms from one point, and a
// cross-wave, handed between each other over the loop. Every term repeats with
// the loop's phase, so the last frame leads straight into the first.
function heightAt(x, z, phase) {
  const r = Math.hypot(x - 1.6, z + 0.2);
  const swell = 0.4 * Math.sin(0.5 * x + 0.85 * z - phase);
  const ripple = 0.36 * Math.sin(2.3 * r - 2 * phase) * Math.exp(-0.08 * r * r);
  const cross = 0.2 * Math.sin(0.9 * x - phase) * Math.cos(1.2 * z + 2 * phase);
  const bloom = 0.5 - 0.5 * Math.cos(phase);
  return swell * (1 - 0.55 * bloom) + ripple * bloom + cross * (0.5 + 0.5 * Math.sin(phase));
}

const m = new THREE.Matrix4();
function place(phase) {
  grid.forEach(({ x, z }, n) => {
    const y = heightAt(x, z, phase);
    spheres.setMatrixAt(n, m.makeTranslation(x, y, z));
    wirePositions.set([x, y + RADIUS, z, x, y + 2.0, z], n * 6);
  });
  spheres.instanceMatrix.needsUpdate = true;
  wires.geometry.attributes.position.needsUpdate = true;
}

export function renderAt(t) {
  t = ((t % LOOP) + LOOP) % LOOP;
  const phase = (2 * Math.PI * t) / LOOP;
  camera.position.set(0.9 + 0.45 * Math.sin(phase), 1.15 + 0.08 * Math.sin(phase + 1.2), 6.2);
  camera.lookAt(LOOK);
  focus.uniforms.focus.value = camera.position.distanceTo(new THREE.Vector3(1.4, 0, 0.4));
  place(phase);
  composer.render();
  return renderer.domElement;
}
