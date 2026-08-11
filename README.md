# Mozon

> One repository for everything digital at **Mozon Broast** (Al Nahda 2, Deira, Dubai): the
> public websites, the UAE recharge-machine map, back-office automation, and the deployment
> tooling that puts it all live.

## What's in this repo

| Directory | Project | Tech | Where it runs |
| --- | --- | --- | --- |
| [`website/`](website/) | Mozon Broast landing site + offers page | Static HTML/CSS/JS | `mozonbroast.ae` and `offersmozon.ae` (ServerByt / 20i StackCP shared hosting) |
| [`uae-recharge-map/`](uae-recharge-map/) | Mozon GIS — UAE recharge-machine map | Static HTML/JS, Leaflet (vendored) | Netlify (or any static host) |
| [`renewal-alerts/`](renewal-alerts/) | Renewal / payment email alerts | Google Apps Script + Google Sheet | The business Google account (time-based trigger) |
| [`deploy/`](deploy/) | FTP deploy script + local Claude Code prompt | Bash (`lftp`) | Run from your own machine |
| [`dist/`](dist/) | Pre-built zips of the two sites | — | Manual upload fallback |
| [`DEPLOY.md`](DEPLOY.md) | Go-live guide for the hosting account | — | Read before publishing |

Each project directory has its own README with full setup and deployment instructions. This
page is the map; the per-project READMEs are the territory.

## The projects at a glance

### `website/` — Mozon Broast landing site

A fast, self-contained, SEO/GEO-optimised landing site built to win local "broast near me"
searches. No build step, no framework — plain HTML, one stylesheet, one script.

- `index.html` is the main site (deployed to `mozonbroast.ae`).
- `offers.html` is the offers page (deployed as `index.html` on `offersmozon.ae`); the order
  buttons on the main site open it via the single `OFFERS_URL` constant in `assets/js/main.js`.
- `.htaccess`, `sitemap.xml`, `robots.txt`, and `site.webmanifest` handle HTTPS, caching,
  crawling, and PWA metadata.
- `MARKETING-KIT.md` collects the launch checklist and links to the Canva design assets.

The business facts baked into the pages (name, address, phone) are real and must stay
consistent — see the warning about NAP consistency in `website/README.md` before editing them.

### `uae-recharge-map/` — Mozon GIS

A single-page Leaflet map of recharge machines (du, Etisalat, Salik, Nol, DEWA, …) across the
UAE, with area search, distance sorting, filters, and marker clustering.

- Machine, area, and place data lives in `data.js` — the only file you normally edit.
- For large datasets, machines can also be loaded from a live Google Sheet (published CSV);
  the `?sheet=` parameter is restricted to Google hosts, and external data is escaped before
  rendering.
- Leaflet and the marker-cluster plugin are vendored in `vendor/`, so the app has no npm
  dependencies; only the map tiles need internet.

### `renewal-alerts/` — payment reminder emails

A Google Apps Script bound to a Google Sheet that emails the team 30, 7, and 3 days before
each renewal or payment date (tenancy, trade license, Emirates ID, subscriptions, …).
Setup is copy-paste: create a sheet, paste in `Code.gs` and `appsscript.json`, run the
one-time setup functions, and a daily trigger takes over. Recipients and alert windows are
configured in the `CONFIG` block at the top of `Code.gs`.

### Deployment

Hosting for the websites is ServerByt / 20i StackCP (details, FTP host, and the nameserver
gotcha are documented in [`DEPLOY.md`](DEPLOY.md)). Two ways to publish:

1. **Scripted** — `deploy/deploy-ftp.sh` mirrors `website/` to the live web root over FTP
   using `lftp`. Credentials are passed as environment variables and are never stored in the
   repo; reveal the FTP password in the hosting panel only on the machine doing the upload.
   `deploy/local-claude-prompt.md` is a ready-made prompt for running the deploy through
   Claude Code on your own PC.
2. **Manual** — upload the zips in `dist/` through the hosting File Manager (4 clicks;
   walkthrough in `DEPLOY.md`).

The recharge map deploys separately to Netlify via `uae-recharge-map/netlify.toml`.

## Conventions

- **No build tooling.** Every project here is deliberately dependency-free static files or
  Apps Script — edit, then deploy. There is nothing to `npm install`.
- **No secrets in the repo.** FTP passwords and API keys live in the hosting panel or your
  shell environment, never in committed files.
- **Branches.** Work happens on `claude/*` feature branches and lands on the default branch
  via pull requests.
