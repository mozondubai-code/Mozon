/* ============================================================
   PHYSICS-PLAY — Three.js rendering + cannon-es rigid-body
   simulation. Objects rest on a floor plane and respond to
   gravity/collisions; drag with the pointer to throw them.
   cannon-es is ESM-only (see index.html's module script) — this
   file must not assume window.CANNON exists at DOMContentLoaded.
   ============================================================ */

function startPhysicsSection(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`physics-play: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const CANNON = window.CANNON;
  const reduceMotion = window.Choreography.prefersReducedMotion();
  const accent = new THREE.Color(cfg.palette?.accent || "#ff3b30");
  const bg = new THREE.Color(cfg.palette?.bg || "#0a0a12");
  const objectCount = cfg.objectCount || 6;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  scene.background = bg;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 3, 9);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(3, 6, 5);
  const fill = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(key, fill);

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x111420, roughness: 0.9 })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -2;
  scene.add(floorMesh);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  floorBody.position.set(0, -2, 0);
  world.addBody(floorBody);

  // Bound the play area so a hard throw doesn't lose an object off-scene forever.
  const wallDefs = [
    { pos: [7, 1, 0], normal: [-1, 0, 0] },
    { pos: [-7, 1, 0], normal: [1, 0, 0] },
    { pos: [0, 1, 7], normal: [0, 0, -1] },
    { pos: [0, 1, -7], normal: [0, 0, 1] },
  ];
  wallDefs.forEach(({ pos, normal }) => {
    const wallBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    wallBody.position.set(pos[0], pos[1], pos[2]);
    const target = new THREE.Vector3(normal[0], normal[1], normal[2]);
    const up = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, target);
    wallBody.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    world.addBody(wallBody);
  });

  const objects = [];
  for (let i = 0; i < objectCount; i++) {
    const isSphere = i % 2 === 0;
    const size = 0.5 + Math.random() * 0.25;

    const mesh = new THREE.Mesh(
      isSphere ? new THREE.SphereGeometry(size, 24, 24) : new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({ color: accent, metalness: 0.5, roughness: 0.4 })
    );
    scene.add(mesh);

    const restX = (Math.random() - 0.5) * 4;
    const restZ = (Math.random() - 0.5) * 4;
    const restY = -2 + size;

    const body = new CANNON.Body({
      mass: 1,
      shape: isSphere ? new CANNON.Sphere(size) : new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)),
      position: reduceMotion
        ? new CANNON.Vec3(restX, restY, restZ)
        : new CANNON.Vec3(restX, 4 + Math.random() * 3, restZ),
    });
    world.addBody(body);
    objects.push({ mesh, body, held: false });
  }

  function syncMeshes() {
    for (const { mesh, body } of objects) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
  }

  function render() { renderer.render(scene, camera); }

  if (reduceMotion) {
    syncMeshes();
    render();
    return { update: () => {}, resize };
  }

  // ---- Drag-to-throw ----
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();
  let dragged = null;
  let lastDragPoint = new THREE.Vector3();
  let lastDragTime = 0;
  let velocitySample = new THREE.Vector3();

  function setPointerNDC(event) {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  canvas.addEventListener("pointerdown", (event) => {
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(objects.map((o) => o.mesh))[0];
    if (!hit) return;
    const target = objects.find((o) => o.mesh === hit.object);
    if (!target) return;
    dragged = target;
    dragged.body.velocity.setZero();
    dragged.body.angularVelocity.setZero();
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    lastDragPoint.copy(hit.point);
    lastDragTime = performance.now();
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragged) return;
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      dragged.body.position.set(dragPoint.x, dragPoint.y, dragPoint.z);
      const now = performance.now();
      const dt = Math.max(now - lastDragTime, 1) / 1000;
      velocitySample.subVectors(dragPoint, lastDragPoint).divideScalar(dt);
      lastDragPoint.copy(dragPoint);
      lastDragTime = now;
    }
  });

  function releaseDrag() {
    if (!dragged) return;
    dragged.body.velocity.set(velocitySample.x, velocitySample.y, velocitySample.z);
    dragged = null;
  }
  canvas.addEventListener("pointerup", releaseDrag);
  canvas.addEventListener("pointercancel", releaseDrag);

  let lastStep = performance.now();
  function update() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const now = performance.now();
    const delta = Math.min((now - lastStep) / 1000, 1 / 30);
    lastStep = now;
    world.step(1 / 60, delta, 3);
    syncMeshes();
    render();
  }

  render();
  return { update, resize };
}

function initPhysics(cfg) {
  if (window.CANNON) return startPhysicsSection(cfg);
  return new Promise((resolve) => {
    window.addEventListener("cannon-ready", () => resolve(startPhysicsSection(cfg)), { once: true });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Hard dependency: choreography.js must be loaded before this file (see index.html).
  // Without it every Choreography.* call below throws — fail loudly instead.
  if (!window.Choreography) {
    console.error("physics-play: choreography.js not loaded — add <script src=\"choreography.js\"> before physics-play.js in index.html");
    return;
  }
  if (typeof THREE === "undefined") {
    console.error("physics-play: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const configs = (window.PHYSICS_SECTIONS || []).filter((c) => document.querySelector(c.section));
  if (!configs.length) return;

  Promise.all(configs.map(initPhysics)).then((results) => {
    const physics = results.filter(Boolean);
    window.__physics = physics; // debug handle

    function raf() {
      physics.forEach((p) => p.update());
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  });
});
