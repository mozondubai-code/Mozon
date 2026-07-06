# Renewal / Payment Alert (Google Apps Script)

Sends an email 30, 7, and 3 days before each renewal/payment date, read from
a Google Sheet.

## Setup

1. Create a new Google Sheet (any name).
2. Open **Extensions > Apps Script**.
3. Delete the default `Code.gs` content and paste in this project's
   [`Code.gs`](./Code.gs). Also open **Project Settings > appsscript.json**
   (or the manifest file in the editor) and replace it with
   [`appsscript.json`](./appsscript.json), adjusting `timeZone` to yours.
4. In `Code.gs`, edit the `CONFIG` block at the top if needed:
   - `ALERT_EMAIL`: where alerts are sent (defaults to
     `gasulgachuu@gmail.com`).
   - `ALERT_DAYS`: `[30, 7, 3]` by default.
   - `TRIGGER_HOUR`: hour of day the daily check runs.
5. In the Apps Script editor toolbar, select the function `setupSheet` and
   click **Run**. Approve the Google account permission prompt (it needs
   access to the spreadsheet and to send email as you). This creates a
   `Renewals` sheet tab with the right headers.
6. Select the function `createDailyTrigger` and click **Run** once. This
   installs a time-based trigger that runs `checkRenewals` every day at
   `TRIGGER_HOUR`. You only need to do this once.
7. Fill in the `Renewals` sheet, one row per subscription/payment:

   | Name          | Renewal Date | Amount | Recurrence | Notes         | Last Alert Sent |
   |---------------|--------------|--------|------------|---------------|------------------|
   | Netflix       | 2026-08-05   | $19.99 | Monthly    |               |                  |
   | Domain (Mozon)| 2026-09-01   | $12    | Yearly     | GoDaddy       |                  |
   | Insurance     | 2026-07-20   |        | None       | pay by cheque |                  |

   - `Name` and `Renewal Date` are required; the rest are optional.
   - `Recurrence` (`None` / `Weekly` / `Monthly` / `Yearly`): if set, once a
     renewal date passes, the script automatically rolls it forward to the
     next cycle and re-arms alerts for that row. Leave `None` (or blank) for
     a one-off payment.
   - `Last Alert Sent` is written by the script to avoid sending the same
     30/7/3-day alert twice — don't edit it by hand.

That's it — the sheet is now the only thing you maintain; the script checks
it daily and emails you automatically.

## Why this design

- **Google Sheet as the data store**: no database, no hosting, free, and
  easy to edit from your phone.
- **Single script, single trigger**: one `checkRenewals()` run/day is enough
  — no need for hourly polling since alerts are day-granularity.
- **`Last Alert Sent` column**: guards against duplicate emails if the
  trigger fires more than once on the same day, or if you manually re-run
  `checkRenewals`.
- **Optional recurrence auto-roll**: lets recurring subscriptions
  (monthly/yearly) stay "alive" indefinitely without you re-entering dates
  every cycle, while one-off payments (`Recurrence = None`) simply stop
  alerting after they pass.

## Testing it

- Add a test row with `Renewal Date` set to today + 3 (or +7 / +30) days.
- Run `checkRenewals` manually from the editor (select it, click Run) — you
  should get an email and see `Last Alert Sent` populated on that row.
