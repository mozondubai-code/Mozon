# mai_z_ah — Premium E-commerce Store 🛍️

A fast, mobile-first online store for the **mai_z_ah** brand. Customers browse
products, build a cart, fill delivery details, and place the order directly
through **WhatsApp** — no backend, no database, no monthly fees. Fully static:
deploy to Vercel / Netlify / GitHub Pages as-is.

## ✨ Features

**Storefront (`index.html`)**
- Hero banner + brand logo, glassmorphism premium design
- Product gallery with large images / emoji fallbacks
- Category tabs: All · 🆕 New Arrivals · ⭐ Best Sellers · 🔥 Offers + your own categories
- Live search + category filter
- Product cards: image, name, description, original + offer price, ⭐ rating,
  quantity selector (+/−), Add to Cart, share, NEW / BEST SELLER / -% badges
- Product zoom modal with reviews, share, and payment QR
- 🔥 Offer countdown timers
- ❤️ Wishlist, 🔗 Share, 🌙/☀️ Dark & Light mode (remembered)
- Cart drawer → order summary (subtotal, offer discount, delivery, free-delivery
  threshold, grand total, savings)
- Delivery form: name, mobile, location, address, landmark, notes
- **Place Order → opens WhatsApp** with a fully formatted order message
- Floating WhatsApp button, Instagram / Facebook / Maps links
- About · Contact · FAQ · Privacy · Terms pages
- SEO: meta tags, Open Graph, sitemap, robots, web manifest, fast & responsive

**Admin panel (`admin.html`)** — passcode protected (client-side)
- Add / Edit / Delete products, upload image URLs, set emoji fallback
- Change prices, add offer prices & offer countdown end times
- New Arrival / Best Seller badges, enable/disable (show/hide) products
- View orders placed on this device
- **Export orders to Excel** (.xls)
- Settings: WhatsApp number, currency, delivery charge, free-delivery threshold,
  store-wide extra discount, social links, Google Maps link, payment QR, passcode

## 🚀 Quick start

### 1. Set your WhatsApp number (required to receive orders)
Two ways — either works:
- **Easiest:** open `admin.html` → login (default passcode `maizah`) → **Settings**
  → enter your WhatsApp number → **Save**.
- **Or** edit `assets/js/data.js` and set `whatsappNumber` (top of the file).

Use international format, digits only (country code + number), **no `+`, no spaces**:
- India: `919876543210`  ·  UAE: `971524877701`

### 2. Add your products
Open `admin.html` → **Products** → **+ Add Product**. Paste image URLs, set
prices/offers, toggle badges. (A demo catalog is included — edit or `Reset demo`.)

### 3. Deploy (free)
- **Vercel:** import this folder / repo → deploy (no build step, it's static).
- **Netlify:** drag the `mai_z_ah` folder onto the Deploys tab.
- **GitHub Pages:** serve this folder.

Test locally first:
```bash
cd mai_z_ah
python3 -m http.server 8080   # then open http://localhost:8080
```

## 🗂️ Structure
```
mai_z_ah/
├── index.html          # storefront
├── admin.html          # admin panel (passcode)
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── data.js     # ← WhatsApp number + config + default catalog
│       ├── store.js    # storefront logic
│       └── admin.js    # admin logic
├── pages/              # about, contact, faq, privacy, terms
├── robots.txt · sitemap.xml · site.webmanifest
```

## 🔐 Notes
- Products, orders, cart, wishlist and settings are stored in the **browser's
  local storage**. The admin passcode is a client-side convenience gate, not
  strong security — anyone with the files can read them. For multi-device order
  storage or a hardened admin, add a backend (e.g. Firebase) later; the WhatsApp
  ordering works fully without one.
- Orders always reach you via WhatsApp even if local saving fails — the WhatsApp
  link is the reliable channel.

## 🎨 Theme
Emerald `#10B981` · Gold `#F59E0B` · glassmorphism · gradient buttons · rounded
cards · smooth animations · dark & light mode.
