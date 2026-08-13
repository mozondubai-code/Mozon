/* ============================================================
   SITE.JS — shared page behaviors for this build.
   In scrub builds video-scroll-effect.js owns the Lenis driver,
   the .reveal IntersectionObserver and the reveal-line overlay
   updater. This build has no scrub sections, so those sitewide
   jobs live here instead. MUST load after choreography.js and
   BEFORE every engine script, so window.__lenis exists when the
   engines' own DOMContentLoaded handlers look for it.
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.Choreography) {
    console.error("site: choreography.js not loaded — add <script src=\"choreography.js\"> before site.js in index.html");
    return;
  }
  const reduceMotion = window.Choreography.prefersReducedMotion();

  /* ---- Lenis smooth scroll (shared driver for every engine) ---- */
  if (!reduceMotion && typeof Lenis !== "undefined") {
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    window.__lenis = lenis;
    function raf(t) {
      lenis.raf(t);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* ---- Scroll reveals + count-up stats ---- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "";
    const dur = 1500, t0 = performance.now();
    function step(t) {
      const k = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = (target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1)) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("stat-num")) animateCount(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".reveal, .stat-num").forEach((el) => io.observe(el));

  /* ---- Sitewide scroll progress bar ---- */
  const pageFill = document.querySelector(".page-progress-fill");

  /* ---- Scroll-spy nav ---- */
  // Only in-page hash links are scroll-spy targets. A nav can also carry ordinary
  // links (e.g. "../index.html") — passing one of those to querySelector throws a
  // SyntaxError and takes down everything below it in this handler.
  const navTargets = [...document.querySelectorAll(".hud-nav-link")]
    .filter((link) => (link.getAttribute("href") || "").startsWith("#"))
    .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
    .filter((t) => t.section);

  function updateChrome() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (pageFill) pageFill.style.width = `${max ? (doc.scrollTop / max) * 100 : 0}%`;

    // Active link = the last section whose top has passed the viewport midpoint.
    let active = navTargets[0];
    for (const t of navTargets) {
      if (t.section.getBoundingClientRect().top <= window.innerHeight * 0.5) active = t;
    }
    for (const t of navTargets) t.link.classList.toggle("active", t === active);
  }
  window.addEventListener("scroll", updateChrome, { passive: true });
  updateChrome();

  /* ---- Cursor glow (fine pointers only) ---- */
  const glow = document.querySelector(".cursor-glow");
  if (glow && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      glow.style.opacity = "1";
    }, { passive: true });
  }

  /* ---- Looping stage videos ----
     The markup carries `autoplay` so the loop starts without waiting on JS, but
     autoplay ignores prefers-reduced-motion — pause it here and let the poster
     frame stand in. Playback is also paused while the section is off-screen so a
     background video is not decoding for nothing. */
  const stageVideos = [...document.querySelectorAll(".stage-video")];
  if (stageVideos.length) {
    if (reduceMotion) {
      stageVideos.forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
    } else {
      const vio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.play().catch(() => {});
          else e.target.pause();
        });
      }, { threshold: 0.15 });
      stageVideos.forEach((v) => vio.observe(v));
    }
  }

  /* ---- 5D showcase: pointer parallax across the depth planes ----
     Each plane drifts a different amount, and the stage itself tilts, so the
     photography reads as several planes at different depths rather than one
     flat image. Fine pointers only — there is nothing to track on touch, and
     the CSS already holds every plane still under reduced motion. */
  const showcase = document.querySelector(".showcase");
  if (showcase && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const stage = showcase.querySelector(".showcase-stage");
    const burst = showcase.querySelector(".burst-layer");
    const turntable = showcase.querySelector(".turntable");
    showcase.addEventListener("pointermove", (event) => {
      const { x, y } = window.Choreography.normalizedPointer(event, showcase);
      if (stage) stage.style.transform = `rotateX(${(y * -8).toFixed(1)}deg) rotateY(${(x * 10).toFixed(1)}deg)`;
      if (burst) burst.style.transform = `translate3d(${(x * -16).toFixed(1)}px, ${(y * -16).toFixed(1)}px, 0)`;
      if (turntable) turntable.style.transform = `translate3d(${(x * 10).toFixed(1)}px, ${(y * 10).toFixed(1)}px, 0)`;
    });
    showcase.addEventListener("pointerleave", () => {
      for (const el of [stage, burst, turntable]) if (el) el.style.transform = "";
    });
  }

  /* ---- Ambient ember field behind the page ----
     Deliberately dim and slow: atmosphere only, never competing with content.
     Skipped entirely under reduced-motion. */
  const emberCanvas = document.getElementById("embers");
  if (emberCanvas && !reduceMotion) {
    const ctx = emberCanvas.getContext("2d");
    let W = 0, H = 0, embers = [];
    function resizeEmbers() {
      const dpr = window.Choreography.capDPR();
      W = window.innerWidth; H = window.innerHeight;
      emberCanvas.width = W * dpr;
      emberCanvas.height = H * dpr;
      emberCanvas.style.width = W + "px";
      emberCanvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.max(28, Math.floor((W * H) / 26000)));
      embers = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.3,
        v: Math.random() * 0.22 + 0.05,
        drift: (Math.random() - 0.5) * 0.16,
        a: Math.random() * 0.28 + 0.06,
        p: Math.random() * Math.PI * 2,
      }));
    }
    resizeEmbers();
    window.addEventListener("resize", resizeEmbers);

    function emberFrame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const e of embers) {
        e.y -= e.v;
        e.x += e.drift;
        if (e.y < -3) { e.y = H + 3; e.x = Math.random() * W; }
        if (e.x < -3) e.x = W + 3;
        if (e.x > W + 3) e.x = -3;
        const alpha = e.a * (0.65 + 0.35 * Math.sin(t * 0.001 + e.p));
        ctx.fillStyle = `rgba(255, 176, 64, ${alpha})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(emberFrame);
    }
    requestAnimationFrame(emberFrame);
  }

  /* ---- Overlay driver for pinned sections ----
     3d-scene-effect.js only drives the camera, so a .world section's reveal-line
     copy and progress bar are driven here from the same Choreography.progress
     value. A .cinematic section is different: video-scroll-effect.js already owns
     its reveal-lines and progress bar, so this file must only drive that section's
     kicker — otherwise both would write the same elements every frame. */
  const pinned = [...document.querySelectorAll("section.world")];
  const kickerOnly = [...document.querySelectorAll("section.cinematic")];

  if (reduceMotion) {
    pinned.forEach((section) => {
      const first = section.querySelector(".reveal-line");
      if (first) { first.style.opacity = "1"; first.style.transform = "none"; }
    });
    return;
  }

  function updateOverlays() {
    for (const section of pinned) {
      const rect = section.getBoundingClientRect();
      if (!window.Choreography.isInViewport(rect, window.innerHeight)) continue;
      const p = window.Choreography.progress(rect, window.innerHeight);
      for (const el of section.querySelectorAll(".reveal-line")) {
        const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
        const mid = (a + b) / 2, half = (b - a) / 2;
        let o = 1 - Math.abs(p - mid) / half;
        o = Math.max(0, Math.min(1, o));
        el.style.opacity = o.toFixed(3);
        // Must keep the -50%/-50% centering from .reveal-line's CSS — writing a
        // bare translateY() here (as the upstream engines do) clobbers it and
        // pushes every pinned headline off-centre to the right.
        el.style.transform = `translate(-50%, calc(-50% + ${((1 - o) * 30).toFixed(1)}px))`;
      }
      const kicker = section.querySelector(".hero-kicker");
      if (kicker) kicker.style.opacity = (1 - Math.min(p * 3, 1)).toFixed(3);
      const bar = section.querySelector(".progress-fill");
      if (bar) bar.style.width = (p * 100).toFixed(2) + "%";
    }
    for (const section of kickerOnly) {
      const kicker = section.querySelector(".hero-kicker");
      if (!kicker) continue;
      const rect = section.getBoundingClientRect();
      if (!window.Choreography.isInViewport(rect, window.innerHeight)) continue;
      const p = window.Choreography.progress(rect, window.innerHeight);
      kicker.style.opacity = (1 - Math.min(p * 3, 1)).toFixed(3);
    }
    document.querySelectorAll(".scroll-hint").forEach((h) => {
      h.style.opacity = (window.scrollY || 0) > 60 ? "0" : "1";
    });
  }

  if (window.__lenis) {
    window.__lenis.on("scroll", updateOverlays);
    updateOverlays();
  } else {
    function raf() {
      updateOverlays();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
});
