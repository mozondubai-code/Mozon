/* =============================================================
   MOZON BROAST — interactions
   ============================================================= */
(function () {
  "use strict";

  // Central config — change the order destination in ONE place.
  var OFFERS_URL = "https://offersmozon.ae";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Order action: pop the offers subdomain ---- */
  function goOrder(e) {
    if (e) e.preventDefault();
    // New tab so the main SEO page stays open (better dwell time = better ranking).
    var w = window.open(OFFERS_URL, "_blank", "noopener");
    if (!w) window.location.href = OFFERS_URL; // popup blocked → same-tab fallback
  }
  document.querySelectorAll("[data-order]").forEach(function (el) {
    el.addEventListener("click", goOrder);
  });

  /* ---- Corporate: placeholder until the real flow is wired ---- */
  document.querySelectorAll("[data-corp]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var form = document.getElementById("corp-form");
      if (form) return; // real form present, let it handle
    });
  });
  var corpForm = document.getElementById("corp-form");
  if (corpForm) {
    corpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("corp-status");
      // Build a WhatsApp/mailto intent so enquiries reach the shop even before a backend exists.
      var name = (corpForm.name && corpForm.name.value) || "";
      var company = (corpForm.company && corpForm.company.value) || "";
      var people = (corpForm.people && corpForm.people.value) || "";
      var details = (corpForm.details && corpForm.details.value) || "";
      var msg =
        "Corporate / bulk order enquiry%0A" +
        "Name: " + encodeURIComponent(name) + "%0A" +
        "Company: " + encodeURIComponent(company) + "%0A" +
        "Headcount: " + encodeURIComponent(people) + "%0A" +
        "Details: " + encodeURIComponent(details);
      var wa = "https://wa.me/971524877701?text=" + msg;
      if (status) { status.textContent = "Opening WhatsApp to send your enquiry…"; status.style.color = "var(--gold-deep)"; }
      window.open(wa, "_blank", "noopener");
    });
  }

  /* ---- Header shadow on scroll ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Theme toggle (persisted) ---- */
  var toggle = document.querySelector(".theme-toggle");
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  try {
    var saved = localStorage.getItem("mozon-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("mozon-theme", next); } catch (e) {}
    });
  }

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Crave meter fills when seen ---- */
  var meter = document.querySelector(".crave-meter .bar i");
  if (meter) {
    if ("IntersectionObserver" in window) {
      var mio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { meter.style.width = "92%"; mio.disconnect(); }
        });
      }, { threshold: 0.5 });
      mio.observe(meter);
    } else { meter.style.width = "92%"; }
  }

  if (reduceMotion) return; // skip pointer-driven flourishes

  /* ---- Magnetic buttons ---- */
  document.querySelectorAll(".magnetic").forEach(function (el) {
    el.addEventListener("pointermove", function (ev) {
      var r = el.getBoundingClientRect();
      var mx = (ev.clientX - (r.left + r.width / 2)) * 0.25;
      var my = (ev.clientY - (r.top + r.height / 2)) * 0.35;
      el.style.setProperty("--mx", mx.toFixed(1));
      el.style.setProperty("--my", my.toFixed(1));
    });
    el.addEventListener("pointerleave", function () {
      el.style.setProperty("--mx", 0); el.style.setProperty("--my", 0);
    });
  });

  /* ---- Parallax on hero visual ---- */
  var visual = document.querySelector(".hero-visual");
  var hero = document.querySelector(".hero");
  if (visual && hero) {
    hero.addEventListener("pointermove", function (ev) {
      var r = hero.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width - 0.5;
      var py = (ev.clientY - r.top) / r.height - 0.5;
      visual.style.transform = "translate3d(" + (px * 22).toFixed(1) + "px," + (py * 22).toFixed(1) + "px,0)";
    });
    hero.addEventListener("pointerleave", function () { visual.style.transform = "translate3d(0,0,0)"; });
  }

  /* ---- Dish spotlight follows cursor ---- */
  document.querySelectorAll(".dish").forEach(function (card) {
    card.addEventListener("pointermove", function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--gx", (ev.clientX - r.left) + "px");
      card.style.setProperty("--gy", (ev.clientY - r.top) + "px");
    });
  });
})();
