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

## Daily reports (Email + WhatsApp) — Google Apps Script backend

The web app is the front-end. The **`apps-script/`** folder is the backend that
sends your 3 daily reports and lets the web app push data into your Google
Sheet. It is pre-filled with your details:

| Setting | Value |
|---|---|
| Google Sheet | `1Lrt5KpV2UkiFaVzQCt9l_1QCr7TKfhM6WcEuRUnG7BE` |
| Email | `gasulgachuu@gmail.com` |
| WhatsApp | `971543963100` via CallMeBot key `2220210` |
| Reports (Asia/Dubai) | 12:00 PM · 7:00 PM · 2:00 AM |
| Webhook secret | `gazul-lifeos-Kx7q-2026` |

### Drop-and-paste setup (once)

1. Open your Apps Script project (the one behind your `…/exec` URL) →
   **Extensions ▸ Apps Script**, or open the script from the Sheet.
2. Delete everything in `Code.gs` and **paste `apps-script/Code.gs`**.
3. **Project Settings** (gear) → tick *“Show appsscript.json manifest”* →
   open `appsscript.json` in the editor → paste `apps-script/appsscript.json`.
4. In the toolbar pick the function **`buildSheet`** → **Run**. Approve the
   Google permission prompt (Sheet, Gmail, external requests). This creates all
   8 tabs with dropdowns.
5. Pick **`createTriggers`** → **Run**. Installs the 12 PM / 7 PM / 2 AM timers.
6. Pick **`sendTestReport`** → **Run** to get an instant email + WhatsApp so you
   know it works. *(WhatsApp first-time: send `I allow callmebot to send me
   messages` to the CallMeBot number from `971543963100` if you haven't yet.)*
7. **Deploy ▸ Manage deployments** → edit → make sure it's a **Web app**,
   *Execute as: Me*, *Who has access: Anyone*. Copy the `…/exec` URL.

### Connect the web app to the Sheet

1. In the web app, click **☁ Google Sheet** (sidebar).
2. Paste the `…/exec` URL and the secret `gazul-lifeos-Kx7q-2026`.
3. **Test** → should say *Connected*. **Push all to Sheet** sends your data up.

After that, everything you enter in the web app → **Push** → lands in the Sheet,
and the three daily reports read from that Sheet. You can also update rows in
the Sheet directly, or let the AI assistant post to the webhook.

---

## Notes

- Because web-app data is stored per-browser, each device keeps its own copy.
  Use **Push to Sheet** (or **Export/Import** JSON) to move data between devices.
- First load seeds a bit of sample data (the 13 Jul salary run, rent reminder,
  etc.). Delete those or Import your own backup to clear them.
- **Push** replaces the Sheet's data rows with the web app's current data (the
  web app is the source of truth). Keep entry in one place to avoid clobbering.
- The older `../renewal-alerts` script (renewal emails) is separate and still
  works on its own; this new backend supersedes it for the full Life OS.
