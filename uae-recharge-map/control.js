/* =============================================================================
   MOZON REMOTE CONTROL — operator dashboard for the UAE recharge fleet.

   Reads the SAME live Google Sheet as the public map (CONFIG.SHEET_CSV_URL from
   data.js, or ?sheet=… restricted to Google hosts). No backend: the operator
   "remotely controls" the fleet by editing the shared Sheet — set a machine's
   `status` to online / maintenance / offline and both this cockpit and the
   public map (index.html) reflect it on the next refresh.

   Self-contained on purpose (app.js boots a Leaflet map, which this page has
   no use for), so the small CSV/status/escape helpers are duplicated here.
   ========================================================================== */

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function normStatus(v) {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  if (["offline","off","down","closed","out","no","0"].includes(s)) return "offline";
  if (["maintenance","maint","service","servicing","repair","fixing"].includes(s)) return "maintenance";
  return "online";
}
const STATUS_META = {
  online:      { label: "Online",      emoji: "🟢" },
  maintenance: { label: "Maintenance", emoji: "🛠️" },
  offline:     { label: "Offline",     emoji: "🔴" },
};
const svcColor = (s) => (typeof SERVICE_META !== "undefined" && SERVICE_META[s]?.c) || "#8a97ad";

/* ---------- CSV → machines (mirrors app.js) ---------- */
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
  const iSt   = col(["status","state","availability"]);
  const iVer  = col(["verified","ver"]);
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => !String(c).trim())) continue;
    const lat = parseFloat(row[iLat]), lng = parseFloat(row[iLng]);
    const svc = (iSvc >= 0 ? String(row[iSvc] || "") : "").split(/[;,/|]/).map((s) => s.trim()).filter(Boolean);
    const ver = (iVer >= 0 ? String(row[iVer] || "") : "").trim().toLowerCase();
    out.push({
      name: (iName >= 0 && String(row[iName]).trim()) || "",
      building: iBld >= 0 ? String(row[iBld]).trim() : "",
      area: iArea >= 0 ? String(row[iArea]).trim() : "",
      emirate: iEm >= 0 ? String(row[iEm]).trim() : "",
      coords: (isNaN(lat) || isNaN(lng)) ? null : [lat, lng],
      services: svc,
      hours: iHrs >= 0 ? String(row[iHrs]).trim() : "",
      verified: ["yes","true","1","y","verified","✓"].includes(ver),
      status: normStatus(iSt >= 0 ? row[iSt] : ""),
    });
  }
  return out;
}

/* Only allow ?sheet= to point at Google's publish hosts (same rule as the map). */
function safeSheetParam(raw) {
  if (!raw) return "";
  try {
    const u = new URL(raw, location.href);
    const okHost = /(^|\.)docs\.google\.com$/.test(u.hostname) ||
                   /(^|\.)googleusercontent\.com$/.test(u.hostname);
    return (u.protocol === "https:" && okHost) ? u.href : "";
  } catch (e) { return ""; }
}

/* Normalise the bundled sample points (data.js) into the same shape. */
function fromSample() {
  if (typeof RECHARGE_POINTS === "undefined") return [];
  return RECHARGE_POINTS.map((p) => ({
    name: p.name || "", building: p.building || "", area: p.area || "",
    emirate: p.emirate || "", coords: p.coords || null,
    services: Array.isArray(p.services) ? p.services : [],
    hours: p.hours || "", verified: !!p.verified, status: normStatus(p.status),
  }));
}

/* ---------- Data-quality ---------- */
function issuesFor(m) {
  const list = [];
  if (!m.coords) list.push("no coordinates");         // won't appear on the map
  if (!m.name) list.push("no name");
  if (!m.services.length) list.push("no services");
  if (!m.area && !m.emirate) list.push("no location"); // neither area nor emirate
  return list;
}
const hasIssues = (m) => issuesFor(m).length > 0;

/* ---------- State ---------- */
let MACHINES = [];
let usingSample = false;
const view = { q: "", status: "all", sortK: "status", sortAsc: true };
const MAP_BASE = "index.html";
const SHEET_QS = safeSheetParam(new URLSearchParams(location.search).get("sheet"));

/* ---------- Load ---------- */
async function load() {
  const url = SHEET_QS || (typeof CONFIG !== "undefined" ? CONFIG.SHEET_CSV_URL : "");
  const src = $("#src");
  if (url) {
    src.innerHTML = "Source: <span class='live'>live Google Sheet</span> · loading…";
    try {
      const res = await fetch(url, { cache: "no-store" });
      const machines = rowsToMachines(parseCSV(await res.text()));
      if (machines.length) {
        MACHINES = machines; usingSample = false;
        src.innerHTML = `Source: <span class='live'>● live Google Sheet</span> · ${machines.length} machines · updated ${new Date().toLocaleTimeString()}`;
        return render();
      }
      src.innerHTML = "Sheet returned no rows — showing bundled sample data.";
    } catch (e) {
      src.innerHTML = "⚠️ Could not reach the Sheet — showing bundled sample data.";
    }
  }
  MACHINES = fromSample(); usingSample = true;
  if (!url) src.innerHTML = "Source: <span class='sample'>bundled sample data</span> · set <code>CONFIG.SHEET_CSV_URL</code> in data.js (or open with <code>?sheet=…</code>) to go live.";
  render();
}

/* ---------- Aggregations ---------- */
function counts() {
  const c = { total: MACHINES.length, online: 0, maintenance: 0, offline: 0, verified: 0, issues: 0 };
  MACHINES.forEach((m) => { c[m.status]++; if (m.verified) c.verified++; if (hasIssues(m)) c.issues++; });
  return c;
}
function groupBy(key) {
  const map = new Map();
  MACHINES.forEach((m) => {
    const k = (m[key] || "—").trim() || "—";
    const g = map.get(k) || { total: 0, online: 0 };
    g.total++; if (m.status === "online") g.online++;
    map.set(k, g);
  });
  return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
}
function serviceCoverage() {
  const map = new Map();
  MACHINES.forEach((m) => m.services.forEach((s) => map.set(s, (map.get(s) || 0) + 1)));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/* ---------- Render ---------- */
function render() {
  const c = counts();
  const tiles = [
    ["total", "Total machines", c.total],
    ["online", "Online", c.online],
    ["maint", "Maintenance", c.maintenance],
    ["offline", "Offline", c.offline],
    ["gold", "Verified", c.verified],
    ["issues", "Data issues", c.issues],
  ];
  $("#kpis").innerHTML = tiles.map(([cls, label, n]) =>
    `<div class="kpi ${cls}"><div class="bar"></div><div class="n">${n}</div><div class="l">${label}</div></div>`
  ).join("");

  const live = c.online, denom = c.total || 1;
  const pct = Math.round((live / denom) * 100);
  $("#uptime").innerHTML = `<b>${pct}%</b> of the fleet is online (${live}/${c.total})` +
    (c.offline ? ` · <b style="color:var(--offline)">${c.offline}</b> down` : "") +
    (c.maintenance ? ` · <b style="color:var(--maint)">${c.maintenance}</b> in maintenance` : "");

  // By emirate
  const em = groupBy("emirate");
  const maxEm = Math.max(1, ...em.map(([, g]) => g.total));
  $("#byEmirate").innerHTML = em.length ? em.map(([name, g]) => {
    const w = Math.round((g.total / maxEm) * 100);
    const onPct = Math.round((g.online / g.total) * 100);
    return `<div class="rowline"><span class="name">${esc(name)}</span>
      <span class="meter" title="${onPct}% online"><i style="width:${onPct}%"></i></span>
      <span class="count">${g.online}/${g.total}</span></div>`;
  }).join("") : `<div class="empty">No data.</div>`;

  // Service coverage
  const sv = serviceCoverage();
  const maxSv = Math.max(1, ...sv.map(([, n]) => n));
  $("#byService").innerHTML = sv.length ? sv.map(([name, n]) => {
    const w = Math.round((n / maxSv) * 100);
    return `<div class="rowline"><span class="swatch" style="background:${svcColor(name)}"></span>
      <span class="name">${esc(name)}</span>
      <span class="meter"><i style="width:${w}%;background:${svcColor(name)}"></i></span>
      <span class="count">${n}</span></div>`;
  }).join("") : `<div class="empty">No services listed.</div>`;

  renderTable();
}

function filtered() {
  const q = view.q.trim().toLowerCase();
  let list = MACHINES.filter((m) => {
    if (view.status === "issues") { if (!hasIssues(m)) return false; }
    else if (view.status !== "all" && m.status !== view.status) return false;
    if (!q) return true;
    return [m.name, m.building, m.area, m.emirate, m.services.join(" ")]
      .join(" ").toLowerCase().includes(q);
  });
  const dir = view.sortAsc ? 1 : -1;
  const rank = { offline: 0, maintenance: 1, online: 2 };
  list.sort((a, b) => {
    let av, bv;
    if (view.sortK === "status") { av = rank[a.status]; bv = rank[b.status]; }
    else if (view.sortK === "services") { av = a.services.length; bv = b.services.length; }
    else { av = String(a[view.sortK] || "").toLowerCase(); bv = String(b[view.sortK] || "").toLowerCase(); }
    if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
  });
  return list;
}

function renderTable() {
  const list = filtered();
  const tbody = $("#rows");
  $("#empty").style.display = list.length ? "none" : "block";
  tbody.innerHTML = list.map((m) => {
    const meta = STATUS_META[m.status];
    const iss = issuesFor(m);
    const svc = m.services.slice(0, 6).map((s) => `<span class="badge">${esc(s)}</span>`).join("") +
      (m.services.length > 6 ? `<span class="badge">+${m.services.length - 6}</span>` : "");
    const mapUrl = m.coords ? `${MAP_BASE}?at=${m.coords[0]},${m.coords[1]}&z=18` : "";
    return `<tr>
      <td>${esc(m.name || "Recharge machine")}${m.verified ? ' <span class="vtag">✓</span>' : ""}
        ${m.building ? `<div style="color:var(--muted);font-size:12px">🏢 ${esc(m.building)}</div>` : ""}
        ${iss.length ? `<div class="warn">⚠️ ${esc(iss.join(", "))}</div>` : ""}</td>
      <td>${esc(m.area || "—")}</td>
      <td>${esc(m.emirate || "—")}</td>
      <td>${svc || '<span class="warn">none</span>'}</td>
      <td><span class="st ${m.status}">${meta.emoji} ${meta.label}</span></td>
      <td>${mapUrl ? `<a class="go" href="${mapUrl}" target="_blank" rel="noopener">Open ↗</a>` : '<span class="warn">no pin</span>'}</td>
    </tr>`;
  }).join("");

  document.querySelectorAll("thead th[data-k]").forEach((th) => {
    th.classList.toggle("sorted", th.dataset.k === view.sortK);
    th.classList.toggle("asc", th.dataset.k === view.sortK && view.sortAsc);
  });
}

/* ---------- Events ---------- */
$("#q").addEventListener("input", (e) => { view.q = e.target.value; renderTable(); });
$("#refresh").addEventListener("click", load);
// Carry a ?sheet= override through to the public-map link so both stay in sync.
if (SHEET_QS) $("#mapLink").href = `${MAP_BASE}?sheet=${encodeURIComponent(SHEET_QS)}`;

document.querySelectorAll("#statusFilter button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#statusFilter button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on"); view.status = b.dataset.s; renderTable();
  });
});
document.querySelectorAll("thead th[data-k]").forEach((th) => {
  th.addEventListener("click", () => {
    if (view.sortK === th.dataset.k) view.sortAsc = !view.sortAsc;
    else { view.sortK = th.dataset.k; view.sortAsc = true; }
    renderTable();
  });
});

/* ---------- Go ---------- */
load();
