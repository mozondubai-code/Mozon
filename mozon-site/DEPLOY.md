# 🚀 Mozon Broast — Go Live on mozonbroast.ae

Your site now serves **everything from your own domain** — customers order on
`mozonbroast.ae` directly. No third-party website, no login, **no access grant**
from the customer. (Orders quietly save to your Google Sheet in the background —
the customer never sees or approves anything.)

## What's in this folder (upload ALL of it)
```
index.html          ← the website (home)
order.html          ← the ordering page (Order buttons open this)
robots.txt
sitemap.xml
.htaccess           ← HTTPS + gzip + caching (cPanel/Apache)
site.webmanifest
MENU.md             ← your menu reference
assets/             ← drop favicon + icons here
```

---

## OPTION A — cPanel hosting (ServerByt, mozonbroast.ae)  ✅ recommended (you already have it)

1. Log in to **cp.serverbyt.net** → **File Manager**.
2. Open **public_html** (delete any default `index.html`/placeholder inside).
3. Upload **every file** from this `mozon-site` folder into `public_html`
   (including the hidden `.htaccess` — enable "Show hidden files" in File Manager).
4. Visit **https://mozonbroast.ae** — the site is live.
5. In cPanel, run **SSL/TLS Status → Run AutoSSL** so the padlock (HTTPS) is valid.

> Tip: to upload fast, zip this folder, upload the zip, then **Extract** it in
> File Manager inside `public_html`.

## OPTION B — Netlify (if your domain points to Netlify instead)
1. Netlify → **Add new site → Deploy manually** → drag this whole folder in.
2. **Domain settings → Add custom domain → mozonbroast.ae** (you said it's linked).
3. Netlify issues HTTPS automatically. Done.

> Use ONE host, not both. Whichever your domain's DNS points to is the live one.

---

## ✅ FINAL CHECK (do these once after upload)

Website
- [ ] `https://mozonbroast.ae` loads, padlock shows (HTTPS)
- [ ] Language switch EN / ع / हि works; Arabic flips to right-to-left
- [ ] Food photos appear → if blank, set each Drive photo folder to
      **Share → Anyone with the link → Viewer**
- [ ] Tap **Order Now** → it opens `order.html` on your own domain (not netlify)

Ordering (end-to-end)
- [ ] On `order.html`, add items, enter name + phone, tap **Order on WhatsApp**
- [ ] The order opens in WhatsApp (customer just presses send)
- [ ] Within ~60s the order appears in your Google Sheet **Orders** tab
- [ ] Points appear in the **Members** tab for that phone number

Admin + report
- [ ] Your private **admin dashboard** shows today's order (business day 12 PM–2 AM)
- [ ] Apps Script `testReportNow` sends the report email

SEO (after go-live)
- [ ] Google Search Console → add `mozonbroast.ae` → submit `sitemap.xml`
- [ ] Confirm your Google Business Profile NAP matches the site exactly

---

## Still to send me (I'll slot them in — currently `[PLACEHOLDER]`)
- Talabat / Keeta / Noon Food links
- Branch addresses + phones (Saudi ×~12, India ×3, Ras Al Khaimah)
- Logo file + favicon/icons for `/assets`

## Optional hardening (say the word)
Right now fonts, the AOS animation library and photos load from Google/CDN.
If you want **zero external calls** (fully self-contained), I can inline the
animation library, self-host the fonts, and bake compressed local copies of the
photos into `/assets`.
