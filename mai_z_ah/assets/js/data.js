/* ============================================================
   mai_z_ah — store configuration & default catalog
   ------------------------------------------------------------
   EDIT YOUR WHATSAPP NUMBER BELOW (one place).
   International format, digits only (country code + number),
   NO "+", NO spaces.  e.g. UAE: 971524877701 | India: 919876543210
   You can also change every setting live from the Admin panel.
   ============================================================ */

window.MAIZAH_DEFAULT_CONFIG = {
  brand: "mai_z_ah",
  tagline: "Premium picks, delivered with love.",
  whatsappNumber: "REPLACE_WITH_YOUR_NUMBER", // <-- SET THIS
  currency: "₹",
  currencyCode: "INR",
  deliveryCharge: 50,
  freeDeliveryOver: 3000,          // subtotal above this => free delivery
  extraDiscountPct: 0,             // optional store-wide extra discount %
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
  mapLink: "https://maps.google.com/",     // "Google Maps Delivery Location"
  paymentQR: "",                   // paste an image URL of your payment QR (optional)
  supportEmail: "hello@maizah.example",
  supportPhone: ""                 // display phone (optional)
};

/* Default demo catalog — edit/replace freely from the Admin panel.
   Fields:
   id, name, description, category, price (original), offer (offer price, 0 = none),
   image (URL or leave "" to use a generated placeholder), emoji (fallback icon),
   newArrival (bool), bestSeller (bool), rating (0-5), reviews (count),
   enabled (bool), offerEndsAt (ISO date string or "" for no countdown)   */
window.MAIZAH_DEFAULT_PRODUCTS = [
  {
    id: "p1", name: "Royal Oud Perfume", description: "Long-lasting luxury oud fragrance, 100ml.",
    category: "Perfumes", price: 2500, offer: 1999, image: "", emoji: "🧴",
    newArrival: true, bestSeller: true, rating: 4.8, reviews: 214, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p2", name: "Amber Musk Attar", description: "Concentrated alcohol-free attar, 12ml roll-on.",
    category: "Attar", price: 900, offer: 699, image: "", emoji: "💧",
    newArrival: true, bestSeller: false, rating: 4.6, reviews: 88, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p3", name: "Embroidered Abaya", description: "Premium crepe abaya with gold thread work. Free size.",
    category: "Abayas", price: 4200, offer: 3499, image: "", emoji: "🥻",
    newArrival: false, bestSeller: true, rating: 4.9, reviews: 156, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p4", name: "Silk Hijab Set (3 pcs)", description: "Soft breathable chiffon hijabs, assorted colours.",
    category: "Accessories", price: 1200, offer: 899, image: "", emoji: "🧣",
    newArrival: false, bestSeller: true, rating: 4.7, reviews: 132, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p5", name: "Rose Gold Watch", description: "Elegant analog watch, stainless steel strap.",
    category: "Accessories", price: 3800, offer: 0, image: "", emoji: "⌚",
    newArrival: true, bestSeller: false, rating: 4.5, reviews: 41, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p6", name: "Bakhoor Gift Box", description: "Assorted premium bakhoor with burner. Perfect gift.",
    category: "Home", price: 1600, offer: 1299, image: "", emoji: "🎁",
    newArrival: false, bestSeller: false, rating: 4.4, reviews: 27, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p7", name: "Velvet Prayer Mat", description: "Thick padded prayer mat with luxury finish.",
    category: "Home", price: 1400, offer: 1099, image: "", emoji: "🕌",
    newArrival: false, bestSeller: false, rating: 4.8, reviews: 63, enabled: true,
    offerEndsAt: ""
  },
  {
    id: "p8", name: "Kohl Eyeliner Duo", description: "Long-wear intense black kohl, pack of 2.",
    category: "Beauty", price: 600, offer: 449, image: "", emoji: "💄",
    newArrival: true, bestSeller: true, rating: 4.6, reviews: 190, enabled: true,
    offerEndsAt: ""
  }
];

/* ---------------- storage layer (localStorage) ---------------- */
window.MaizahStore = (function () {
  var CK = "maizah_config_v1";
  var PK = "maizah_products_v1";
  var OK = "maizah_orders_v1";

  function getConfig() {
    try {
      var c = JSON.parse(localStorage.getItem(CK));
      if (c) return Object.assign({}, window.MAIZAH_DEFAULT_CONFIG, c);
    } catch (e) {}
    return Object.assign({}, window.MAIZAH_DEFAULT_CONFIG);
  }
  function saveConfig(c) { localStorage.setItem(CK, JSON.stringify(c)); }

  function getProducts() {
    try {
      var p = JSON.parse(localStorage.getItem(PK));
      if (Array.isArray(p)) return p;
    } catch (e) {}
    // seed defaults on first run
    var seed = JSON.parse(JSON.stringify(window.MAIZAH_DEFAULT_PRODUCTS));
    localStorage.setItem(PK, JSON.stringify(seed));
    return seed;
  }
  function saveProducts(p) { localStorage.setItem(PK, JSON.stringify(p)); }

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(OK)) || []; } catch (e) { return []; }
  }
  function saveOrders(o) { localStorage.setItem(OK, JSON.stringify(o)); }
  function addOrder(order) { var o = getOrders(); o.unshift(order); saveOrders(o); }

  function resetProducts() {
    var seed = JSON.parse(JSON.stringify(window.MAIZAH_DEFAULT_PRODUCTS));
    saveProducts(seed); return seed;
  }

  return {
    getConfig: getConfig, saveConfig: saveConfig,
    getProducts: getProducts, saveProducts: saveProducts, resetProducts: resetProducts,
    getOrders: getOrders, saveOrders: saveOrders, addOrder: addOrder
  };
})();
