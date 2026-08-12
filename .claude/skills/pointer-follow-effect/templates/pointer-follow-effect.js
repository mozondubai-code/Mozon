/* ============================================================
   POINTER-FOLLOW-EFFECT — real-time WebGL engine driven by CURSOR
   position instead of scroll progress. Scroll still pins the
   section and drives the .reveal-line overlay, same as the
   other engines — only the 3D scene itself listens to the
   pointer here. Mirrors 3d-scene-effect.js's structure so all
   three engines can coexist on one page.
   ============================================================ */

function buildParallaxGeometry(motion, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette?.accent || "#ffb443");
  const bg = new THREE.Color(palette?.bg || "#0a0a12");

  const material = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.55,
    roughness: 0.3,
  });

  switch (motion) {
    case "orbit":
    case "turntable": {
      const geo = new THREE.IcosahedronGeometry(1.4, 1);
      const mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
      break;
    }
    case "morph":
    case "reveal": {
      const count = 18;
      for (let i = 0; i < count; i++) {
        const geo = new THREE.TetrahedronGeometry(0.32);
        const mesh = new THREE.Mesh(geo, material.clone());
        const angle = (i / count) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 1.3, Math.sin(angle) * 1.3, (Math.random() - 0.5) * 0.6);
        group.add(mesh);
      }
      break;
    }
    case "image-plane": {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(palette?.imagePath || "");
      const aspect = palette?.imageAspect || 16 / 9;
      const geo = new THREE.PlaneGeometry(3 * aspect, 3, 32, 32);
      const planeMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(geo, planeMaterial);
      group.add(plane);

      const shadowGeo = new THREE.PlaneGeometry(4 * aspect, 4);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
      const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
      shadowPlane.position.set(0, -1.8, -0.5);
      shadowPlane.rotation.x = -Math.PI / 2.2;
      group.add(shadowPlane);
      break;
    }
    case "abstract":
    case "abstract-drift":
    default: {
      const particleCount = 220;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 5;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pMaterial = new THREE.PointsMaterial({ color: accent, size: 0.045, transparent: true, opacity: 0.85 });
      group.add(new THREE.Points(geo, pMaterial));
      break;
    }
  }
  return { group, bg };
}

function initParallax(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`pointer-follow-effect: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const reduceMotion = window.Choreography.prefersReducedMotion();
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  const { group, bg } = buildParallaxGeometry(cfg.motion, cfg.palette);
  scene.background = bg;
  scene.add(group);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(cfg.palette?.accent || "#ffb443", 0.8);
  rim.position.set(-4, 2, -3);
  const fill = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const basePosition = new THREE.Vector3(0, 0, 6);
  camera.position.copy(basePosition);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function applyPointer(nx, ny) {
    camera.position.x = basePosition.x + nx * 1.6;
    camera.position.y = basePosition.y - ny * 1.0;
    camera.lookAt(0, 0, 0);
    group.rotation.y = nx * 0.25;
    group.rotation.x = ny * 0.15;
  }

  function applyOverlayProgress() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const p = window.Choreography.progress(rect, window.innerHeight);
    for (const el of section.querySelectorAll(".reveal-line")) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const mid = (a + b) / 2, half = (b - a) / 2;
      let o = 1 - Math.abs(p - mid) / half;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${(1 - o) * 30}px)`;
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  // Static centered pose for reduced motion or no fine pointer available —
  // never leave the canvas blank on touch devices.
  if (reduceMotion || !hasFinePointer) {
    applyPointer(0, 0);
    render();
    return { update: applyOverlayProgress, resize };
  }

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  const damping = 0.08;

  section.addEventListener("pointermove", (event) => {
    const { x, y } = window.Choreography.normalizedPointer(event, section);
    targetX = x;
    targetY = y;
  });
  section.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
  });

  function tick() {
    currentX = window.Choreography.lerp(currentX, targetX, damping);
    currentY = window.Choreography.lerp(currentY, targetY, damping);
    applyPointer(currentX, currentY);
    render();
    requestAnimationFrame(tick);
  }

  render(); // paint an initial centered frame immediately
  requestAnimationFrame(tick);

  return { update: applyOverlayProgress, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  // Hard dependency: choreography.js must be loaded before this file (see index.html).
  // Without it every Choreography.* call below throws — fail loudly instead.
  if (!window.Choreography) {
    console.error("pointer-follow-effect: choreography.js not loaded — add <script src=\"choreography.js\"> before pointer-follow-effect.js in index.html");
    return;
  }
  if (typeof THREE === "undefined") {
    console.error("pointer-follow-effect: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const parallaxes = (window.PARALLAX_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initParallax)
    .filter(Boolean);

  window.__parallax = parallaxes; // debug handle: __parallax.forEach(p => p.update())

  // The camera itself updates on its own rAF loop (wired inside initParallax) —
  // this hook only drives the scroll-based overlay reveal-line update, same
  // coexistence pattern 3d-scene-effect uses for hooking into an existing Lenis.
  function hookIntoRaf() {
    if (window.__lenis) {
      window.__lenis.on("scroll", () => parallaxes.forEach((p) => p.update()));
      parallaxes.forEach((p) => p.update());
    } else {
      function raf() {
        parallaxes.forEach((p) => p.update());
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }
  hookIntoRaf();
});
