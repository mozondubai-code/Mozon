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

// Clustered layer so thousands of machines stay fast (pins group, expand on zoom).
const rechargeLayer = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 48,
  spiderfyOnMaxZoom: true,
  chunkedLoading: true,
});
map.addLayer(rechargeLayer);
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

/* Escape any dynamic text before it goes into innerHTML (machine data may come
   from an external CSV/Google Sheet — treat it as untrusted). */
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Open-in / copy links for any coordinate (kiosk popups and the drop-pin tool). */
function actionsHtml(lat, lng) {
  const maps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const pano = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  const dir  = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const twogis = `https://2gis.ae/?m=${lng}%2C${lat}%2F17`; // 2GIS map centres on lng,lat
  return `<div class="acts">
    <a class="act" target="_blank" rel="noopener" href="${maps}">🗺️ Maps</a>
    <a class="act" target="_blank" rel="noopener" href="${pano}">👁️ Street View</a>
    <a class="act" target="_blank" rel="noopener" href="${twogis}">🧭 2GIS</a>
    <a class="act" target="_blank" rel="noopener" href="${dir}">➜ Directions</a>
    <button class="act copybtn" type="button" data-ll="${lat}, ${lng}">📍 Copy pin</button>
  </div>`;
}

/* ---------- Machine status (remote control) ----------
   A machine's live status can be set remotely from the Google Sheet's
   "status" column (online / maintenance / offline). It drives the pin colour,
   a popup badge, and the operator dashboard in control.html. Anything blank or
   unrecognised counts as online, so existing sheets keep working unchanged. */
function normStatus(v) {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  if (["offline","off","down","closed","out","no","0"].includes(s)) return "offline";
  if (["maintenance","maint","service","servicing","repair","fixing"].includes(s)) return "maintenance";
  return "online";
}
const STATUS_META = {
  online:      { label: "Online",      color: "#22c3a6", emoji: "⚡", badge: "🟢 Online" },
  maintenance: { label: "Maintenance", color: "#f2a900", emoji: "🛠️", badge: "🛠️ Maintenance" },
  offline:     { label: "Offline",     color: "#e04f5f", emoji: "✕", badge: "🔴 Offline" },
};
const statusMeta = (p) => STATUS_META[normStatus(p && p.status)] || STATUS_META.online;

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
    `<span class="s" style="background:${svcColor(s)}">${esc(s)}</span>`).join("") + `</div>`;
}

/* ---------- Render map + list ---------- */
function render() {
  rechargeLayer.clearLayers();
  placeLayer.clearLayers();

  const origin = state.origin;
  const pts = selectedPoints();
  const rechargeCol = getComputedStyle(document.documentElement).getPropertyValue("--recharge").trim() || "#22c3a6";

  const markers = [];
  pts.forEach((p) => {
    const st = statusMeta(p);
    const online = normStatus(p.status) === "online";
    // Online machines keep the gold ✓ for verified; down/maintenance pins take
    // the status colour + emoji so the operator can spot them at a glance.
    const color = !online ? st.color : (p.verified ? "#F5B301" : rechargeCol);
    const emoji = !online ? st.emoji : (p.verified ? "✓" : "⚡");
    const m = L.marker(p.coords, { icon: pinIcon(color, emoji), opacity: online ? 1 : 0.9 });
    const dist = origin ? `<p class="pb" style="color:#22c3a6">${fmtDist(km(origin, p.coords))} away</p>` : "";
    m.bindPopup(`<div class="pop">
      <h4>${esc(p.name)} ${p.verified ? '<span class="vbadge">✓ Verified</span>' : ""}</h4>
      ${!online ? `<p class="pb" style="color:${st.color};font-weight:600">${st.badge}</p>` : ""}
      ${p.building ? `<p class="pb">🏢 ${esc(p.building)}</p>` : `<p class="pb">📍 ${esc(p.area || p.emirate || "")}</p>`}
      ${p.placement ? `<p class="pb">🏠 ${esc(p.placement)}</p>` : ""}
      ${dist}
      ${svcChipsHtml(p.services)}
      <p class="pa">${p.hours ? `🕒 ${esc(p.hours)}<br>` : ""}📍 ${esc(p.around || "")}</p>
      ${actionsHtml(p.coords[0], p.coords[1])}
    </div>`, { maxWidth: 300 });
    markers.push(m);
    p.__marker = m;
  });
  rechargeLayer.addLayers(markers); // bulk add — fast for thousands

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

  const limit = (typeof CONFIG !== "undefined" && CONFIG.LIST_LIMIT) || 60;
  const shown = pts.slice(0, limit);
  $("#listCount").textContent = pts.length > shown.length ? `${shown.length} of ${pts.length}` : `${pts.length} found`;
  const mc = $("#mcount"); if (mc) mc.textContent = `${RECHARGE_POINTS.length.toLocaleString()} machines loaded`;

  if (!pts.length) {
    list.innerHTML = `<div class="empty">No recharge machines match your filters here.<br>Try clearing service filters or search another area.</div>`;
    return;
  }

  shown.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    const dist = origin ? `<span class="dist">${fmtDist(km(origin, p.coords))}</span>` : "";
    const icon = p.verified ? "✅" : "⚡";
    const badge = p.verified ? ' <span class="vbadge">✓ Verified</span>' : "";
    const bld = p.building
      ? `<div class="bld">🏢 ${esc(p.building)}</div>`
      : `<div class="bld" style="opacity:.7">📍 ${esc(p.area)}</div>`;
    const plc = p.placement ? `<div class="bld" style="opacity:.75">🏠 ${esc(p.placement)}</div>` : "";
    card.innerHTML = `
      <div class="top"><h3>${icon} ${esc(p.name)}${badge}</h3>${dist}</div>
      ${bld}${plc}
      ${svcChipsHtml(p.services)}
      <div class="around">${p.hours ? `🕒 ${esc(p.hours)}<br>` : ""}📍 ${esc(p.around || "")}</div>`;
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
/* Deep search across every kiosk (name / building / area). */
function matchKiosks(qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  for (const p of RECHARGE_POINTS) {
    const hay = (p.name + " " + (p.building || "") + " " + (p.area || "")).toLowerCase();
    if (hay.includes(q)) { out.push(p); if (out.length >= 8) break; }
  }
  return out;
}

function updateSuggest(qRaw) {
  const areas = matchAreas(qRaw).slice(0, 8).map((a) => ({ kind: "area", a }));
  const kiosks = matchKiosks(qRaw).map((p) => ({ kind: "kiosk", p }));
  const items = [...areas, ...kiosks];
  const ul = $("#suggest");
  ul.innerHTML = "";
  if (!items.length) { hideSuggest(); return; }
  items.forEach((it) => {
    const li = document.createElement("li");
    if (it.kind === "area") {
      const a = it.a;
      const tag = a.seeded ? `${a.emirate} · ${RECHARGE_POINTS.filter((p)=>p.area===a.key).length} ⚡` : a.emirate;
      li.innerHTML = `<span>${esc(a.name)}${a.name_ar?` · ${esc(a.name_ar)}`:""}</span><small>${esc(tag)}</small>`;
      li.addEventListener("click", () => focusArea(a));
    } else {
      const p = it.p;
      li.innerHTML = `<span>⚡ ${esc(p.name)}</span><small>${esc(p.building || p.area || "kiosk")}</small>`;
      li.addEventListener("click", () => focusKiosk(p));
    }
    ul.appendChild(li);
  });
  ul.style.display = "block";
}
const hideSuggest = () => { $("#suggest").style.display = "none"; };

/* Fly to a single kiosk and open its popup (expanding its cluster if needed). */
function focusKiosk(p) {
  state.seededAreaId = null;
  state.origin = p.coords;
  state.focusName = p.name;
  $("#q").value = p.name;
  hideSuggest();
  map.setView(p.coords, 17, { animate: true });
  render();
  setTimeout(() => {
    const m = p.__marker;
    if (!m) return;
    if (typeof rechargeLayer.zoomToShowLayer === "function") rechargeLayer.zoomToShowLayer(m, () => m.openPopup());
    else m.openPopup();
  }, 350);
}

$("#q").addEventListener("input", (e) => updateSuggest(e.target.value));
$("#q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const a = matchAreas(e.target.value);
    if (a.length) { focusArea(a[0]); return; }
    const k = matchKiosks(e.target.value);
    if (k.length) focusKiosk(k[0]);
  }
});
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) hideSuggest(); });

/* Copy a pin's "lat, lng" from any popup (event-delegated — popups are dynamic). */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copybtn");
  if (!btn) return;
  const ll = btn.dataset.ll || "";
  const done = () => { const t = btn.textContent; btn.textContent = "✓ Copied"; setTimeout(() => { btn.textContent = t; }, 1200); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ll).then(done).catch(done);
  else { const ta = document.createElement("textarea"); ta.value = ll; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (err) {} ta.remove(); done(); }
});

/* ---------- Drop-pin tool: click the map to capture coordinates for a new kiosk ---------- */
let pinMarker = null, pinMode = false, pinHint = null;
function openPinPopup() {
  const { lat, lng } = pinMarker.getLatLng();
  const la = lat.toFixed(6), lo = lng.toFixed(6);
  pinMarker.bindPopup(`<div class="pop">
    <h4>📍 Dropped pin</h4>
    <p class="pb" style="font-variant-numeric:tabular-nums">${la}, ${lo}</p>
    ${actionsHtml(la, lo)}
    <p class="pa">Drag the pin to fine-tune. Tap <b>Copy pin</b>, then paste into the <b>lat</b>/<b>lng</b> columns of your Sheet.</p>
  </div>`, { maxWidth: 300 }).openPopup();
}
$("#btnPin").addEventListener("click", () => {
  pinMode = !pinMode;
  $("#btnPin").classList.toggle("on", pinMode);
  map.getContainer().style.cursor = pinMode ? "crosshair" : "";
  if (pinMode) {
    pinHint = document.createElement("div");
    pinHint.className = "pinhint";
    pinHint.textContent = "Tap the map to drop a pin and get its coordinates";
    map.getContainer().appendChild(pinHint);
  } else if (pinHint) { pinHint.remove(); pinHint = null; }
});
map.on("click", (e) => {
  if (!pinMode) return;
  if (pinHint) { pinHint.remove(); pinHint = null; }
  if (pinMarker) pinMarker.setLatLng(e.latlng);
  else {
    pinMarker = L.marker(e.latlng, { draggable: true, icon: pinIcon("#2f7cf6", "📍", 32) }).addTo(map);
    pinMarker.on("dragend", openPinPopup);
  }
  openPinPopup();
});

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

/* ---------- Live Google Sheet loading (thousands of machines) ---------- */
function parseCSV(text) {
  const rows = []; let field = "", row = [], inQ = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function rowsToMachines(rows) {
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names) => { for (const n of names) { const k = head.indexOf(n); if (k >= 0) return k; } return -1; };
  const iName = col(["name","machine","shop","kiosk"]);
  const iBld  = col(["building","bldg","tower"]);
  const iArea = col(["area","neighbourhood","neighborhood","district","location"]);
  const iEm   = col(["emirate","city"]);
  const iLat  = col(["lat","latitude"]);
  const iLng  = col(["lng","lon","long","longitude"]);
  const iSvc  = col(["services","service","recharge"]);
  const iHrs  = col(["hours","timing","time","open"]);
  const iAr   = col(["around","surroundings","notes","landmark","nearby"]);
  const iPlc  = col(["placement","type","location","building type","placement type"]);
  const iVer  = col(["verified","ver"]);
  const iSt   = col(["status","state","availability"]);
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => !String(c).trim())) continue;
    const lat = parseFloat(row[iLat]), lng = parseFloat(row[iLng]);
    if (isNaN(lat) || isNaN(lng)) continue;
    const svc = (iSvc >= 0 ? String(row[iSvc] || "") : "").split(/[;,/|]/).map((s) => s.trim()).filter(Boolean);
    const ver = (iVer >= 0 ? String(row[iVer] || "") : "").trim().toLowerCase();
    out.push({
      id: "sheet-" + r,
      name: (iName >= 0 && String(row[iName]).trim()) || "Recharge machine",
      building: iBld >= 0 ? String(row[iBld]).trim() : "",
      area: iArea >= 0 ? String(row[iArea]).trim() : (iEm >= 0 ? String(row[iEm]).trim() : ""),
      emirate: iEm >= 0 ? String(row[iEm]).trim() : "",
      coords: [lat, lng],
      services: svc.length ? svc : ["Recharge"],
      hours: iHrs >= 0 ? String(row[iHrs]).trim() : "",
      around: iAr >= 0 ? String(row[iAr]).trim() : "",
      placement: iPlc >= 0 ? String(row[iPlc]).trim() : "",
      verified: ["yes","true","1","y","verified","✓"].includes(ver),
      status: normStatus(iSt >= 0 ? row[iSt] : ""),
    });
  }
  return out;
}

// Only allow the ?sheet= override to point at Google's publish hosts, so a
// crafted link can't load an attacker's CSV into the page. (CONFIG.SHEET_CSV_URL,
// set by the site owner in code, is trusted and used as-is.)
function safeSheetParam(raw) {
  if (!raw) return "";
  try {
    const u = new URL(raw, location.href);
    const okHost = /(^|\.)docs\.google\.com$/.test(u.hostname) ||
                   /(^|\.)googleusercontent\.com$/.test(u.hostname);
    return (u.protocol === "https:" && okHost) ? u.href : "";
  } catch (e) { return ""; }
}

async function loadMachines() {
  // Sheet URL can come from ?sheet=… (restricted to Google hosts) else CONFIG.SHEET_CSV_URL.
  const param = safeSheetParam(new URLSearchParams(location.search).get("sheet"));
  const url = param || (typeof CONFIG !== "undefined" ? CONFIG.SHEET_CSV_URL : "");
  if (!url) return; // use bundled sample data
  try {
    $("#listTitle").textContent = "Loading machines from your Sheet…";
    const res = await fetch(url);
    const machines = rowsToMachines(parseCSV(await res.text()));
    if (machines.length) {
      RECHARGE_POINTS.length = 0;
      machines.forEach((m) => RECHARGE_POINTS.push(m));
      // Make any new service names filterable.
      machines.forEach((m) => m.services.forEach((s) => { if (!SERVICES.includes(s)) SERVICES.push(s); }));
      buildChips();
    }
  } catch (e) {
    console.warn("Could not load the Google Sheet — showing bundled data instead.", e);
  }
  render();
  focusFromUrl(); // e.g. control.html deep-links ?at=lat,lng to a machine
}

/* Deep-link support: ?at=lat,lng[&z=zoom] pans the map to a spot and, if a
   machine sits there, opens its popup. Used by the Remote Control dashboard so
   an operator can jump from a fleet row straight to that pin. */
function focusFromUrl() {
  const at = new URLSearchParams(location.search).get("at");
  if (!at) return;
  const parts = at.split(",").map((n) => parseFloat(n.trim()));
  if (parts.length < 2 || parts.some(isNaN)) return;
  const [lat, lng] = parts;
  const z = parseInt(new URLSearchParams(location.search).get("z"), 10);
  map.setView([lat, lng], isNaN(z) ? 17 : Math.min(Math.max(z, 3), 19));
  // Open the nearest machine's popup if one is essentially at this coordinate.
  let best = null, bestD = Infinity;
  RECHARGE_POINTS.forEach((p) => {
    const d = km([lat, lng], p.coords);
    if (d < bestD) { bestD = d; best = p; }
  });
  if (best && bestD < 0.05 && best.__marker) best.__marker.openPopup();
}

/* ---------- Init ---------- */
buildChips();
showAllUAE();
loadMachines();
