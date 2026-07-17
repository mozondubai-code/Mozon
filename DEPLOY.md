# Go Live — Mozon Broast (ServerByt / 20i StackCP)

Your hosting (from the panel): **ServerByt / StackCP**, primary domain **mozonbroast.ae**,
web root **`public_html`**, FTP host **`ftp.us.mozonbroast.ae`**, FTP user **`mozonbroast.ae`**.

There are two ways to publish. **Way A** is fully automatic (your PC's Claude Code does it).
**Way B** is a 4-click manual upload. Both put the same site live.

---

## Way A — Let your local Claude Code deploy it (automatic)

Your Claude Code running on your Windows PC can reach the FTP server (this cloud one can't).
Open Claude Code on your PC **in a folder you choose**, then paste the job in
`deploy/local-claude-prompt.md` (also reproduced below). It will clone this repo and upload the site.

It will need three details you already have in the ServerByt panel
(**Service Overview → FTP Details**, click the eye icon to reveal the password):

- FTP host: `ftp.us.mozonbroast.ae`
- FTP username: `mozonbroast.ae`
- FTP password: *(from the panel — give it to your local Claude, not to the cloud one)*

The script `deploy/deploy-ftp.sh` mirrors `website/` → `/public_html/` and the offers page →
the `offersmozon.ae` web root.

---

## Way B — Manual upload in ServerByt File Manager (≈4 clicks)

**Main site → mozonbroast.ae**
1. Download the ready zip from GitHub: `dist/mozonbroast-site.zip`
   (in the repo → open the file → **Download**).
2. ServerByt panel → **Web Files → File Manager** → open **`public_html`**.
   Delete any existing `index.html`/placeholder first.
3. **Upload** `mozonbroast-site.zip` into `public_html`.
4. Right-click it → **Extract** (extract *here*). Delete the zip after. Done —
   visit https://mozonbroast.ae.

**Offers page → offersmozon.ae**
1. In the panel, make sure the subdomain **offersmozon.ae** exists
   (**Domain / Subdomains** → add it if not; note its web root folder,
   e.g. `public_html/offersmozon.ae`).
2. Download `dist/offersmozon-site.zip`, upload it into that subdomain's web root, **Extract**.
   (It contains `index.html`, which is the offers page.) Done — the **Order** buttons now open it.

> The `.htaccess` in the zip forces HTTPS, gzip and caching. If ServerByt shows an
> "Apache config not supported" note, it's safe to ignore — the site still works; those are optimisations.

---

## After it's live (quick wins)
- **Photos:** drop your JPGs into `public_html/assets/img/` using the names in `website/MARKETING-KIT.md`
  (`hero-broast.jpg`, `gallery-1..4.jpg`, `og-cover.jpg`). They appear instantly, no code edits.
- **SSL:** ensure the free SSL certificate is enabled for both domains (StackCP → SSL/TLS).
- **Search Console:** add `mozonbroast.ae`, submit `https://mozonbroast.ae/sitemap.xml`.
- **Prices/hours:** confirm the real numbers in `website/index.html` before you promote it.
