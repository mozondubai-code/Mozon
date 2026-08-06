# Mozon GIS — UAE Recharge Map

A single-page web map that shows **recharge machines** (du, Etisalat, iTunes,
Google Play, Botim, PUBG UC, Salik, Nol, DEWA, Cash Out …) across the UAE,
together with the **building name** each machine sits in and the **surrounding**
commercial landmarks (hospitals, hotels, malls, restaurants, supermarkets,
parks).

Search an area — for example **Al Nahda 2** — and you instantly see:

- the area map,
- every recharge machine nearby (sorted by distance, with a details card),
- the surrounding buildings and commercial places for context.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The public map page (layout + styling). |
| `app.js` | The map logic (search, filters, distance, markers). |
| `data.js` | **The only file you edit** to add real machines, areas & places. |
| `control.html` + `control.js` | **Mozon Remote Control** — the operator dashboard (see below). |
| `netlify.toml` | Netlify hosting config. |

The map **background** (streets/satellite) uses OpenStreetMap and needs
internet. Your **recharge/building data lives inside `data.js`**, so the list,
search and details keep working even if a data server is down.

## Load thousands of machines from a live Google Sheet (recommended)

For a large, growing list, keep the machines in a Google Sheet — the map reads
it live, so you (or your team) add rows and the map updates. No code editing.

1. Make a Google Sheet with these column headers in **row 1**:

   `name` · `building` · `area` · `emirate` · `lat` · `lng` · `services` · `hours` · `around` · `verified` · `status`

   - `lat` / `lng` — decimal numbers (Google Maps right-click → copy).
   - `services` — separated by `;` or `,` (e.g. `du; Etisalat; iTunes; Botim`).
   - `verified` — `yes` shows the gold ✓ marker (optional).
   - `status` — **remote control**: `online` / `maintenance` / `offline`
     (optional, blank = online). See *Remote Control* below.
   - other columns optional. A ready template is in `machines-template.csv`.

2. **File → Share → Publish to web →** pick the sheet → **Comma-separated
   values (.csv)** → **Publish** → copy the link.

3. Use the link either way:
   - paste it into `SHEET_CSV_URL` at the top of **`data.js`**, **or**
   - add it to the page URL: `…/index.html?sheet=PASTE_LINK_HERE`.

The map clusters the pins, so thousands stay fast; the sidebar lists the
nearest ones to whatever you search.

## Or add machines by hand (no coding, no build step)

1. Open `data.js`.
2. Copy one `{ … }` block inside `RECHARGE_POINTS`.
3. Change `name`, `building`, `area`, `services`, `hours`, `around`.
4. Set `coords: [latitude, longitude]` — in Google Maps, right-click the exact
   spot; the first line of the menu is `lat, lng`. Copy it in.
5. Save and refresh. Done.

To add a **new searchable area**, copy a block inside `AREAS` (unique `id`,
display `name`, `center` coords, `zoom`). Then point machines at it with the
same `area` id.

## Mozon Remote Control (operator dashboard)

`control.html` is a private **operator cockpit** for the fleet. Open it in a
browser (e.g. `…/control.html`) and you get, from the **same Google Sheet** the
public map already uses — no extra backend:

- **Live KPIs** — total machines, how many are online / in maintenance / offline,
  verified count, and a **data-issues** count (rows missing coordinates, name,
  services or emirate).
- **Uptime line** — the share of the fleet that is currently online.
- **Breakdowns** — machines per emirate (with an online meter) and coverage per
  recharge service.
- **Searchable, sortable table** of every machine, filterable by status (or
  “issues”), with an **Open ↗** link that jumps the public map straight to that
  pin.

### Controlling a machine remotely

You "control" a machine by editing the shared Sheet — no app to install:

1. In the Sheet, set that machine's **`status`** cell to `online`,
   `maintenance`, or `offline` (blank counts as online).
2. Hit **Refresh** in the dashboard.

Both the dashboard **and the public map update**: a `maintenance` pin turns
amber (🛠️), an `offline` pin turns red (✕), and each shows a status badge in
its popup. Because it is Sheet-driven, anyone you share edit access with can
flip a machine's status from their phone.

Open the dashboard against a specific published Sheet with
`…/control.html?sheet=PASTE_LINK_HERE` (restricted to Google publish hosts, same
as the map). With no Sheet configured it shows the bundled sample data so the
page still works.

## Put it online with Netlify

**Fastest (drag & drop):**
1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `uae-recharge-map` folder onto the page.
3. Netlify gives you a live URL in seconds. Done.

**Connected to GitHub (auto-deploys on every push):**
1. Netlify → *Add new site → Import from Git* → pick this repo.
2. Set **Base directory** = `uae-recharge-map`,
   **Publish directory** = `uae-recharge-map`, leave the build command empty.
3. Deploy. Every push to the branch updates the live site.

## Roadmap / possible next steps

- **Fully offline map tiles** (works with no internet at all) — bundle an
  MBTiles/PMTiles pack for the UAE. Bigger download; can be added later.
- **Import real POIs** (all buildings/hotels/restaurants) from OpenStreetMap
  via the Overpass API, cached into `data.js`.
- **Admin form** to add machines from the phone instead of editing `data.js`.
- **Arabic UI toggle** (data already carries Arabic names where available).
