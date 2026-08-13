/* ============================================================
   3D-SCENE-EFFECT — real-time WebGL scroll engine (Three.js)
   Multiple procedural 3D scenes driven by scroll progress
   Mirrors video-scroll-effect.js's structure so both can coexist.
   ============================================================ */

function buildGeometry(motion, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette?.accent || "#38bdf8");
  const bg = new THREE.Color(palette?.bg || "#0a0a12");

  const material = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.6,
    roughness: 0.35,
  });

  switch (motion) {
    case "orbit":
    case "turntable": {
      const geo = new THREE.IcosahedronGeometry(1.4, 1);
      const mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
      break;
    }
    case "fly-through": {
      for (let i = 0; i < 6; i++) {
        const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const mesh = new THREE.Mesh(geo, material.clone());
        mesh.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, -i * 4);
        group.add(mesh);
      }
      break;
    }
    case "morph":
    case "reveal": {
      const count = 24;
      for (let i = 0; i < count; i++) {
        const geo = new THREE.TetrahedronGeometry(0.35);
        const mesh = new THREE.Mesh(geo, material.clone());
        const angle = (i / count) * Math.PI * 2;
        mesh.userData.restPos = new THREE.Vector3(Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0);
        mesh.userData.explodedPos = new THREE.Vector3(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, (Math.random() - 0.5) * 2);
        mesh.position.copy(mesh.userData.restPos);
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
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.25,
        });
        const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
        shadowPlane.position.set(0, -1.8, -0.5);
        shadowPlane.rotation.x = -Math.PI / 2.2;
        group.add(shadowPlane);
        break;
      }
      case "abstract":
      case "abstract-drift":
      default: {
        const particleCount = 300;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 6;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const pMaterial = new THREE.PointsMaterial({ color: accent, size: 0.04, transparent: true, opacity: 0.85 });
        group.add(new THREE.Points(geo, pMaterial));
        break;
        }
    }
  return { group, bg };
}

function initWorld(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`3d-scene-effect: no <canvas> found in ${cfg.section}, skipping`); return null; }
    
    const reduceMotion = window.Choreography.prefersReducedMotion();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  const { group, bg } = buildGeometry(cfg.motion, cfg.palette);
  scene.background = bg;
  scene.add(group);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(cfg.palette?.accent || "#38bdf8", 0.8);
  rim.position.set(-4, 2, -3);
  const fill = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function applyProgress(p) {
    switch (cfg.motion) {
      case "orbit":
      case "turntable": {
        const angle = p * Math.PI * 2;
        camera.position.x = Math.sin(angle) * 5;
        camera.position.z = Math.cos(angle) * 5;
        camera.lookAt(0, 0, 0);
        break;
      }
      case "fly-through": {
        camera.position.z = 6 - p * 24;
        camera.lookAt(0, 0, camera.position.z - 4);
        break;
      }
      case "morph":
      case "reveal": {
        group.children.forEach((mesh) => {
          if (!mesh.userData.restPos) return;
          mesh.position.lerpVectors(mesh.userData.restPos, mesh.userData.explodedPos, p);
          mesh.rotation.x = p * Math.PI * 2;
          mesh.rotation.y = p * Math.PI * 1.3;
        });
        camera.position.set(0, 0, 6 - p * 1.5);
        camera.lookAt(0, 0, 0);
        break;
      }
      case "image-plane": {
        const swing = Math.sin(p * Math.PI) * 1.8;
        camera.position.x = swing;
        camera.position.y = Math.sin(p * Math.PI * 0.5) * 0.6;
        camera.position.z = 5 - p * 1.5;
        camera.lookAt(0, 0, 0);
        break;
      }
      default: {
        group.rotation.y = p * Math.PI * 2;
        group.rotation.x = p * Math.PI * 0.5;
        camera.position.set(0, 0, 6);
        camera.lookAt(0, 0, 0);
      }
    }
  }

  // Static pose for reduced motion — no per-frame updates after this.
  if (reduceMotion) {
    applyProgress(0.15);
    renderer.render(scene, camera);
    return { update: () => {}, resize };
  }

  let raf = 0;
  function render() {
    renderer.render(scene, camera);
  }

  function update() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const p = window.Choreography.progress(rect, window.innerHeight);
    applyProgress(p);
    render();
  }

  render(); // paint an initial frame immediately, don't wait for first scroll
  return { update, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  // Hard dependency: choreography.js must be loaded before this file (see index.html).
  // Without it every Choreography.* call below throws — fail loudly instead.
  if (!window.Choreography) {
    console.error("3d-scene-effect: choreography.js not loaded — add <script src=\"choreography.js\"> before 3d-scene-effect.js in index.html");
    return;
  }
  if (typeof THREE === "undefined") {
    console.error("3d-scene-effect: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const worlds = (window.WORLD_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initWorld)
    .filter(Boolean);

  window.__worlds = worlds; // debug handle: __worlds.forEach(w => w.update())

  // If video-scroll-effect.js's Lenis instance already exists on the page, hook into it
  // instead of creating a second one (both engines can share one Lenis driver).
  function hookIntoRaf() {
    if (window.__lenis) {
      const prevOn = window.__lenis.on.bind(window.__lenis);
      window.__lenis.on("scroll", () => worlds.forEach((w) => w.update()));
      worlds.forEach((w) => w.update());
    } else {
      // No Lenis found — drive updates from our own rAF loop against native scroll.
      function raf(t) {
        worlds.forEach((w) => w.update());
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }
  hookIntoRaf();
});