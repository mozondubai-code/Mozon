/* =============================================================================
   MOZON GIS — UAE Recharge Map  ·  APP LOGIC
   Depends on data.js (AREAS, AREA_GROUPS, RECHARGE_POINTS, PLACES, SERVICES,
   *_META, CATEGORY_META)
   ========================================================================== */

/* ---------- Map setup ---------- */
const map = L.map("map", { zoomControl: true, attributionControl: true })
  .setView([24.9, 55.0], 8); // whole UAE

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

const rechargeLayer = L.layerGroup().addTo(map);
const placeLayer = L.layerGroup().addTo(map);
let userMarker = null;

/* ---------- Tunables ---------- */
const RADIUS_KM = 20;      // "near" radius around a searched area
const MIN_RESULTS = 3;     // if fewer machines within radius, show nearest this many

/* ---------- State ---------- */
const state = {
  origin: null,        // [lat,lng] anchor for distance sorting / "near"
  focusName: null,     // label for the list header ("Al Barsha 1", "Your location"…)
  seededAreaId: null,  // id of a rich seeded area (to show its curated surroundings)
  activeServices: new Set(),
};

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const km = (a, b) => {
  const R = 6371, dLat = ((b[0]-a[0])*Math.PI)/180, dLng = ((b[1]-a[1])*Math.PI)/180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
};
const fmtDist = (d) => (d < 1 ? Math.round(d*1000) + " m" : d.toFixed(1) + " km");
const svcColor = (s) => (SERVICE_META[s]?.c || "#888");

function pinIcon(color, emoji, size = 30) {
  return L.divIcon({
    className: "",
    html: `<div class="pin" style="width:${size}px;height:${size}px;background:${color}"><span>${emoji}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size],
  });
}

/* ---------- Unified searchable area index ----------
   Seeded areas (rich, with curated surroundings) + the full UAE gazetteer. */
const SEARCH_AREAS = [];
AREAS.forEach((a) => SEARCH_AREAS.push({
  key: a.id, name: a.name, name_ar: a.name_ar, emirate: a.emirate,
  aliases: a.aliases || [], center: a.center, zoom: a.zoom || 15, seeded: true,
}));
AREA_GROUPS.forEach((g) => g.names.forEach((nm) => {
  if (SEARCH_AREAS.some((s) => s.name.toLowerCase() === nm.toLowerCase())) return; // seeded wins
  SEARCH_AREAS.push({
    key: "gen:" + g.emirate + ":" + nm, name: nm, emirate: g.emirate,
    aliases: [], center: g.center, zoom: 15, seeded: false,
    q: `${nm}, ${g.near}, United Arab Emirates`,
  });
}));

/* ---------- Live geocoding (online) with localStorage cache + fallback ---------- */
async function geocode(q) {
  const cacheKey = "mzgeo:" + q;
  try {
    const hit = localStorage.getItem(cacheKey);
    if (hit) return JSON.parse(hit);
  } catch (e) {}
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ae&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const j = await res.json();
    if (j && j[0]) {
      const c = [parseFloat(j[0].lat), parseFloat(j[0].lon)];
      try { localStorage.setItem(cacheKey, JSON.stringify(c)); } catch (e) {}
      return c;
    }
  } catch (e) { /* offline or blocked — fall back to the emirate centre */ }
  return null;
}

/* ---------- Service filter chips ---------- */
function buildChips() {
  const wrap = $("#svcChips");
  wrap.innerHTML = "";
  SERVICES.forEach((s) => {
    const el = document.createElement("span");
    el.className = "chip";
    el.textContent = (SERVICE_META[s]?.e || "") + " " + s;
    el.dataset.svc = s;
    el.addEventListener("click", () => {
      if (state.activeServices.has(s)) { state.activeServices.delete(s); el.classList.remove("on"); el.style.background=""; }
      else { state.activeServices.add(s); el.classList.add("on"); el.style.background = svcColor(s); }
      render();
    });
    wrap.appendChild(el);
  });
}

/* ---------- Which machines to show ---------- */
function servicePass(p) {
  if (!state.activeServices.size) return true;
  for (const s of state.activeServices) if (!p.services.includes(s)) return false;
  return true;
}
function selectedPoints() {
  const pool = RECHARGE_POINTS.filter(servicePass);
  if (!state.origin) {
    // Whole-UAE overview: verified (real) machines first.
    return pool.slice().sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
  }
  // "Near" mode: sort by distance, keep those within radius (or nearest few).
  const ranked = pool.map((p) => ({ p, d: km(state.origin, p.coords) })).sort((a, b) => a.d - b.d);
  const within = ranked.filter((x) => x.d <= RADIUS_KM);
  const chosen = within.length >= 1 ? within : ranked.slice(0, MIN_RESULTS);
  return chosen.map((x) => x.p);
}
function selectedPlaces() {
  if (state.seededAreaId) return PLACES.filter((pl) => pl.area === state.seededAreaId);
  if (state.origin) return PLACES.filter((pl) => km(state.origin, pl.coords) <= 8);
  return [];
}

/* ---------- Small service chips ---------- */
function svcChipsHtml(services) {
  return `<div class="svc">` + services.map((s) =>
    `<span class="s" style="background:${svcColor(s)}">${s}</span>`).join("") + `</div>`;
}

/* ---------- Render map + list ---------- */
function render() {
  rechargeLayer.clearLayers();
  placeLayer.clearLayers();

  const origin = state.origin;
  const pts = selectedPoints();
  const rechargeCol = getComputedStyle(document.documentElement).getPropertyValue("--recharge").trim() || "#22c3a6";

  pts.forEach((p) => {
    const color = p.verified ? "#F5B301" : rechargeCol;
    const m = L.marker(p.coords, { icon: pinIcon(color, p.verified ? "✓" : "⚡") });
    const dist = origin ? `<p class="pb" style="color:#22c3a6">${fmtDist(km(origin, p.coords))} away</p>` : "";
    m.bindPopup(`<div class="pop">
      <h4>${p.name} ${p.verified ? '<span class="vbadge">✓ Verified</span>' : ""}</h4>
      ${p.building ? `<p class="pb">🏢 ${p.building}</p>` : `<p class="pb">📍 ${p.area}</p>`}
      ${dist}
      ${svcChipsHtml(p.services)}
      <p class="pa">${p.hours ? `🕒 ${p.hours}<br>` : ""}📍 ${p.around || ""}</p>
      <a class="dir" target="_blank" rel="noopener"
         href="https://www.google.com/maps/dir/?api=1&destination=${p.coords[0]},${p.coords[1]}">↗ Directions</a>
    </div>`, { maxWidth: 280 });
    rechargeLayer.addLayer(m);
    p.__marker = m;
  });

  selectedPlaces().forEach((pl) => {
    const meta = CATEGORY_META[pl.category] || CATEGORY_META.landmark;
    const m = L.marker(pl.coords, { icon: pinIcon(getComputedStyle(document.documentElement).getPropertyValue("--place").trim() || "#2f7cf6", meta.e, 26), opacity: 0.95 });
    m.bindPopup(`<div class="pop"><h4>${pl.name}${pl.name_ar ? ` <span style="color:#93a0b8;font-size:12px">${pl.name_ar}</span>`:""}</h4>
      <p class="pb">${meta.e} ${meta.label}</p></div>`);
    placeLayer.addLayer(m);
  });

  renderList(pts, origin);
}

/* ---------- Sidebar list ---------- */
function renderList(pts, origin) {
  const list = $("#list");
  list.innerHTML = "";
  $("#listTitle").textContent = state.focusName ? `Machines near ${state.focusName}` : "Recharge machines · All UAE";
  $("#listCount").textContent = `${pts.length} found`;

  if (!pts.length) {
    list.innerHTML = `<div class="empty">No recharge machines match your filters here.<br>Try clearing service filters or search another area.</div>`;
    return;
  }

  pts.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    const dist = origin ? `<span class="dist">${fmtDist(km(origin, p.coords))}</span>` : "";
    const icon = p.verified ? "✅" : "⚡";
    const badge = p.verified ? ' <span class="vbadge">✓ Verified</span>' : "";
    const bld = p.building
      ? `<div class="bld">🏢 ${p.building}</div>`
      : `<div class="bld" style="opacity:.7">📍 ${p.area}</div>`;
    card.innerHTML = `
      <div class="top"><h3>${icon} ${p.name}${badge}</h3>${dist}</div>
      ${bld}
      ${svcChipsHtml(p.services)}
      <div class="around">${p.hours ? `🕒 ${p.hours}<br>` : ""}📍 ${p.around || ""}</div>`;
    card.addEventListener("click", () => {
      document.querySelectorAll(".card").forEach(c=>c.classList.remove("open"));
      card.classList.add("open");
      map.setView(p.coords, 16, { animate: true });
      p.__marker && p.__marker.openPopup();
      if (window.innerWidth <= 820) $("#app").classList.add("map-mode");
    });
    list.appendChild(card);
  });
}

/* ---------- Focus an area (from search) ---------- */
async function focusArea(area) {
  state.seededAreaId = area.seeded ? area.key : null;
  state.origin = area.center;
  state.focusName = area.name;
  $("#q").value = area.name;
  hideSuggest();
  map.setView(area.center, area.zoom, { animate: true });
  render();

  // Refine a gazetteer area to its exact spot (online). Fallback keeps working.
  if (!area.seeded && area.q) {
    $("#listTitle").textContent = `Locating ${area.name}…`;
    const c = await geocode(area.q);
    if (c) {
      state.origin = c;
      map.setView(c, 15, { animate: true });
    }
    render(); // restore the proper header whether geocoding succeeded or fell back
  }
}

function showAllUAE() {
  state.seededAreaId = null;
  state.origin = null;
  state.focusName = null;
  map.setView([24.9, 55.0], 8, { animate: true });
  $("#q").value = "";
  render();
}

/* ---------- Search + suggestions ---------- */
function matchAreas(qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const a of SEARCH_AREAS) {
    const n = a.name.toLowerCase();
    let score = -1;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.includes(q)) score = 2;
    else if (a.name_ar && a.name_ar.includes(qRaw.trim())) score = 2;
    else if ((a.aliases || []).some((al) => al.toLowerCase().includes(q))) score = 3;
    else if (a.emirate.toLowerCase().includes(q)) score = 4;
    if (score >= 0) { if (a.seeded) score -= 0.5; scored.push({ a, score }); }
  }
  scored.sort((x, y) => x.score - y.score || x.a.name.length - y.a.name.length);
  return scored.slice(0, 12).map((x) => x.a);
}
function showSuggest(items) {
  const ul = $("#suggest");
  ul.innerHTML = "";
  if (!items.length) { hideSuggest(); return; }
  items.forEach((a) => {
    const li = document.createElement("li");
    const tag = a.seeded ? `${a.emirate} · ${RECHARGE_POINTS.filter(p=>p.area===a.key).length} ⚡` : a.emirate;
    li.innerHTML = `<span>${a.name}${a.name_ar?` · ${a.name_ar}`:""}</span><small>${tag}</small>`;
    li.addEventListener("click", () => focusArea(a));
    ul.appendChild(li);
  });
  ul.style.display = "block";
}
const hideSuggest = () => { $("#suggest").style.display = "none"; };

$("#q").addEventListener("input", (e) => showSuggest(matchAreas(e.target.value)));
$("#q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const m = matchAreas(e.target.value);
    if (m.length) focusArea(m[0]);
  }
});
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) hideSuggest(); });

/* ---------- Buttons ---------- */
$("#btnAll").addEventListener("click", showAllUAE);
$("#btnLocate").addEventListener("click", () => {
  if (!navigator.geolocation) { alert("Location not supported on this device."); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const c = [pos.coords.latitude, pos.coords.longitude];
      state.seededAreaId = null;
      state.origin = c;
      state.focusName = "your location";
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker(c, { radius: 8, color: "#fff", weight: 2, fillColor: "#2f7cf6", fillOpacity: 1 })
        .addTo(map).bindPopup("You are here");
      map.setView(c, 13, { animate: true });
      $("#q").value = "";
      render();
    },
    () => alert("Could not get your location. Please allow location access."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

/* ---------- Mobile list toggle ---------- */
$("#mtoggle").addEventListener("click", () => {
  const app = $("#app");
  app.classList.toggle("map-mode");
  $("#mtoggle").innerHTML = app.classList.contains("map-mode") ? "☰ List" : "🗺️ Map";
});

/* ---------- Init ---------- */
buildChips();
showAllUAE();
