# Mozon Broast — Al Nahda website

A fast, self-contained, SEO/GEO-optimised landing site for **Mozon Broast** (Al Nahda 2, Deira, Dubai), built to win local "broast near me" searches and push orders to your offers subdomain.

> Real business data used (verified from Talabat, Zomato, HiDubai, Deliveroo):
> **Mozon Broast**, Shop 1, 3 Street, Al Nahda Second, Deira, Dubai · **+971 52 487 7701** · 4.5★ (145+ reviews).
> **Check every fact below is exactly right before you go live** — Google punishes inconsistent name/address/phone (NAP).

---

## Files

| File | Purpose | Where it goes |
|---|---|---|
| `index.html` | Main landing page | `mozonbroast.ae` → `public_html/` |
| `offers.html` | Offers page for the order pop-up | `offersmozon.ae` → its own `public_html/` (rename to `index.html`) |
| `assets/css/styles.css` | Design system + animations | keep the `assets/` path |
| `assets/js/main.js` | Order pop-up, parallax, reveals | keep the `assets/` path |
| `.htaccess` | HTTPS, compression, caching, security headers | site root |
| `sitemap.xml`, `robots.txt` | Crawl/index control | site root |
| `site.webmanifest` | PWA / install metadata | site root |

The order buttons open **https://offersmozon.ae** in a new tab. To change that destination, edit the single `OFFERS_URL` constant at the top of `assets/js/main.js`.

---

## Deploy (5 minutes, shared hosting / cPanel / ServerByt)

**Main site — mozonbroast.ae**
1. Open your hosting File Manager → `public_html/`.
2. Upload `index.html`, `.htaccess`, `sitemap.xml`, `robots.txt`, `site.webmanifest`, and the whole `assets/` folder.
3. Visit `https://mozonbroast.ae` — you should see the animated hero.

**Offers subdomain — offersmozon.ae**
1. Create the subdomain in your host (points to its own folder, e.g. `offersmozon/`).
2. Upload `offers.html` there and **rename it to `index.html`**.
3. Test that clicking **Order Now** on the main site opens it.

**No hosting yet?** This is a static site — you can also drop it on Netlify, Cloudflare Pages, or GitHub Pages for free, then point your domain at it.

---

## Swap in your real content (do this before promoting)

The visuals use emoji + CSS art so the site is fast and works with zero image files. For a premium look, replace with real photos:

- **Hero / food photos** — shoot your actual broast, or design in **Canva** (1200×1200 for the plate, 1200×630 for `assets/img/og-cover.jpg` used in social shares). Export as WebP/JPG and drop into `assets/img/`, then swap the emoji blocks.
- **Prices** — the menu prices are marked *"from AED …"* placeholders. Put your real prices in, or leave ordering to the apps.
- **Offers** — edit the three cards in `offers.html` to match your live Talabat/Deliveroo promos.
- **Reviews** — swap in real Google/Talabat review quotes (with permission).

---

## 🔥 Aggressive local SEO / GEO ranking playbook

The website is only ~30% of local ranking. The other 70% is **Google Business Profile + reviews + citations**. Do these in order — this is what actually moves you up the map pack for "broast Al Nahda".

### 1. Google Business Profile (biggest lever)
- Claim/verify **Mozon Broast** at [business.google.com](https://business.google.com).
- Category: **Broaster** / **Fast food restaurant** / **Chicken restaurant** (add all that fit).
- NAP **exactly** matching this site: `Mozon Broast · Shop 1, 3 Street, Al Nahda Second, Deira, Dubai · +971 52 487 7701`.
- Add website `https://mozonbroast.ae`, hours, 20+ photos (food, shopfront, interior), and the menu.
- Post a weekly **Offer/Update** — Google rewards active profiles.

### 2. Reviews engine (ranking + conversion)
- Ask every happy customer for a Google review; aim for a steady trickle, not a spike.
- Print a **QR code** (Canva) on receipts/bags linking straight to your review form.
- Reply to **every** review (good and bad) — response rate is a ranking signal.

### 3. Consistent citations (NAP everywhere)
Make sure the identical name/address/phone appears on: Talabat, Deliveroo, EatEasy, Zomato, HiDubai, Yango Maps, Apple Maps, Facebook, Instagram. Inconsistency dilutes ranking.

### 4. On-page (already built in)
- ✅ Title/description target **"broast Al Nahda"** + city.
- ✅ `Restaurant` + `LocalBusiness` JSON-LD with geo, hours, rating, `areaServed`, `OrderAction`.
- ✅ Geo meta tags, canonical, Open Graph, sitemap, robots.
- ✅ Fast, mobile-first, accessible (Core Web Vitals friendly).
- **To do:** confirm the geo coordinates in `index.html` (`geo.position` + JSON-LD `geo`) are your exact pin — grab them from your Google Maps listing.

### 5. Content for "geo" reach
Add short pages/sections over time targeting nearby areas you deliver to — "Broast delivery in Al Qusais", "Fried chicken near Al Nahda Metro", etc. Each real, useful page widens your keyword net.

### 6. Submit & monitor
- Add the site to **Google Search Console**, submit `sitemap.xml`.
- Add **Google Analytics** (or a privacy-light option like Plausible) to see what converts.
- Re-check rankings monthly for "broast al nahda", "broasted chicken dubai delivery", "chicken near me".

---

## Corporate ordering
The **Corporate** section captures enquiries and sends them to WhatsApp (`+971 52 487 7701`) so nothing is lost before a full ordering backend exists. When you're ready, wire the form to your ordering system or a tool like Google Forms / Make.com.

---

*Built as a static, dependency-free site — no build step, no framework, edit any file and re-upload.*
