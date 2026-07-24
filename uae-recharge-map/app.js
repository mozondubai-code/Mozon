/* =============================================================================
   MOZON GIS — UAE Recharge Map  ·  APP LOGIC
   Depends on data.js (AREAS, RECHARGE_POINTS, PLACES, SERVICES, *_META)
   ========================================================================== */

/* ---------- Map setup ---------- */
const map = L.map("map", { zoomControl: true, attributionControl: true })
  .setView([25.2946, 55.3646], 12); // UAE / Al Nahda default

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

const rechargeLayer = L.layerGroup().addTo(map);
const placeLayer = L.layerGroup().addTo(map);
let userMarker = null;

/* ---------- State ---------- */
const state = {
  activeArea: null,          // area id, or null = all UAE
  activeServices: new Set(), // service filters
  origin: null,              // [lat,lng] for distance sorting (area center or user)
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

/* ---------- Build service filter chips ---------- */
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

/* ---------- Filtering ---------- */
function visiblePoints() {
  return RECHARGE_POINTS.filter((p) => {
    if (state.activeArea && p.area !== state.activeArea) return false;
    if (state.activeServices.size) {
      for (const s of state.activeServices) if (!p.services.includes(s)) return false;
    }
    return true;
  });
}
function visiblePlaces() {
  if (!state.activeArea) return []; // only show surroundings when an area is focused
  return PLACES.filter((pl) => pl.area === state.activeArea);
}

/* ---------- Service chips (small, for cards/popups) ---------- */
function svcChipsHtml(services) {
  return `<div class="svc">` + services.map((s) =>
    `<span class="s" style="background:${svcColor(s)}">${s}</span>`).join("") + `</div>`;
}

/* ---------- Render everything ---------- */
function render() {
  rechargeLayer.clearLayers();
  placeLayer.clearLayers();

  const pts = visiblePoints();
  const origin = state.origin;
  if (origin) pts.sort((a, b) => km(origin, a.coords) - km(origin, b.coords));

  // recharge markers
  pts.forEach((p) => {
    const m = L.marker(p.coords, { icon: pinIcon(getComputedStyle(document.documentElement).getPropertyValue("--recharge").trim() || "#22c3a6", "⚡") });
    const dist = origin ? `<span style="color:#22c3a6">${fmtDist(km(origin, p.coords))} away</span><br>` : "";
    m.bindPopup(`<div class="pop">
      <h4>${p.name}</h4>
      <p class="pb">🏢 ${p.building}</p>
      ${dist ? `<p class="pb">${dist.replace("<br>","")}</p>` : ""}
      ${svcChipsHtml(p.services)}
      <p class="pa">🕒 ${p.hours || "—"}<br>📍 ${p.around || ""}</p>
      <a class="dir" target="_blank" rel="noopener"
         href="https://www.google.com/maps/dir/?api=1&destination=${p.coords[0]},${p.coords[1]}">↗ Directions</a>
    </div>`, { maxWidth: 280 });
    m.__id = p.id;
    rechargeLayer.addLayer(m);
    p.__marker = m;
  });

  // surrounding places
  visiblePlaces().forEach((pl) => {
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
  const areaName = state.activeArea ? (AREAS.find(a=>a.id===state.activeArea)?.name) : "All UAE";
  $("#listTitle").textContent = state.activeArea ? `Machines near ${areaName}` : "Recharge machines · All UAE";
  $("#listCount").textContent = `${pts.length} found`;

  if (!pts.length) {
    list.innerHTML = `<div class="empty">No recharge machines match your filters here.<br>Try clearing service filters or search another area.</div>`;
    return;
  }

  pts.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    const dist = origin ? `<span class="dist">${fmtDist(km(origin, p.coords))}</span>` : "";
    card.innerHTML = `
      <div class="top"><h3>⚡ ${p.name}</h3>${dist}</div>
      <div class="bld">🏢 ${p.building}</div>
      ${svcChipsHtml(p.services)}
      <div class="around">🕒 ${p.hours || "—"}<br>📍 ${p.around || ""}</div>`;
    card.addEventListener("click", () => {
      document.querySelectorAll(".card").forEach(c=>c.classList.remove("open"));
      card.classList.add("open");
      map.setView(p.coords, 17, { animate: true });
      p.__marker && p.__marker.openPopup();
      if (window.innerWidth <= 820) $("#app").classList.add("map-mode");
    });
    list.appendChild(card);
  });
}

/* ---------- Focus an area ---------- */
function focusArea(area) {
  state.activeArea = area.id;
  state.origin = area.center;
  map.setView(area.center, area.zoom, { animate: true });
  render();
  $("#q").value = area.name;
  hideSuggest();
}

function showAllUAE() {
  state.activeArea = null;
  state.origin = null;
  map.setView([24.9, 55.0], 8, { animate: true });
  render();
  $("#q").value = "";
}

/* ---------- Search + suggestions ---------- */
function matchAreas(qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  return AREAS.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    if (a.name_ar && a.name_ar.includes(qRaw.trim())) return true;
    return (a.aliases || []).some((al) => al.toLowerCase().includes(q));
  });
}
function showSuggest(items) {
  const ul = $("#suggest");
  ul.innerHTML = "";
  if (!items.length) { hideSuggest(); return; }
  items.forEach((a) => {
    const li = document.createElement("li");
    const count = RECHARGE_POINTS.filter(p=>p.area===a.id).length;
    li.innerHTML = `<span>${a.name} ${a.name_ar?`· ${a.name_ar}`:""}</span><small>${a.emirate} · ${count} ⚡</small>`;
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
      state.activeArea = null;      // show all machines, sorted by distance to me
      state.origin = c;
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
// Open on Al Nahda 2 as the showcase area
focusArea(AREAS.find((a) => a.id === "al-nahda-2"));
