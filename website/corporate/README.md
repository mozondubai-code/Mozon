# Mozon Broast — Corporate Ordering + Office Loyalty Program

You visited offices & factories, offered a trial run, and collected the in-charge
names + mobile numbers. This system turns that list into repeat business:

- **Ordering page** → `https://mozonbroast.ae/corporate/` — full menu, tap to
  order, order lands in your WhatsApp (+971 52 487 7701), logged to Google Sheets.
- **Loyalty program** → each office in-charge gets a personal **Office Code**
  (e.g. `ALFA01`) and a personal link. Every AED 1 their office orders = 1 point
  for them. You see the leaderboard live in the `🏆 Loyalty Points` tab.

**Why it works:** the in-charge is your salesperson inside the company. Points go
to *them* personally, so they push everyone in the office to order through their
link.

---

## Setup (one time, ~10 minutes)

### 1. Upgrade the Google Apps Script
1. Open your existing orders Google Sheet → **Extensions → Apps Script**.
2. Select all the old code, paste the whole of `apps-script-loyalty.gs` instead.
3. Put your Sheet ID into `SHEET_ID` at the top (same ID as before).
4. **Deploy → Manage deployments → ✏️ edit → Version: “New version” → Deploy.**
   ⚠️ Without choosing *New version*, the old code keeps running and no points
   will be recorded. The web-app URL does **not** change.
5. Test: open the `/exec` URL in a browser — it must say
   `Mozon Broast Order API v2 (loyalty) is running!`

The upgrade is **additive**: your existing `📋 Orders` rows are untouched; two
columns (`Office Code`, `Points`) and two tabs (`👥 Loyalty Members`,
`🏆 Loyalty Points`) are added.

### 2. Register the contacts you collected
Open the `👥 Loyalty Members` tab and add one row per in-charge:

| Office Code | Company / Factory | In-Charge Name | Mobile | Joined | Notes |
|---|---|---|---|---|---|
| ALFA01 | Al Falah Factory | (name you collected) | 9715xxxxxxx | 2026-09-05 | trial offered |

Code rules: short, unique, capital letters + numbers (e.g. first 4 letters of the
company + 01). Mobile in `9715…` format.

### 3. Upload the page
Upload `index.html` into a `corporate/` folder inside `public_html` on ServerByt
(File Manager → create folder `corporate` → upload). The page is then live at
`https://mozonbroast.ae/corporate/`.

### 4. Send each in-charge their personal link
Their link is: `https://mozonbroast.ae/corporate/?ref=THEIRCODE`

The page remembers the code on their phone, shows a gold banner, and every order
credits their points automatically — even colleagues using the shared link earn
points for the in-charge because the code is pre-filled.

---

## WhatsApp message to send your collected contacts

> السلام عليكم! 🍗 This is **Mozon Broast** — thank you for meeting us at your
> office. As promised, here is your company's private ordering link:
>
> 👉 https://mozonbroast.ae/corporate/?ref=**CODE**
>
> ✅ Full menu, order in 1 minute, delivered hot to your office
> 🎁 First corporate order: **10% OFF** with code **CORP10**
> 🏆 And for **you**: every AED 1 your office orders = **1 loyalty point**
> credited to you personally. We track it automatically — just share the link
> with your colleagues.
>
> Reply here to book your free trial sample run! 🚚

Replace **CODE** with that person's Office Code before sending.

---

## Running the program

- **See points:** `🏆 Loyalty Points` tab — auto-sorted leaderboard, updates on
  every order (and every 15 min if you enabled the `autoRefresh` trigger).
- **Redeem points:** agree the reward with the in-charge on WhatsApp, then type
  the redeemed amount in the **Points Redeemed** column. The balance column
  updates on the next refresh (or run `manualRefresh` in Apps Script).
- **Reward values:** the earn rate is 1 pt / AED. What points are worth
  (e.g. free Value Meal at X pts) is **your business decision** — decide it and
  tell customers on WhatsApp; nothing on the page promises a specific reward.
- **New office signs up:** they WhatsApp you "LOYALTY" (there's a button on the
  page) → you add a row in `👥 Loyalty Members` → send them their link. 1 minute.

## Rollback (under 5 minutes)

- **Page:** delete the `corporate/` folder in File Manager — main site untouched.
- **Script:** Apps Script → Deploy → Manage deployments → ✏️ → pick the previous
  version → Deploy. Old behaviour restored, no data lost.
- Orders always reach WhatsApp even if the Sheet/script is completely down — the
  logging is fire-and-forget and never blocks the order button.
