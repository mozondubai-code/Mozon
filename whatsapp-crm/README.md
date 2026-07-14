# Mozon WhatsApp Business CRM (Google Apps Script)

Turns one Google Sheet into a lightweight WhatsApp CRM for Mozon:

1. **Contact list** — every customer who messages lands in a `Customers` tab.
2. **Customer behaviour** — messages/orders/complaints counted per customer and
   labelled **New / Regular / VIP / At-Risk / Dormant**.
3. **Late-delivery complaints** — auto-detected by keywords and tracked in a
   `Complaints` tab.
4. **Unattended-message alerts** — emails `gasulgachuu@gmail.com` (and optionally
   WhatsApps you) when an incoming message goes **5 minutes** without a reply.

---

## ⚠️ Read this first: what CallMeBot can and can't do

CallMeBot (your API key `2220210`) can **only _send_ WhatsApp messages**
(outbound). It **cannot read incoming messages**. So the two halves of the
system use two different channels:

| Direction | Channel | Used for |
|-----------|---------|----------|
| **Outbound** (script → you/customer) | **CallMeBot** | staff alerts, replies |
| **Inbound** (customer → script) | **a webhook → this script's `/exec` URL** | logging messages, behaviour, complaints, the 5-min rule |

**Because CallMeBot can't receive, the inbound feed must come from one of these
(pick one):**

- **A. WhatsApp Business Cloud API (Meta)** — the proper business option. Point
  its webhook at your `/exec` URL. Gives you real inbound messages automatically.
- **B. Make / Zapier** — a "WhatsApp Business → Webhook (POST)" scenario that
  forwards each incoming message to your `/exec` URL. (You have Make connected.)
- **C. Manual / Google Form** — type rows into the `Messages` tab yourself, or
  wire a Google Form. Zero cost, but not automatic.

The script accepts **all three** payload shapes, so you can start with C today
and upgrade to A/B later without changing the code.

> If you only ever use CallMeBot and never connect an inbound feed, you still get
> outbound alerts, but the customer list / behaviour / 5-min rule stay empty
> because nothing is feeding messages in.

---

## Setup

1. Open your Google Sheet →
   [the Mozon sheet](https://docs.google.com/spreadsheets/d/1hxWAwxYWD7u3EceGgnDcZuCvAgegMJm7NxEU_Unu4kM/edit).
2. **Extensions → Apps Script.** Paste [`Code.gs`](./Code.gs) over the default
   file. Open the manifest (**Project Settings → “Show appsscript.json”**) and
   replace it with [`appsscript.json`](./appsscript.json).
3. Edit the `CONFIG` block at the top of `Code.gs`:
   - `ALERT_EMAIL` — already `gasulgachuu@gmail.com`.
   - `CALLMEBOT_API_KEY` — already `2220210`.
   - `OWNER_WHATSAPP` — **set this** to the number CallMeBot is registered to,
     in full international form (e.g. `+9715XXXXXXXX`), to also get WhatsApp
     alerts. Leave `''` for email-only.
   - `UNATTENDED_MINUTES` — `5` by default.
   - `META_VERIFY_TOKEN` — any secret word; only used for option A.
4. In the editor, select **`setupSheets`** → **Run**, and approve the permission
   prompt. This creates the `Customers`, `Messages`, and `Complaints` tabs.
5. Select **`createTriggers`** → **Run** once. Installs:
   - `checkUnattendedMessages` every minute (the 5-min rule), and
   - `refreshCustomerBehaviours` nightly at 03:00.
6. **Deploy the webhook:** **Deploy → New deployment → Web app**, execute as
   *me*, access *Anyone*. Copy the `/exec` URL — that is your inbound webhook.
   (It matches the App Script URL you already have.)
7. Test it: select **`simulateIncoming`** → **Run**. You should see a row in
   `Messages` (category *Late Delivery*), a customer in `Customers`, and a row
   in `Complaints`. Wait 5 min and the minute-trigger emails you the unattended
   alert. To test CallMeBot outbound, set `OWNER_WHATSAPP` then run
   **`testWhatsApp`**.

---

## Connecting a real inbound feed

### Option A — WhatsApp Business Cloud API (Meta)
1. In Meta’s app dashboard, WhatsApp → Configuration → **Webhook**.
2. Callback URL = your `/exec` URL. Verify token = your `META_VERIFY_TOKEN`.
   Meta calls `doGet` with `hub.challenge`; the script echoes it back.
3. Subscribe to the **messages** field. Incoming messages now POST to `doPost`
   and are logged automatically.

### Option B — Make (you have it connected)
1. New scenario: trigger **WhatsApp Business → Watch messages**.
2. Action **HTTP → Make a request**: `POST` to your `/exec` URL, body type
   *JSON*:
   ```json
   { "phone": "{{sender number}}", "name": "{{sender name}}", "message": "{{text}}" }
   ```
That’s the shape the script expects (`phone` + `message`, optional `name`).

---

## The tabs

**Customers** — one row per phone:
`Phone · Name · First Seen · Last Seen · Total Messages · Total Orders ·
Complaints · Late Deliveries · Behaviour · Notes`.
`Behaviour` is auto-set (VIP ≥ 10 orders, Regular ≥ 3, At-Risk ≥ 2 complaints,
Dormant if silent > 60 days, else New). `Notes` is yours — it’s preserved across
nightly refreshes.

**Messages** — the full log:
`Timestamp · Phone · Name · Direction · Message · Category · Status ·
Attended At · Alerted`.
`Category` = Late Delivery / Complaint / Order / Message / Outbound.
`Status` starts **New** for incoming. A message is “attended” when you change
its Status away from *New*, **or** when a later outbound message to that phone is
logged (auto-detected). Only unattended-past-5-min rows trigger an alert, once
each (`Alerted = Yes`).

**Complaints** — every complaint/late delivery:
`Timestamp · Phone · Name · Type · Order Ref · Details · Status · Resolved At`.
Fill `Order Ref`/`Resolved At` and flip `Status` to *Resolved* as you handle them.

---

## Functions you can run

| Function | What it does |
|----------|--------------|
| `setupSheets` | Create the three tabs (safe to re-run). |
| `createTriggers` | Install the minute + nightly triggers. |
| `checkUnattendedMessages` | The 5-min watcher (also runs on the trigger). |
| `refreshCustomerBehaviours` | Rebuild the Customers tab from the log. |
| `sendWhatsApp(phone, text)` | Send an outbound WhatsApp via CallMeBot. |
| `testWhatsApp` | Send yourself a CallMeBot test message. |
| `simulateIncoming` | Inject a fake “late delivery” message to test end-to-end. |

## Why this design

- **Sheet as the database** — free, editable from your phone, no hosting.
- **Two channels, one script** — CallMeBot for cheap outbound, a webhook for
  inbound, so you’re never locked into one provider.
- **Minute trigger, not hourly** — 5-minute promises need minute granularity.
- **Idempotent + self-healing** — every setup function is safe to re-run, and
  `refreshCustomerBehaviours` can rebuild the whole customer view from the log.
