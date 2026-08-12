#!/usr/bin/env python3
"""
MADEX WAVIES — per-branch build

Generates one standalone, deployable folder per branch from the master index.html.
Each folder is dragged onto its OWN Netlify site, so every branch gets its own URL,
its own Google Business Profile order link, and its own traffic stats.

    python3 build.py

Output:
    build/mashad-alqusais/      -> drag to Netlify -> mashad-alqusais.netlify.app
    build/teajunction-alnahda/  -> drag to Netlify -> teajunction-alnahda.netlify.app
    ...
"""
import re, shutil, json
from pathlib import Path

ROOT   = Path(__file__).parent
SRC    = ROOT / "index.html"
PHOTOS = ROOT / "photos"
OUT    = ROOT / "build"

html = SRC.read_text(encoding="utf-8")

# ── pull the branch list straight out of index.html so this never drifts ──
branches = {}
for shop in re.finditer(r'^(\w+):\{\n\s+name:"([^"]+)"', html, re.M):
    key, name = shop.group(1), shop.group(2)
    block = html[shop.start(): shop.start() + 9000]
    found = re.findall(r'\{id:"(\w+)",\s*name:"([^"]+)",\s*wa:"(\d+)"', block)
    if found:
        branches[key] = {"name": name, "list": found}

OUT.mkdir(exist_ok=True)


def copy_photos(dest):
    """Overwrite in place — some environments disallow deleting mounted files."""
    dest.mkdir(exist_ok=True)
    for f in PHOTOS.glob("*.jpg"):
        shutil.copy(f, dest / f.name)

made = []
for shop, data in branches.items():
    for bid, bname, wa in data["list"]:
        folder = OUT / f"{shop}-{bid}"
        folder.mkdir(parents=True, exist_ok=True)

        out = html
        out = out.replace('const BRANCH_LOCK = "";', f'const BRANCH_LOCK = "{bid}";')
        out = out.replace('const SHOP_LOCK   = "";', f'const SHOP_LOCK   = "{shop}";')
        # branch name in the <title> helps Google index each page separately
        out = out.replace("<title>Order Online</title>",
                          f"<title>{data['name']} — {bname} — Order Online</title>\n"
                          f'<meta name="description" content="Order online from {data["name"]}, '
                          f'{bname}. No delivery charge. Direct to the kitchen.">')

        (folder / "index.html").write_text(out, encoding="utf-8")
        if PHOTOS.exists():
            copy_photos(folder / "photos")

        # Cloudflare Pages / Netlify cache rules — photos cached for a year,
        # HTML always fresh so menu edits appear immediately.
        (folder / "_headers").write_text(
            "/photos/*\n"
            "  Cache-Control: public, max-age=31536000, immutable\n"
            "\n"
            "/*.html\n"
            "  Cache-Control: public, max-age=0, must-revalidate\n"
            "  X-Frame-Options: SAMEORIGIN\n"
            "  X-Content-Type-Options: nosniff\n"
            "  Referrer-Policy: strict-origin-when-cross-origin\n",
            encoding="utf-8")
        made.append((shop, bid, bname, wa, folder))

# ── menu-index.json — the item list the portal edits ──
import json
index = {}
for shop in re.finditer(r'^(\w+):\{\n\s+name:"([^"]+)"', html, re.M):
    key = shop.group(1)
    end = html.find("\n},", shop.start())
    block = html[shop.start(): end if end > 0 else len(html)]
    items = []
    for cat in re.finditer(r'^\s{3}(\w+):\{t:"([^"]+)"[^\n]*?i:\[', block, re.M):
        cname = cat.group(2)
        seg = block[cat.end():]
        stop = re.search(r'^\s{3}\w+:\{t:"', seg, re.M)
        if stop:
            seg = seg[:stop.start()]
        for it in re.finditer(r'\{n:"([^"]+)",a:"([^"]*)",p:([\d.]+)(?:[^}]*?g:"([^"]+)")?[^}]*\}', seg):
            items.append({"n": it.group(1), "a": it.group(2),
                          "p": float(it.group(3)), "g": it.group(4) or "",
                          "c": cname})
    index[key] = items
(ROOT / "menu-index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1),
                                     encoding="utf-8")
print(f"\n  menu-index.json  ->  " +
      ", ".join(f"{k}: {len(v)} items" for k, v in index.items()))

print(f"\n  Built {len(made)} branch sites\n")
print(f"  {'FOLDER':<34}{'BRANCH':<40}{'WHATSAPP'}")
print("  " + "-" * 92)
for shop, bid, bname, wa, folder in made:
    print(f"  {shop + '-' + bid:<34}{bname[:38]:<40}+{wa}")

print("""
  NEXT
  ────
  1. netlify.com  ->  Add new site  ->  Deploy manually
  2. Drag ONE folder from build/ onto the drop zone
  3. Site settings -> Change site name -> e.g. mashad-alqusais
  4. Repeat for each folder (each becomes its own site, free)
  5. Google Business Profile for that branch -> Ordering -> paste its URL

  Updating later: edit index.html, re-run this script, drag the folder again.
""")
