# How to Connect Your Business WhatsApp — Study & Details

This is the "how it actually works" guide for wiring **Mozon's Business
WhatsApp** into the CRM script (`Code.gs`). Read this once end-to-end before you
start — it explains **why** each step exists, not just the clicks.

---

## 1. The one fact that decides everything

WhatsApp does **not** let a normal app read your chats. There are only two legal
ways for software to receive WhatsApp messages:

| Path | Who it's for | Can it **receive** messages? | Cost |
|------|--------------|------------------------------|------|
| **CallMeBot** (your key `2220210`) | Sending yourself alerts | ❌ **No — send only** | Free |
| **WhatsApp Business Platform / Cloud API** (Meta) | Real businesses | ✅ **Yes** | Free to receive; small fee to send templates |

So the plan is:
- **Receiving** customer messages (contact list, behaviour, complaints, the
  5-minute rule) → **WhatsApp Cloud API (Meta)**.
- **Sending** you staff alerts → **CallMeBot** (already done) or Cloud API.

Everything below is about setting up the **Cloud API** so real customer messages
flow into your Google Sheet.

---

## 2. What you need before you start

1. **A phone number for the business** that is **NOT currently active in the
   normal WhatsApp / WhatsApp Business app.** Meta takes the number over.
   - ✅ Best: a fresh SIM or a landline you can receive one SMS/call on.
   - ⚠️ If your current Mozon number is already on the WhatsApp *app*, you must
     first **delete that WhatsApp account** (Settings → Account → Delete) before
     Meta can register it on the API. Warn staff — old chats are lost.
2. **A Facebook account** (personal login — it's only the door in).
3. **A Meta Business Account** → create/verify at
   [business.facebook.com](https://business.facebook.com).
4. **The CRM already installed** in your Google Sheet with the web app deployed
   (see `README.md` steps 1–6). You'll need your **`/exec` webhook URL** and
   your **verify token** (`META_VERIFY_TOKEN`, default `mozon-verify`).

---

## 3. Step-by-step: connect Business WhatsApp (Meta Cloud API)

### Step A — Create the developer app
1. Go to [developers.facebook.com](https://developers.facebook.com) → log in →
   **My Apps → Create App**.
2. Use case: choose **Other → Business**. Name it e.g. `Mozon WhatsApp`.
3. Link it to your **Meta Business Account** from step 2.

### Step B — Add WhatsApp
1. In the app dashboard, find **WhatsApp** → **Set up**.
2. Meta gives you a free **test number** and a **temporary token (24h)** so you
   can try things immediately. Note two IDs shown here:
   - **Phone number ID**
   - **WhatsApp Business Account ID (WABA ID)**

### Step C — Point the webhook at your Google Sheet  ← the key link
1. In **WhatsApp → Configuration → Webhook**, click **Edit**.
2. **Callback URL** = your Apps Script **`/exec`** URL
   (the one ending in `/exec` from your web-app deployment).
3. **Verify token** = exactly your `META_VERIFY_TOKEN` (default `mozon-verify`).
4. Click **Verify and save**. Behind the scenes Meta calls your script's
   `doGet` with a challenge; the script echoes it back and the webhook turns
   green. *(This is already coded — you don't touch anything.)*
5. Under **Webhook fields**, click **Manage** and **Subscribe** to **`messages`**.

That's the connection. From now on, every message a customer sends **POSTs to
your script**, which logs it, updates the customer, and (for late/complaint
words) opens a complaint — automatically.

### Step D — Add your real number (go live)
1. **WhatsApp → API Setup → Add phone number.** Enter the business number,
   receive the SMS/call code, verify.
2. Set the **display name** (shows as the business name in chats) — Meta reviews
   this; use "Mozon" / "Mozon Restaurant".

### Step E — Make it permanent (so it doesn't die after 24h)
The test token expires in 24 hours. For a token that lasts:
1. **business.facebook.com → Settings → Users → System users → Add** →
   create an *Admin* system user (e.g. `mozon-bot`).
2. **Assign assets** → your WhatsApp app / WABA → give full control.
3. **Generate new token** → select the app → permissions
   **`whatsapp_business_messaging`** + **`whatsapp_business_management`** →
   generate. Copy this token somewhere safe — it's the permanent one.

*(You only need this token if you also want the script to **send** WhatsApp
replies via Cloud API. For just **receiving** + emailing alerts, the webhook
from Step C is enough and you can keep using CallMeBot for outbound.)*

---

## 4. What it costs

- **Receiving customer messages: free.** Customer-initiated service
  conversations have no per-message Meta fee.
- **Sending messages:** free inside the 24-hour window after a customer writes
  to you. Sending **template** messages outside that window (marketing,
  reminders) has a small per-message fee that varies by country. Check the live
  rates on Meta's "WhatsApp pricing" page — they change periodically.
- **The Cloud API itself and hosting on Google Sheets: free.**

For Mozon's use (customers message you, you get alerted, staff reply within the
window) you'll essentially pay nothing.

---

## 5. Don't want the Meta setup? Two shortcuts

1. **Use Make (you have it connected).** Some WhatsApp providers plug into Make;
   a *WhatsApp → Webhook (POST)* scenario forwards each message to your `/exec`
   URL in the simple `{phone, name, message}` shape the script already accepts.
   Less control, faster to start.
2. **Use a BSP (Business Solution Provider)** like 360dialog, Wati, or Twilio.
   They resell the same Cloud API with an easier dashboard and can POST a
   webhook to your `/exec` URL. Costs a monthly fee but skips the Meta app work.

All three feed the **same** script — you can switch later without changing code.

---

## 6. About Instagram

Instagram DMs run on the **same Meta platform**. If you later want Instagram
messages in the same sheet:
1. Convert the Instagram account to a **Professional/Business** account and link
   it to a **Facebook Page**.
2. In the same developer app, add the **Instagram / Messenger** product and
   subscribe its webhook to the same `/exec` URL.
3. The script's `doPost` would need a small addition to parse Instagram's
   payload shape (it currently handles WhatsApp + simple JSON). Ask and I'll add
   it when you're ready — the plumbing (sheet, alerts, behaviour) is already
   shared.

> Note: automated **scraping** of Instagram/WhatsApp (logging in as you and
> reading the web/app) violates Meta's terms and gets numbers banned. The
> official API above is the safe, permanent route — that's why this guide uses it.

---

## 7. Quick checklist

- [ ] Business number freed from the normal WhatsApp app
- [ ] Meta Business Account created & (ideally) verified
- [ ] Developer app created, WhatsApp product added
- [ ] CRM web app deployed; `/exec` URL copied
- [ ] Webhook callback = `/exec` URL, verify token matches, **verified green**
- [ ] Subscribed to the **messages** field
- [ ] Real number added & display name approved
- [ ] Permanent token created (only if sending via Cloud API)
- [ ] Sent a test message from another phone → row appears in **Messages** tab ✅
