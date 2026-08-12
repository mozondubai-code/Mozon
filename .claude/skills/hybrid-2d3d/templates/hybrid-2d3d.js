/* ============================================================
   HYBRID-2D3D — flat editorial layout with a smaller inline
   Three.js object that idle-rotates continuously (plus an
   optional pointer-tilt accent on fine-pointer devices). NOT
   scroll-pinned or scroll-progress-driven, unlike every other
   engine — this section relies on the sitewide .reveal
   IntersectionObserver for its fade-in, same as plain content.
   ============================================================ */

function buildHybridGeometry(motion, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette?.accent || "#38bdf8");
  const material = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.3 });

  switch (motion) {
    case "orbit":
    case "turntable": {
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), material));
      break;
    }
    case "morph":
    case "reveal": {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.32), material.clone());
        const angle = (i / count) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 1.1, Math.sin(angle) * 1.1, 0);
        group.add(mesh);
      }
      break;
    }
    case "abstract":
    case "abstract-drift":
    default: {
      group.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.75, 0.24, 100, 16), material));
      break;
    }
  }
  return group;
}

function initHybrid(cfg) {
  const section = document.querySelector(cfg.section);
  const stage = section?.querySelector(".hybrid-stage");
  const canvas = stage?.querySelector("canvas");
  if (!canvas) { console.warn(`hybrid-2d3d: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const reduceMotion = window.Choreography.prefersReducedMotion();
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  const group = buildHybridGeometry(cfg.motion, cfg.palette);
  scene.add(group);

  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(cfg.palette?.accent || "#38bdf8", 0.7); rim.position.set(-4, 2, -3);
  const fill = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function render() { renderer.render(scene, camera); }

  if (reduceMotion) {
    render();
    return { update: () => {}, resize };
  }

  let targetTiltX = 0, targetTiltY = 0;
  let tiltX = 0, tiltY = 0;

  if (hasFinePointer) {
    stage.addEventListener("pointermove", (event) => {
      const { x, y } = window.Choreography.normalizedPointer(event, stage);
      targetTiltY = x * 0.2;
      targetTiltX = y * 0.15;
    });
    stage.addEventListener("pointerleave", () => {
      targetTiltX = 0;
      targetTiltY = 0;
    });
  }

  let last = performance.now();
  function tick() {
    const rect = section.getBoundingClientRect();
    if (window.Choreography.isInViewport(rect, window.innerHeight)) {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      tiltX = window.Choreography.lerp(tiltX, targetTiltX, 0.08);
      tiltY = window.Choreography.lerp(tiltY, targetTiltY, 0.08);
      group.rotation.y += delta * 0.5 + tiltY * delta;
      group.rotation.x = tiltX;
      render();
    } else {
      last = performance.now();
    }
    requestAnimationFrame(tick);
  }

  render();
  requestAnimationFrame(tick);

  return { update: () => {}, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  // Hard dependency: choreography.js must be loaded before this file (see index.html).
  // Without it every Choreography.* call below throws — fail loudly instead.
  if (!window.Choreography) {
    console.error("hybrid-2d3d: choreography.js not loaded — add <script src=\"choreography.js\"> before hybrid-2d3d.js in index.html");
    return;
  }
  if (typeof THREE === "undefined") {
    console.error("hybrid-2d3d: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const hybrids = (window.HYBRID_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initHybrid)
    .filter(Boolean);

  window.__hybrid = hybrids; // debug handle
});
