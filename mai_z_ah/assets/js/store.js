/* ============ mai_z_ah — storefront logic ============ */
(function () {
  var CFG = MaizahStore.getConfig();
  var PRODUCTS = MaizahStore.getProducts();
  var cart = load("maizah_cart", {});      // {id: qty}
  var wish = load("maizah_wish", {});      // {id: true}
  var activeTab = "All";
  var query = "";
  var showWishOnly = false;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function money(n) { return CFG.currency + Number(n).toLocaleString("en-IN"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function priceOf(p) { return (p.offer && p.offer > 0 && p.offer < p.price) ? p.offer : p.price; }
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1800); }

  /* ---------- theme ---------- */
  (function initTheme() {
    var saved = localStorage.getItem("maizah_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    $("#themeBtn").textContent = saved === "dark" ? "☀️" : "🌙";
  })();
  $("#themeBtn").addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("maizah_theme", next);
    this.textContent = next === "dark" ? "☀️" : "🌙";
  });

  /* ---------- config-driven bits ---------- */
  $("#year").textContent = new Date().getFullYear();
  $("#heroTag") && (document.title = CFG.brand + " — Premium Online Store");
  $("#footTag").textContent = CFG.tagline || "Premium picks, delivered with love.";
  var waHref = "https://wa.me/" + CFG.whatsappNumber;
  $("#fab").href = waHref; $("#waLink").href = waHref;
  $("#fbLink").href = CFG.facebook || "#"; $("#igLink").href = CFG.instagram || "#";
  $("#mapLink").href = CFG.mapLink || "#";
  if (CFG.whatsappNumber === "REPLACE_WITH_YOUR_NUMBER") {
    var n = document.createElement("div"); n.className = "note"; n.style.margin = "10px 18px";
    n.innerHTML = "⚠️ <b>Setup:</b> WhatsApp number not set yet. Open <a href='admin.html' style='color:inherit;text-decoration:underline'>Admin → Settings</a> (or edit <code>assets/js/data.js</code>) to receive orders.";
    document.body.insertBefore(n, document.querySelector(".hero"));
  }

  /* ---------- tabs ---------- */
  function categories() {
    var cats = {}; PRODUCTS.forEach(function (p) { if (p.enabled !== false) cats[p.category] = 1; });
    return ["All", "New Arrival", "Best Sellers", "Offers"].concat(Object.keys(cats));
  }
  function renderTabs() {
    $("#tabs").innerHTML = categories().map(function (c) {
      return '<button class="tab' + (c === activeTab ? " active" : "") + '" data-cat="' + esc(c) + '">' + label(c) + "</button>";
    }).join("");
    $$("#tabs .tab").forEach(function (b) {
      b.addEventListener("click", function () { activeTab = b.getAttribute("data-cat"); showWishOnly = false; render(); location.hash = activeTab === "Offers" ? "offers" : "shop"; });
    });
  }
  function label(c) { return c === "New Arrival" ? "🆕 New Arrivals" : c === "Best Sellers" ? "⭐ Best Sellers" : c === "Offers" ? "🔥 Offers" : c === "All" ? "🛍️ All" : c; }

  /* ---------- filtering ---------- */
  function visibleProducts() {
    return PRODUCTS.filter(function (p) {
      if (p.enabled === false) return false;
      if (showWishOnly && !wish[p.id]) return false;
      if (activeTab === "New Arrival" && !p.newArrival) return false;
      if (activeTab === "Best Sellers" && !p.bestSeller) return false;
      if (activeTab === "Offers" && !(p.offer && p.offer > 0 && p.offer < p.price)) return false;
      if (activeTab !== "All" && ["New Arrival", "Best Sellers", "Offers"].indexOf(activeTab) < 0 && p.category !== activeTab) return false;
      if (query) { var q = query.toLowerCase(); if ((p.name + " " + p.description + " " + p.category).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
  }

  function stars(r) { r = r || 0; var full = Math.round(r); return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full); }

  function imgHTML(p, cls) {
    if (p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">';
    return '<span class="' + (cls || "emoji") + '">' + (p.emoji || "🛍️") + "</span>";
  }

  function countdown(p) {
    if (!p.offerEndsAt) return "";
    var end = new Date(p.offerEndsAt).getTime(); if (isNaN(end)) return "";
    var diff = end - Date.now(); if (diff <= 0) return "";
    var d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5), m = Math.floor(diff % 36e5 / 6e4);
    return '<div class="timer" data-end="' + end + '">⏳ Ends in ' + (d ? d + "d " : "") + h + "h " + m + "m</div>";
  }

  /* ---------- product card ---------- */
  function card(p) {
    var q = cart[p.id] || 0;
    var offer = p.offer && p.offer > 0 && p.offer < p.price;
    var off = offer ? Math.round((1 - p.offer / p.price) * 100) : 0;
    var badges = "";
    if (p.newArrival) badges += '<span class="badge badge-new">NEW</span>';
    if (p.bestSeller) badges += '<span class="badge badge-best">BEST SELLER</span>';
    if (offer) badges += '<span class="badge badge-off">-' + off + "%</span>";
    return '' +
      '<div class="card" data-id="' + p.id + '">' +
        '<div class="card-img" data-zoom="' + p.id + '">' +
          '<div class="card-badges">' + badges + "</div>" +
          '<button class="wish' + (wish[p.id] ? " on" : "") + '" data-wish="' + p.id + '" title="Wishlist">' + (wish[p.id] ? "❤️" : "🤍") + "</button>" +
          imgHTML(p) +
        "</div>" +
        '<div class="card-body">' +
          '<div class="card-cat">' + esc(p.category) + "</div>" +
          '<h3 class="card-name">' + esc(p.name) + "</h3>" +
          '<p class="card-desc">' + esc(p.description) + "</p>" +
          '<div class="stars">' + stars(p.rating) + ' <small>(' + (p.reviews || 0) + ")</small></div>" +
          countdown(p) +
          '<div class="price-row"><span class="price">' + money(priceOf(p)) + "</span>" +
            (offer ? '<span class="price-old">' + money(p.price) + "</span>" : "") + "</div>" +
          '<div class="card-actions">' +
            (q > 0 ?
              '<div class="qty"><button data-dec="' + p.id + '">−</button><span>' + q + '</span><button data-inc="' + p.id + '">+</button></div>' :
              '<button class="btn btn-grad" style="flex:1" data-add="' + p.id + '">Add to Cart</button>') +
            '<button class="share" data-share="' + p.id + '" title="Share">🔗</button>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function render() {
    var list = visibleProducts();
    $("#gridTitle").textContent = showWishOnly ? "❤️ Your Wishlist" : label(activeTab).replace(/^[^\s]+\s/, activeTab === "All" ? "All Products" : "") || activeTab;
    if (showWishOnly) $("#gridTitle").textContent = "❤️ Your Wishlist";
    else if (activeTab === "All") $("#gridTitle").textContent = "All Products";
    else $("#gridTitle").textContent = label(activeTab);
    $("#resultCount").textContent = list.length + " item" + (list.length === 1 ? "" : "s");
    $("#grid").innerHTML = list.map(card).join("");
    $("#noResults").style.display = list.length ? "none" : "block";
    $("#statCount").textContent = PRODUCTS.filter(function (p) { return p.enabled !== false; }).length;
    bindCards();
  }

  function bindCards() {
    $$("[data-add]").forEach(function (b) { b.onclick = function () { addToCart(b.getAttribute("data-add")); }; });
    $$("[data-inc]").forEach(function (b) { b.onclick = function () { changeQty(b.getAttribute("data-inc"), 1); }; });
    $$("[data-dec]").forEach(function (b) { b.onclick = function () { changeQty(b.getAttribute("data-dec"), -1); }; });
    $$("[data-wish]").forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); toggleWish(b.getAttribute("data-wish")); }; });
    $$("[data-share]").forEach(function (b) { b.onclick = function () { shareProduct(b.getAttribute("data-share")); }; });
    $$("[data-zoom]").forEach(function (b) { b.onclick = function () { openModal(b.getAttribute("data-zoom")); }; });
  }

  function find(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }

  /* ---------- cart ---------- */
  function addToCart(id) { cart[id] = (cart[id] || 0) + 1; save("maizah_cart", cart); toast("Added to cart 🛒"); render(); updateCartUI(); }
  function changeQty(id, d) { cart[id] = (cart[id] || 0) + d; if (cart[id] <= 0) delete cart[id]; save("maizah_cart", cart); render(); updateCartUI(); }
  function removeItem(id) { delete cart[id]; save("maizah_cart", cart); render(); updateCartUI(); renderCart(); }

  function cartTotals() {
    var subtotal = 0, original = 0, count = 0;
    Object.keys(cart).forEach(function (id) {
      var p = find(id); if (!p) return; var q = cart[id];
      subtotal += priceOf(p) * q; original += p.price * q; count += q;
    });
    var offerDiscount = original - subtotal;
    var extra = Math.round(subtotal * (CFG.extraDiscountPct || 0) / 100);
    var afterExtra = subtotal - extra;
    var delivery = (CFG.freeDeliveryOver && afterExtra >= CFG.freeDeliveryOver) || afterExtra === 0 ? 0 : (CFG.deliveryCharge || 0);
    var grand = afterExtra + delivery;
    return { subtotal: subtotal, original: original, offerDiscount: offerDiscount, extra: extra, delivery: delivery, grand: grand, count: count };
  }

  function updateCartUI() {
    var t = cartTotals();
    var cc = $("#cartCount"); cc.textContent = t.count; cc.style.display = t.count ? "grid" : "none";
    var wc = $("#wishCount"); var wn = Object.keys(wish).length; wc.textContent = wn; wc.style.display = wn ? "grid" : "none";
  }

  function renderCart() {
    var ids = Object.keys(cart);
    var body = $("#cartBody"), foot = $("#cartFoot");
    if (!ids.length) { body.innerHTML = '<div class="empty">Your cart is empty.<br>Add some lovely products! 🛍️</div>'; foot.innerHTML = ""; return; }
    body.innerHTML = ids.map(function (id) {
      var p = find(id); if (!p) return ""; var q = cart[id];
      return '<div class="cart-item">' +
        '<div class="thumb">' + imgHTML(p, "") + "</div>" +
        '<div class="info"><b>' + esc(p.name) + "</b>" +
          '<div class="stars"><small style="color:var(--muted)">' + money(priceOf(p)) + " × " + q + " = <b style='color:var(--text)'>" + money(priceOf(p) * q) + "</b></small></div>" +
          '<div class="qty" style="display:inline-flex;margin-top:6px"><button data-cdec="' + id + '">−</button><span>' + q + '</span><button data-cinc="' + id + '">+</button></div>' +
          ' <button class="rm" data-rm="' + id + '">Remove</button>' +
        "</div></div>";
    }).join("");
    var t = cartTotals();
    foot.innerHTML =
      '<div class="summary-row"><span>Subtotal</span><span>' + money(t.subtotal) + "</span></div>" +
      (t.offerDiscount > 0 ? '<div class="summary-row"><span>Offer Discount</span><span class="save">− ' + money(t.offerDiscount) + "</span></div>" : "") +
      (t.extra > 0 ? '<div class="summary-row"><span>Extra Discount</span><span class="save">− ' + money(t.extra) + "</span></div>" : "") +
      '<div class="summary-row"><span>Delivery Charge</span><span>' + (t.delivery ? money(t.delivery) : "FREE") + "</span></div>" +
      '<div class="summary-row total"><span>Grand Total</span><span>' + money(t.grand) + "</span></div>" +
      '<button class="btn btn-grad btn-block" id="checkoutBtn" style="margin-top:12px">Proceed to Checkout →</button>';
    $$("[data-cinc]").forEach(function (b) { b.onclick = function () { changeQty(b.getAttribute("data-cinc"), 1); renderCart(); }; });
    $$("[data-cdec]").forEach(function (b) { b.onclick = function () { changeQty(b.getAttribute("data-cdec"), -1); renderCart(); }; });
    $$("[data-rm]").forEach(function (b) { b.onclick = function () { removeItem(b.getAttribute("data-rm")); }; });
    $("#checkoutBtn").onclick = renderCheckout;
  }

  /* ---------- checkout ---------- */
  function renderCheckout() {
    var t = cartTotals();
    var body = $("#cartBody"), foot = $("#cartFoot");
    body.innerHTML =
      '<button class="btn btn-ghost mini" id="backCart" style="margin-bottom:12px">← Back to cart</button>' +
      "<h3 style='margin:0 0 12px'>Delivery Details</h3>" +
      '<div class="field"><label>Name <span class="req">*</span></label><input id="fName" placeholder="Your full name"></div>' +
      '<div class="field"><label>Mobile Number <span class="req">*</span></label><input id="fPhone" type="tel" inputmode="numeric" placeholder="Your WhatsApp/phone number"></div>' +
      '<div class="field"><label>Delivery Location <span class="req">*</span></label><input id="fLoc" placeholder="City / Area"></div>' +
      '<div class="field"><label>Full Address <span class="req">*</span></label><textarea id="fAddr" placeholder="House / Building, Street"></textarea></div>' +
      '<div class="field"><label>Landmark</label><input id="fLand" placeholder="Nearby landmark (optional)"></div>' +
      '<div class="field"><label>Notes</label><textarea id="fNotes" placeholder="Any special instructions (optional)"></textarea></div>' +
      (CFG.paymentQR ? '<div class="field"><label>Payment QR</label><img src="' + esc(CFG.paymentQR) + '" alt="Payment QR" style="max-width:180px;border-radius:12px;border:1px solid var(--border)"></div>' : "") +
      "<h3 style='margin:16px 0 8px'>Order Summary</h3>" +
      Object.keys(cart).map(function (id) { var p = find(id); return p ? '<div class="summary-row"><span>' + esc(p.name) + " × " + cart[id] + "</span><span>" + money(priceOf(p) * cart[id]) + "</span></div>" : ""; }).join("");
    foot.innerHTML =
      '<div class="summary-row"><span>Subtotal</span><span>' + money(t.subtotal) + "</span></div>" +
      (t.offerDiscount + t.extra > 0 ? '<div class="summary-row"><span>Discount</span><span class="save">− ' + money(t.offerDiscount + t.extra) + "</span></div>" : "") +
      '<div class="summary-row"><span>Delivery</span><span>' + (t.delivery ? money(t.delivery) : "FREE") + "</span></div>" +
      '<div class="summary-row total"><span>Grand Total</span><span>' + money(t.grand) + "</span></div>" +
      // WhatsApp order MUST be an anchor (skill guidance: window.open gets blocked on mobile)
      '<a class="btn btn-wa btn-block" id="placeOrder" href="#" target="_blank" rel="noopener" style="margin-top:12px">💬 Place Order on WhatsApp</a>';
    $("#backCart").onclick = renderCart;
    $("#placeOrder").addEventListener("click", function (e) { return placeOrder(e, this); });
  }

  function placeOrder(e, anchor) {
    var name = ($("#fName").value || "").trim();
    var phone = ($("#fPhone").value || "").trim();
    var loc = ($("#fLoc").value || "").trim();
    var addr = ($("#fAddr").value || "").trim();
    if (!name || !phone || !loc || !addr) { e.preventDefault(); toast("Please fill name, phone, location & address"); return false; }
    if (CFG.whatsappNumber === "REPLACE_WITH_YOUR_NUMBER") { e.preventDefault(); toast("Store WhatsApp number not set (see Admin)"); return false; }
    var land = ($("#fLand").value || "").trim(), notes = ($("#fNotes").value || "").trim();
    var t = cartTotals();
    var lines = ["Hello " + CFG.brand + ",", "", "I would like to place an order.", "",
      "Customer Name:", name, "", "Phone:", phone, "", "Delivery Location:", loc, "", "Address:", addr];
    if (land) lines.push("", "Landmark:", land);
    lines.push("", "Items:", "");
    Object.keys(cart).forEach(function (id) { var p = find(id); if (p) lines.push("• " + p.name + " ×" + cart[id] + " = " + money(priceOf(p) * cart[id])); });
    lines.push("", "Subtotal:", money(t.subtotal));
    if (t.offerDiscount + t.extra > 0) lines.push("", "Offer Discount:", money(t.offerDiscount + t.extra));
    lines.push("", "Delivery Charge:", t.delivery ? money(t.delivery) : "FREE", "", "Grand Total:", money(t.grand));
    if (notes) lines.push("", "Notes:", notes);
    lines.push("", "Thank you.");
    var msg = lines.join("\n");
    anchor.href = "https://wa.me/" + CFG.whatsappNumber + "?text=" + encodeURIComponent(msg);
    // save order locally (admin view) — fire & forget, never blocks the order
    try {
      MaizahStore.addOrder({
        id: "ORD" + Date.now(), date: new Date().toISOString(),
        name: name, phone: phone, location: loc, address: addr, landmark: land, notes: notes,
        items: Object.keys(cart).map(function (id) { var p = find(id); return { name: p ? p.name : id, qty: cart[id], price: p ? priceOf(p) : 0, total: (p ? priceOf(p) : 0) * cart[id] }; }),
        subtotal: t.subtotal, discount: t.offerDiscount + t.extra, delivery: t.delivery, grand: t.grand
      });
    } catch (err) {}
    toast("Opening WhatsApp… 💬");
    // clear cart shortly after (order sent)
    setTimeout(function () { cart = {}; save("maizah_cart", cart); render(); updateCartUI(); closeDrawer(); }, 900);
    return true; // let the anchor navigate
  }

  /* ---------- wishlist ---------- */
  function toggleWish(id) {
    if (wish[id]) delete wish[id]; else wish[id] = true;
    save("maizah_wish", wish); updateCartUI(); render(); toast(wish[id] ? "Added to wishlist ❤️" : "Removed from wishlist");
  }
  $("#wishBtn").onclick = function () { showWishOnly = !showWishOnly; activeTab = "All"; render(); window.scrollTo({ top: document.getElementById("shop").offsetTop - 60, behavior: "smooth" }); };

  /* ---------- share ---------- */
  function shareProduct(id) {
    var p = find(id); if (!p) return;
    var text = CFG.brand + " — " + p.name + " for " + money(priceOf(p)) + "! " + location.href;
    if (navigator.share) { navigator.share({ title: p.name, text: text, url: location.href }).catch(function () {}); }
    else { navigator.clipboard && navigator.clipboard.writeText(text); toast("Link copied to clipboard 🔗"); }
  }

  /* ---------- product modal (zoom + reviews + QR) ---------- */
  function openModal(id) {
    var p = find(id); if (!p) return;
    var offer = p.offer && p.offer > 0 && p.offer < p.price;
    var reviews = sampleReviews(p);
    $("#modalCard").innerHTML =
      '<button class="modal-close" id="mClose">✕</button>' +
      '<div style="display:grid;gap:0;grid-template-columns:1fr">' +
        '<div class="card-img" style="aspect-ratio:16/10;cursor:default">' + imgHTML(p) + "</div>" +
        '<div style="padding:20px">' +
          '<div class="card-cat">' + esc(p.category) + "</div>" +
          "<h2 style='margin:4px 0'>" + esc(p.name) + "</h2>" +
          '<div class="stars">' + stars(p.rating) + " <small>" + (p.rating || 0) + " · " + (p.reviews || 0) + " reviews</small></div>" +
          "<p style='color:var(--muted)'>" + esc(p.description) + "</p>" +
          '<div class="price-row"><span class="price" style="font-size:24px">' + money(priceOf(p)) + "</span>" + (offer ? '<span class="price-old">' + money(p.price) + "</span>" : "") + "</div>" +
          '<div style="display:flex;gap:10px;margin:14px 0">' +
            '<button class="btn btn-grad" id="mAdd" style="flex:1">Add to Cart</button>' +
            '<button class="share" id="mShare">🔗</button>' +
          "</div>" +
          (CFG.paymentQR ? '<details><summary>📱 Pay via QR</summary><img src="' + esc(CFG.paymentQR) + '" style="max-width:200px;margin-top:10px;border-radius:12px"></details>' : "") +
          "<h3 style='margin:18px 0 8px'>⭐ Customer Reviews</h3>" + reviews +
        "</div>" +
      "</div>";
    $("#modal").classList.add("open");
    $("#mClose").onclick = closeModal;
    $("#mAdd").onclick = function () { addToCart(id); closeModal(); };
    $("#mShare").onclick = function () { shareProduct(id); };
  }
  function closeModal() { $("#modal").classList.remove("open"); }
  $("#modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });

  function sampleReviews(p) {
    var pool = [
      ["Aisha", "Absolutely loved it! Premium quality and fast delivery. 😍"],
      ["Rahul", "Worth every rupee. Highly recommend mai_z_ah."],
      ["Fatima", "Beautiful packaging and exactly as shown. Will order again!"],
      ["Sana", "Great value for money. Very happy with my purchase."]
    ];
    var n = Math.min(3, Math.max(1, Math.round((p.reviews || 3) / 60)));
    return pool.slice(0, n).map(function (r) {
      return '<div style="border-bottom:1px solid var(--border);padding:8px 0"><b>' + r[0] + '</b> <span class="stars">★★★★★</span><br><small style="color:var(--muted)">' + r[1] + "</small></div>";
    }).join("");
  }

  /* ---------- drawer ---------- */
  function openDrawer() { renderCart(); $("#drawer").classList.add("open"); $("#overlay").classList.add("open"); }
  function closeDrawer() { $("#drawer").classList.remove("open"); $("#overlay").classList.remove("open"); }
  $("#cartBtn").onclick = openDrawer;
  $("#closeCart").onclick = closeDrawer;
  $("#overlay").onclick = closeDrawer;

  /* ---------- search ---------- */
  function onSearch(v) { query = v; render(); }
  $("#searchInput") && $("#searchInput").addEventListener("input", function () { $("#searchInputMobile").value = this.value; onSearch(this.value); });
  $("#searchInputMobile").addEventListener("input", function () { if ($("#searchInput")) $("#searchInput").value = this.value; onSearch(this.value); });

  /* footer quick tabs */
  $$("[data-tab]").forEach(function (a) { a.addEventListener("click", function () { activeTab = a.getAttribute("data-tab"); showWishOnly = false; renderTabs(); render(); }); });

  /* offer countdown ticking */
  setInterval(function () {
    $$(".timer").forEach(function (t) {
      var end = +t.getAttribute("data-end"); var diff = end - Date.now();
      if (diff <= 0) { t.textContent = "⏳ Offer ended"; return; }
      var d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5), m = Math.floor(diff % 36e5 / 6e4), s = Math.floor(diff % 6e4 / 1e3);
      t.textContent = "⏳ Ends in " + (d ? d + "d " : "") + h + "h " + m + "m " + s + "s";
    });
  }, 1000);

  /* deep link to offers */
  if (location.hash === "#offers") activeTab = "Offers";

  /* init */
  renderTabs(); render(); updateCartUI();
})();
