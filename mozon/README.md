# 🍗 Mozon Broast — Ordering System

A complete, self-hosted ordering + loyalty + reporting system that runs on
**Google Apps Script + Google Sheets** (free) with two simple web pages.

```
mozon/
├── backend/
│   ├── Code.gs           ← the whole backend (paste into Apps Script)
│   └── appsscript.json   ← project settings (timezone, scopes, web app)
├── ordering/
│   └── index.html        ← customer ordering page (host this / Netlify)
└── dashboard/
    └── index.html        ← admin command center (private, for you only)
```

---

## What was fixed / added

| Problem you had | How it's solved |
|---|---|
| **1. Wrong data in sheet & dashboard** | The old page saved the **customer's phone time** as loose text. Now the **server stamps the real Dubai time** on every order and writes a clean `BusinessDay` column, so numbers always line up. |
| **2. Day = 12 PM → 2 AM, report by 2 AM** | A business day is `date(timestamp − 2h)`. A **2 AM trigger** emails the report for the day that just closed. |
| **3. Dashboard must use the 12 PM → 2 AM window** | "Today" KPIs (orders, revenue, customers, discounts) all use the same business-day window. |
| **4. Better offers / coupons** | Coupon types: **percentage, flat AED, free item**, each with an optional **minimum order value**. "Order above X → free Y" is built in. A live **offers panel** on the ordering page shows *running*, *upcoming*, and *happy-hour countdown*. |
| **5. Loyalty + referral** | Customer **ID = their phone number** (auto-normalised to `+9715…`). Points, tiers and benefits show on the order page. Every customer gets a **referral code `MOZ+last4digits`** — friend saves on first order, referrer earns points. |
| **6. User-friendly, no errors** | One backend file, idempotent setup, graceful error handling, clean UTF-8 pages (no more `ð` gibberish). |

---

## Setup (about 10 minutes, one time)

### Step 1 — Install the backend
1. Open your Google Sheet → **Extensions ▸ Apps Script**.
2. Delete everything in `Code.gs`, then paste the full contents of
   **`backend/Code.gs`**.
3. (Optional) Also paste `appsscript.json`: click the ⚙️ **Project Settings**,
   tick *"Show appsscript.json"*, then open it and paste.
4. Check the top `CONFIG` block — the Sheet ID and report email are already
   filled in. Change `REPORT_TO` if you want a different / extra recipient.
5. Click **Save** 💾.

### Step 2 — Run setup once
1. In the function dropdown pick **`setup`** → click **Run**.
2. Approve the permissions (Google will warn "unverified app" — that's your own
   script, click *Advanced ▸ Go to project ▸ Allow*).
3. This creates every tab (`Orders`, `Coupons`, `HappyHours`, `Members`,
   `Referrals`), seeds sensible loyalty/referral defaults, and schedules the
   **2 AM daily report**.

### Step 3 — Deploy the web app
1. **Deploy ▸ New deployment ▸** (gear) **Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**.
3. **Deploy**, then **copy the Web app URL** (ends in `/exec`).

### Step 4 — Connect the two pages
Open both HTML files and paste that `/exec` URL into the line near the top:

- `ordering/index.html` → `var SCRIPT_URL = "…";`
- `dashboard/index.html` → `var API = "…";`

Then host them (any static host works — Netlify, GitHub Pages, Google Sites…):
- **ordering/index.html** → your public link (the one customers open / the
  WhatsApp link).
- **dashboard/index.html** → keep this **private** (bookmark it, don't share).

### Step 5 — Test
- In Apps Script run **`testReportNow`** → you get a report email immediately.
- Open the ordering page, place a test order → it appears in the `Orders` tab
  and on the dashboard within ~60s, with points added to `Members`.

> **Re-deploying after code edits:** *Deploy ▸ Manage deployments ▸ (edit) ▸
> Version: New version ▸ Deploy*. The `/exec` URL stays the same, so you never
> need to touch the HTML again.

---

## Day-to-day use (dashboard)

- **Add a coupon** — code, type, value, optional *min order*. For "spend AED 50,
  get a free Pepsi" choose type **Free item**, Min order `50`, Free item name
  `Pepsi Can`.
- **Happy Hour** — a % discount that auto-applies inside a time window (daily,
  chosen weekdays, or a one-off date).
- **Loyalty** — set points per AED, redeem rate, and edit the tier ladder.
- **Referral** — turn on/off, set what the friend gets and what the referrer
  earns.
- **Customer Targeting** — copy phone numbers of a segment (e.g. "Lapsed" or
  "Lunch crowd") to paste into a WhatsApp broadcast.

Everything you save is **live for customers within a minute** — no re-deploy.

---

## How the numbers work (reference)

- **Business day key**: `date(timestamp − 2 hours)` in Asia/Dubai. An order at
  01:30 counts for the *previous* calendar date. Editable via
  `CONFIG.BIZ_END_HOUR`.
- **Points earned** = `round(order total × pointsPerAed)` per order.
- **Tier** = highest tier whose *min points* the member has reached.
- **Referral** is credited only on a customer's **first** order, can't be used
  on yourself, and logs to the `Referrals` tab.

---

## API (for reference / debugging)

`GET  ?` → dashboard JSON · `?action=getconfig` → coupons/offers/loyalty for the
order page · `?action=member&phone=` → a member's points/tier · `?action=customers`
→ segments · `?action=validateref&code=&phone=` → referral check · `?action=ping`
→ health check.

`POST` (JSON body) → `action:"order"` logs an order; `addCoupon`, `deleteCoupon`,
`saveHappyHour`, `deleteHappyHour`, `saveLoyaltyConfig`, `saveReferralConfig`
manage config.
