/* ============ mai_z_ah — admin panel ============ */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var CFG = MaizahStore.getConfig();
  var PRODUCTS = MaizahStore.getProducts();
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function money(n) { return (CFG.currency || "₹") + Number(n || 0).toLocaleString("en-IN"); }
  function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1800); }
  function uid() { return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e3); }

  /* theme */
  (function () { var s = localStorage.getItem("maizah_theme") || "light"; document.documentElement.setAttribute("data-theme", s); $("#themeBtn").textContent = s === "dark" ? "☀️" : "🌙"; })();
  $("#themeBtn").onclick = function () { var n = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", n); localStorage.setItem("maizah_theme", n); this.textContent = n === "dark" ? "☀️" : "🌙"; };

  /* ---------- login gate ---------- */
  function currentPin() { return CFG.adminPin || "maizah"; }
  function doLogin() {
    if (($("#pin").value || "") === currentPin()) { sessionStorage.setItem("maizah_admin", "1"); showApp(); }
    else toast("Wrong passcode");
  }
  $("#loginBtn").onclick = doLogin;
  $("#pin").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  function showApp() { $("#gate").style.display = "none"; $("#app").style.display = "block"; renderProducts(); renderOrders(); loadSettings(); }
  if (sessionStorage.getItem("maizah_admin") === "1") showApp();

  /* ---------- view tabs ---------- */
  $$(".admin-tabs .tab").forEach(function (b) {
    b.onclick = function () {
      $$(".admin-tabs .tab").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active");
      var v = b.getAttribute("data-view");
      ["products", "orders", "settings"].forEach(function (name) { $("#v-" + name).style.display = name === v ? "block" : "none"; });
    };
  });

  /* ---------- products table ---------- */
  function renderProducts() {
    var rows = PRODUCTS.map(function (p) {
      var offer = p.offer && p.offer > 0 && p.offer < p.price;
      return "<tr>" +
        "<td>" + (p.image ? '<img src="' + esc(p.image) + '" style="width:34px;height:34px;border-radius:8px;object-fit:cover">' : '<span style="font-size:22px">' + (p.emoji || "🛍️") + "</span>") + "</td>" +
        "<td><b>" + esc(p.name) + "</b><br><small style='color:var(--muted)'>" + esc(p.category) + "</small></td>" +
        "<td>" + money(p.price) + (offer ? "<br><small style='color:var(--emerald)'>Offer " + money(p.offer) + "</small>" : "") + "</td>" +
        "<td>" + (p.newArrival ? "🆕 " : "") + (p.bestSeller ? "⭐" : "") + "</td>" +
        '<td><span class="pill ' + (p.enabled !== false ? "on'>Active" : "off'>Hidden") + "</span></td>" +
        '<td style="white-space:nowrap">' +
          '<button class="btn btn-ghost mini" data-toggle="' + p.id + '">' + (p.enabled !== false ? "Hide" : "Show") + "</button> " +
          '<button class="btn btn-ghost mini" data-edit="' + p.id + '">Edit</button> ' +
          '<button class="btn btn-ghost mini" data-del="' + p.id + '" style="color:#ef4444">Del</button>' +
        "</td></tr>";
    }).join("");
    $("#prodTable").innerHTML = "<tr><th></th><th>Product</th><th>Price</th><th>Flags</th><th>Status</th><th>Actions</th></tr>" + rows;
    $$("[data-edit]").forEach(function (b) { b.onclick = function () { editProduct(b.getAttribute("data-edit")); }; });
    $$("[data-del]").forEach(function (b) { b.onclick = function () { delProduct(b.getAttribute("data-del")); }; });
    $$("[data-toggle]").forEach(function (b) { b.onclick = function () { toggleProduct(b.getAttribute("data-toggle")); }; });
  }
  function find(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
  function persist() { MaizahStore.saveProducts(PRODUCTS); }

  function toggleProduct(id) { var p = find(id); p.enabled = !(p.enabled !== false); persist(); renderProducts(); }
  function delProduct(id) { if (!confirm("Delete this product?")) return; PRODUCTS = PRODUCTS.filter(function (p) { return p.id !== id; }); persist(); renderProducts(); toast("Deleted"); }

  $("#addBtn").onclick = function () { editProduct(null); };
  $("#resetBtn").onclick = function () { if (confirm("Reset to demo products? This replaces your current catalog.")) { PRODUCTS = MaizahStore.resetProducts(); renderProducts(); toast("Demo catalog restored"); } };

  function editProduct(id) {
    var p = id ? find(id) : { id: "", name: "", description: "", category: "", price: "", offer: "", image: "", emoji: "🛍️", newArrival: false, bestSeller: false, rating: 4.5, reviews: 0, enabled: true, offerEndsAt: "" };
    $("#pModalCard").innerHTML =
      '<button class="modal-close" id="pClose">✕</button>' +
      '<div style="padding:22px">' +
        "<h2 style='margin-top:0'>" + (id ? "Edit" : "Add") + " Product</h2>" +
        '<div class="field"><label>Name *</label><input id="e_name" value="' + esc(p.name) + '"></div>' +
        '<div class="field"><label>Description</label><textarea id="e_desc">' + esc(p.description) + "</textarea></div>" +
        '<div class="field"><label>Category</label><input id="e_cat" list="cats" value="' + esc(p.category) + '"><datalist id="cats">' + uniqCats() + "</datalist></div>" +
        '<div class="two"><div class="field"><label>Price *</label><input id="e_price" type="number" value="' + (p.price || "") + '"></div>' +
          '<div class="field"><label>Offer price (0=none)</label><input id="e_offer" type="number" value="' + (p.offer || "") + '"></div></div>' +
        '<div class="field"><label>Image URL (leave blank to use emoji)</label><input id="e_img" value="' + esc(p.image) + '"></div>' +
        '<div class="two"><div class="field"><label>Emoji fallback</label><input id="e_emoji" value="' + esc(p.emoji) + '"></div>' +
          '<div class="field"><label>Offer ends (date/time, optional)</label><input id="e_end" type="datetime-local" value="' + toLocalInput(p.offerEndsAt) + '"></div></div>' +
        '<div class="two"><div class="field"><label>Rating (0-5)</label><input id="e_rating" type="number" step="0.1" value="' + (p.rating || 0) + '"></div>' +
          '<div class="field"><label>Reviews count</label><input id="e_reviews" type="number" value="' + (p.reviews || 0) + '"></div></div>' +
        '<div class="field"><label><input type="checkbox" id="e_new" ' + (p.newArrival ? "checked" : "") + '> New Arrival badge &nbsp;&nbsp; <input type="checkbox" id="e_best" ' + (p.bestSeller ? "checked" : "") + '> Best Seller badge &nbsp;&nbsp; <input type="checkbox" id="e_en" ' + (p.enabled !== false ? "checked" : "") + '> Active</label></div>' +
        '<button class="btn btn-grad btn-block" id="e_save">Save Product</button>' +
      "</div>";
    $("#pModal").classList.add("open");
    $("#pClose").onclick = function () { $("#pModal").classList.remove("open"); };
    $("#e_save").onclick = function () {
      var name = $("#e_name").value.trim(); if (!name) { toast("Name required"); return; }
      var price = parseFloat($("#e_price").value) || 0; if (!price) { toast("Price required"); return; }
      var end = $("#e_end").value ? new Date($("#e_end").value).toISOString() : "";
      var obj = {
        id: p.id || uid(), name: name, description: $("#e_desc").value.trim(),
        category: $("#e_cat").value.trim() || "Other", price: price,
        offer: parseFloat($("#e_offer").value) || 0, image: $("#e_img").value.trim(),
        emoji: $("#e_emoji").value.trim() || "🛍️", offerEndsAt: end,
        rating: parseFloat($("#e_rating").value) || 0, reviews: parseInt($("#e_reviews").value) || 0,
        newArrival: $("#e_new").checked, bestSeller: $("#e_best").checked, enabled: $("#e_en").checked
      };
      if (id) { for (var k in obj) find(id)[k] = obj[k]; } else { PRODUCTS.push(obj); }
      persist(); $("#pModal").classList.remove("open"); renderProducts(); toast("Saved ✓");
    };
  }
  function uniqCats() { var c = {}; PRODUCTS.forEach(function (p) { c[p.category] = 1; }); return Object.keys(c).map(function (x) { return "<option value='" + esc(x) + "'>"; }).join(""); }
  function toLocalInput(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; var off = d.getTimezoneOffset() * 60000; return new Date(d - off).toISOString().slice(0, 16); }

  /* ---------- orders ---------- */
  function renderOrders() {
    var orders = MaizahStore.getOrders();
    if (!orders.length) { $("#orderTable").innerHTML = ""; $("#noOrders").style.display = "block"; return; }
    $("#noOrders").style.display = "none";
    var rows = orders.map(function (o) {
      var items = o.items.map(function (i) { return i.name + " ×" + i.qty; }).join(", ");
      return "<tr><td>" + new Date(o.date).toLocaleString() + "</td><td><b>" + esc(o.name) + "</b><br><small>" + esc(o.phone) + "</small></td>" +
        "<td>" + esc(o.location) + "<br><small style='color:var(--muted)'>" + esc(o.address) + "</small></td>" +
        "<td>" + esc(items) + "</td><td><b>" + money(o.grand) + "</b></td></tr>";
    }).join("");
    $("#orderTable").innerHTML = "<tr><th>Date</th><th>Customer</th><th>Delivery</th><th>Items</th><th>Total</th></tr>" + rows;
  }
  $("#clearOrders").onclick = function () { if (confirm("Clear all saved orders?")) { MaizahStore.saveOrders([]); renderOrders(); } };
  $("#exportBtn").onclick = exportExcel;

  function exportExcel() {
    var orders = MaizahStore.getOrders();
    if (!orders.length) { toast("No orders to export"); return; }
    var headers = ["Order ID", "Date", "Name", "Phone", "Location", "Address", "Landmark", "Items", "Subtotal", "Discount", "Delivery", "Grand Total", "Notes"];
    var rows = orders.map(function (o) {
      return [o.id, new Date(o.date).toLocaleString(), o.name, o.phone, o.location, o.address, o.landmark || "",
        o.items.map(function (i) { return i.name + " x" + i.qty + " = " + money(i.total); }).join(" | "),
        o.subtotal, o.discount, o.delivery, o.grand, o.notes || ""];
    });
    // build an .xls (HTML table) so Excel opens it natively with formatting
    var html = "<table border='1'><tr>" + headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>";
    var blob = new Blob(["﻿<html><head><meta charset='utf-8'></head><body>" + html + "</body></html>"], { type: "application/vnd.ms-excel" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "maizah-orders-" + new Date().toISOString().slice(0, 10) + ".xls"; a.click();
    toast("Exported ⬇");
  }

  /* ---------- settings ---------- */
  function loadSettings() {
    $("#c_brand").value = CFG.brand || ""; $("#c_tagline").value = CFG.tagline || "";
    $("#c_wa").value = CFG.whatsappNumber === "REPLACE_WITH_YOUR_NUMBER" ? "" : CFG.whatsappNumber;
    $("#c_cur").value = CFG.currency || "₹"; $("#c_curc").value = CFG.currencyCode || "INR";
    $("#c_del").value = CFG.deliveryCharge || 0; $("#c_free").value = CFG.freeDeliveryOver || 0;
    $("#c_extra").value = CFG.extraDiscountPct || 0; $("#c_ig").value = CFG.instagram || "";
    $("#c_fb").value = CFG.facebook || ""; $("#c_map").value = CFG.mapLink || "";
    $("#c_qr").value = CFG.paymentQR || ""; $("#c_email").value = CFG.supportEmail || ""; $("#c_phone").value = CFG.supportPhone || "";
  }
  $("#saveCfg").onclick = function () {
    var wa = ($("#c_wa").value || "").replace(/[^0-9]/g, "");
    CFG.brand = $("#c_brand").value.trim() || "mai_z_ah"; CFG.tagline = $("#c_tagline").value.trim();
    CFG.whatsappNumber = wa || "REPLACE_WITH_YOUR_NUMBER";
    CFG.currency = $("#c_cur").value.trim() || "₹"; CFG.currencyCode = $("#c_curc").value.trim() || "INR";
    CFG.deliveryCharge = parseFloat($("#c_del").value) || 0; CFG.freeDeliveryOver = parseFloat($("#c_free").value) || 0;
    CFG.extraDiscountPct = parseFloat($("#c_extra").value) || 0;
    CFG.instagram = $("#c_ig").value.trim(); CFG.facebook = $("#c_fb").value.trim(); CFG.mapLink = $("#c_map").value.trim();
    CFG.paymentQR = $("#c_qr").value.trim(); CFG.supportEmail = $("#c_email").value.trim(); CFG.supportPhone = $("#c_phone").value.trim();
    var pin = $("#c_pin").value.trim(); if (pin) CFG.adminPin = pin;
    MaizahStore.saveConfig(CFG); $("#c_pin").value = "";
    toast("Settings saved ✓" + (wa ? "" : " (set WhatsApp number!)"));
  };
})();
