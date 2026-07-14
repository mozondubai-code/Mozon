# Mozon WhatsApp — Simple Manual Broadcast

No API, no automation. You keep a customer list in a Google Sheet and send
broadcasts **by hand through WhatsApp Web**. The script only does one clever
thing: it makes a **click-to-send link** for each customer with your message
already typed in. You click, WhatsApp opens, you press send.

## What you get

- **Customers** tab — your contact list (Phone, Name, Group, Orders,
  Complaints, Late Deliveries, Last Contacted, Notes). You fill it in by hand.
- **Broadcast** tab — type one message, optionally pick a Group.
- A **📣 Mozon WhatsApp** menu in the sheet with three buttons.

## Setup (once)

1. Open your Google Sheet →
   [the Mozon sheet](https://docs.google.com/spreadsheets/d/1hxWAwxYWD7u3EceGgnDcZuCvAgegMJm7NxEU_Unu4kM/edit).
2. **Extensions → Apps Script.** Paste [`Code.gs`](./Code.gs) over the default
   file and **Save** (💾).
3. Close the editor and **reload the sheet**. A **📣 Mozon WhatsApp** menu
   appears at the top.
4. Click **📣 Mozon WhatsApp → 1. Set up sheets** and approve the one-time
   permission prompt. This creates the `Customers` and `Broadcast` tabs (with
   one example row you can delete).

## Everyday use — sending a broadcast

1. In **Customers**, add a row per customer. **Phone must be full
   international format**, e.g. `+9715XXXXXXXX` (spaces/dashes are fine — the
   script cleans them). `Group` is optional (e.g. `VIP`, `Delivery`).
2. Go to the **Broadcast** tab. In **A2**, type your message. Use **`{name}`**
   anywhere to drop in the customer's name, e.g.
   `Hello {name}, Mozon's Friday offer: 2 shawarma for AED 15 🌯`.
3. (Optional) In **B4**, type a Group name to send only to that group. Leave it
   blank to include everyone.
4. Click **📣 Mozon WhatsApp → 2. Generate send links**.
5. Back in **Customers**, a **“▶ Send to …”** link now sits in the **Send**
   column for each customer. **Click one** → WhatsApp Web (or your phone app)
   opens that chat with the message already typed → press **send**. Repeat down
   the list.
6. Select the rows you sent to and click
   **📣 Mozon WhatsApp → 3. Mark selected rows as contacted** to stamp today's
   date in *Last Contacted*.

> **You must be logged into [WhatsApp Web](https://web.whatsapp.com)** (or have
> WhatsApp on the phone) for the links to open a chat. Nothing sends by itself —
> you always press send, so you stay in full control.

## Tracking customers & complaints (manual)

Just type into the Customers columns as things happen:
- `Orders` — bump the number when they order.
- `Complaints` / `Late Deliveries` — bump when one happens; use `Notes` for
  detail. Sort or filter the sheet by these columns any time to see who's a
  VIP or who's unhappy.
- `Group` lets you target broadcasts (VIP offers, apology to late-delivery
  customers, etc.).

## Menu reference

| Menu item | What it does |
|-----------|--------------|
| **1. Set up sheets** | Create the `Customers` + `Broadcast` tabs. |
| **2. Generate send links** | Build a click-to-send WhatsApp link per customer. |
| **3. Mark selected rows as contacted** | Stamp today's date on selected rows. |
| **Clear send links** | Empty the Send column. |

## Notes

- **Send-only, one click each.** WhatsApp doesn't allow true bulk auto-send from
  a sheet (and doing so gets numbers banned). Click-to-send is the safe manual
  way and works with a brand-new customer who hasn't saved your number.
- Want a real one-to-many blast instead? WhatsApp's own **Broadcast Lists**
  (in the app: *New broadcast*) send one message to many saved contacts — use
  this sheet to keep the master list, then recreate the broadcast list in the
  app. The click-links here don't need contacts to save your number, which is
  why they're the default.
