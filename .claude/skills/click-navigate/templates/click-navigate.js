/* ============================================================
   CLICK-NAVIGATE — real-time WebGL engine driven by discrete
   hotspot clicks instead of scroll or pointer position. Clicking
   a hotspot tweens the camera to a named waypoint. Mirrors
   3d-scene-effect.js's structure so all engines can coexist.
   ============================================================ */

function buildExploreGeometry(motion, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette?.accent || "#38bdf8");
  const bg = new THREE.Color(palette?.bg || "#0a0a12");

  const material = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.6, roughness: 0.35 });

  switch (motion) {
    case "morph":
    case "reveal": {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const geo = new THREE.TetrahedronGeometry(0.3);
        const mesh = new THREE.Mesh(geo, material.clone());
        const angle = (i / count) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0);
        group.add(mesh);
      }
      break;
    }
    case "abstract":
    case "abstract-drift": {
      const particleCount = 240;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 5;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pMaterial = new THREE.PointsMaterial({ color: accent, size: 0.04, transparent: true, opacity: 0.85 });
      group.add(new THREE.Points(geo, pMaterial));
      break;
    }
    case "orbit":
    case "turntable":
    default: {
      const geo = new THREE.IcosahedronGeometry(1.4, 1);
      const mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
      break;
    }
  }
  return { group, bg };
}

function initExplore(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`click-navigate: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const reduceMotion = window.Choreography.prefersReducedMotion();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  const { group, bg } = buildExploreGeometry(cfg.motion, cfg.palette);
  scene.background = bg;
  scene.add(group);

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(cfg.palette?.accent || "#38bdf8", 0.8); rim.position.set(-4, 2, -3);
  const fill = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(key, rim, fill);

  const waypoints = cfg.waypoints && cfg.waypoints.length ? cfg.waypoints : [
    { id: "default", label: "View", caption: "", camera: { x: 0, y: 0, z: 6 }, lookAt: { x: 0, y: 0, z: 0 } },
  ];

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const currentCam = new THREE.Vector3(waypoints[0].camera.x, waypoints[0].camera.y, waypoints[0].camera.z);
  const currentLook = new THREE.Vector3(waypoints[0].lookAt.x, waypoints[0].lookAt.y, waypoints[0].lookAt.z);
  camera.position.copy(currentCam);
  camera.lookAt(currentLook);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function render() { renderer.render(scene, camera); }

  const captionEl = section.querySelector(".explore-caption");
  const hotspots = [...section.querySelectorAll(".hotspot")];

  function setActiveWaypoint(index) {
    const wp = waypoints[index];
    if (!wp) return;
    if (captionEl) captionEl.textContent = wp.caption || wp.label || "";
    hotspots.forEach((h, i) => h.classList.toggle("active", i === index));
    return wp;
  }
  setActiveWaypoint(0);

  // Reduced motion: clicking still works, but jumps instantly (no tween).
  if (reduceMotion) {
    render();
    hotspots.forEach((h) => {
      h.addEventListener("click", () => {
        const index = Number(h.dataset.waypoint);
        const wp = setActiveWaypoint(index);
        if (!wp) return;
        camera.position.set(wp.camera.x, wp.camera.y, wp.camera.z);
        camera.lookAt(wp.lookAt.x, wp.lookAt.y, wp.lookAt.z);
        render();
      });
    });
    return { update: () => {}, resize };
  }

  let tween = null; // { fromCam, toCam, fromLook, toLook, start, duration }

  hotspots.forEach((h) => {
    h.addEventListener("click", () => {
      const index = Number(h.dataset.waypoint);
      const wp = setActiveWaypoint(index);
      if (!wp) return;
      tween = {
        fromCam: currentCam.clone(),
        toCam: new THREE.Vector3(wp.camera.x, wp.camera.y, wp.camera.z),
        fromLook: currentLook.clone(),
        toLook: new THREE.Vector3(wp.lookAt.x, wp.lookAt.y, wp.lookAt.z),
        start: performance.now(),
        duration: 600,
      };
    });
  });

  function tick() {
    if (tween) {
      const elapsed = performance.now() - tween.start;
      const t = Math.min(elapsed / tween.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      currentCam.lerpVectors(tween.fromCam, tween.toCam, eased);
      currentLook.lerpVectors(tween.fromLook, tween.toLook, eased);
      camera.position.copy(currentCam);
      camera.lookAt(currentLook);
      render();
      if (t >= 1) tween = null;
    }
    // Idle drift so the scene doesn't feel static between clicks.
    group.rotation.y += 0.0015;
    render();
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
    console.error("click-navigate: choreography.js not loaded — add <script src=\"choreography.js\"> before click-navigate.js in index.html");
    return;
  }
  if (typeof THREE === "undefined") {
    console.error("click-navigate: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const explorers = (window.EXPLORE_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initExplore)
    .filter(Boolean);

  window.__explore = explorers; // debug handle
});
