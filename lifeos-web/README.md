# Life OS — Personal Web App

A single-page personal command center for Gazul (Al Nahda 2, Dubai). Tracks:

- **Dashboard** — shop & personal balances, credit pending, today's committed tasks, overdue items, upcoming reminders
- **Tasks** — daily to-dos with priority, due dates, and a *Commit* flag (what you'll do today), plus a Pending/Overdue view
- **Accounts** — Shop and Personal cash/bank ledgers (Income/Expense) with live balances and a **Bank → Cash** pairing helper
- **Credit Ledger** — money given/taken per person, with Pending / Paid tracking
- **Reminders** — bills, documents, renewals with due dates, lead-day alerts and recurrence
- **Ideas** — quick capture for business notes

All data lives in your browser (**localStorage**) — nothing is sent to any server. Use **Export / Import** (sidebar) to back up or move data between devices.

Everything follows the Life OS v3 spec: AED currency, Dubai timezone, a 6 AM business-day cutoff, and the `T/SF/PF/C/R/I` ID conventions.

---

## Run locally

Just open `index.html` in a browser — no build step, no dependencies.

Or serve it:

```bash
cd lifeos-web
python3 -m http.server 8000   # then open http://localhost:8000
```

---

## Deploy to Netlify

Pick **one** of these:

### Option A — Drag & drop (fastest)
1. Go to <https://app.netlify.com/drop>
2. Drag the **`lifeos-web` folder** onto the page.
3. Done — Netlify gives you a live URL (rename it under *Site settings → Change site name*).

### Option B — Connect the Git repo (auto-deploys on every push)
1. In Netlify: **Add new site → Import an existing project → GitHub**.
2. Select this repository.
3. Set **Base directory** to `lifeos-web` and leave the build command empty (**Publish directory** `lifeos-web`). The included `netlify.toml` handles the rest.
4. Deploy. Every push to the branch redeploys the site.

### Option C — Netlify CLI
```bash
npm install -g netlify-cli
cd lifeos-web
netlify deploy --prod
```

---

## Notes

- Because data is stored per-browser, each device keeps its own copy. Use **Export** to make a JSON backup and **Import** on another device to sync.
- First load seeds a bit of sample data (the 13 Jul salary run, rent reminder, etc.). Delete those entries or Import your own backup to clear them.
- The Google Apps Script / WhatsApp nudge layer from the v3 spec is a separate automation (see `../renewal-alerts`). This web app is the front-end for viewing and entering data; it does not send WhatsApp/email.
