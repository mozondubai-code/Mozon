# mai_z_ah — Premium Jewellery Store 💎

A modern, mobile-first, **premium e-commerce website** for the jewellery brand **mai_z_ah**.
Customers browse products, add to cart, see the full bill (offers + delivery), and place the
order **directly on WhatsApp**. No backend, no monthly cost — just static files you can host
anywhere (Vercel, Netlify, GitHub Pages, or any web host).

## ✨ Features

- Premium **Emerald + Gold** theme with **Dark / Light mode**
- Responsive on **mobile, tablet & desktop** with smooth animations & glassmorphism
- Hero banner, **product gallery** with large photos
- **Categories & filters** (New Arrivals, Best Sellers, Offers, Jhumkas, Chandbali, Studs, Bracelets)
- **Live product search**
- Product cards: image, name, description, **MRP + offer price**, discount %, **quantity +/‑**, Add to Cart
- **New Arrival / Best Seller / Offer badges**
- **Wishlist ❤️** (saved in browser)
- **Product image zoom** + **Customer reviews ⭐** + **Share** (native share / copy link) in the product popup
- **Shopping cart** with Subtotal, Offer Discount, Delivery Charge, **Grand Total** (free delivery over ₹3000)
- **Delivery form**: name, mobile, city, address, landmark, notes
- 📍 **Location pin**: a friendly **“Send my current location”** button (framed in a banner — *no auto pop-up on page load*). It attaches a Google Maps pin to the WhatsApp order.
- **Place Order → WhatsApp**: opens WhatsApp with a fully formatted order message
- **UPI QR code** payment popup
- **Offer countdown timer**, floating **WhatsApp button**, Instagram/Facebook links
- **About, Contact, FAQ, Privacy Policy, Terms** pages (as popups)
- **Admin panel** (`admin.html`) — add/edit/delete products, hide/show, view orders, export orders to CSV
- SEO-friendly meta tags

## 🗂️ Files

```
mai_z_ah/
├── index.html          # the storefront (self-contained: HTML + CSS + JS)
├── admin.html          # owner admin panel (product & order management)
├── assets/products/    # product photos
├── vercel.json         # hosting config (optional)
├── robots.txt
└── README.md
```

## ⚙️ Configure (important — do this first!)

Open **`index.html`** and edit the `CONFIG` block near the top of the `<script>`:

```js
const CONFIG = {
  brand: "mai_z_ah",
  whatsapp: "971500000000",   // 👉 your WhatsApp number, country code, NO + and NO spaces
  instagram: "https://instagram.com/mai_z_ah",
  facebook: "https://facebook.com/...",
  upiId: "maizah@upi",        // 👉 your real UPI ID for the payment QR
  currency: "₹",
  deliveryCharge: 50,
  freeDeliveryAbove: 3000,
};
```

> **WhatsApp number** is the only must-change value for orders to work.
> Example: UAE `9715XXXXXXXX`, India `9198XXXXXXXX`.

## 🛠️ Managing products

Two ways:

1. **Simple / permanent:** edit the `DEFAULT_PRODUCTS` array in `index.html` (name, price `price`, MRP `mrp`, `img`, `tags`, etc.). This is what every visitor sees.
2. **Admin panel (`admin.html`):** add/edit/delete products in a friendly UI. Changes are saved in **your browser** and shown on the store **in that same browser**. Use **Export Products (JSON)** and paste the result into `index.html`’s `DEFAULT_PRODUCTS` to publish them for everyone.

To add product photos: drop image files into `assets/products/` and set the card’s `img` to `assets/products/your-file.png`.

> **Note:** because this site has **no server**, the admin panel’s live edits and the recorded
> orders are stored in the browser’s localStorage (per device). Orders are also recorded there
> when a customer places one on that browser — the real, reliable order copy always arrives in
> your **WhatsApp**.

## 🚀 Deploy

**Vercel (recommended):**
1. Push this folder to a Git repo.
2. In Vercel → *New Project* → import the repo → set **Root Directory** to `mai_z_ah` → Deploy.

**Netlify:** drag-and-drop the `mai_z_ah` folder onto the Netlify dashboard.

**Any web host / GitHub Pages:** upload the contents of `mai_z_ah/` to your web root.

The site is 100% static — no build step required.

## 📱 How a customer orders

1. Browse → adjust quantity → **Add to Cart**
2. Open cart → **Proceed to Checkout**
3. Fill delivery details, optionally tap **📍 Send my current location**
4. **Place Order on WhatsApp** → WhatsApp opens with the full order → send ✅
