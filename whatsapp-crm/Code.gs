/**
 * Mozon WhatsApp Business CRM (Google Apps Script)
 * =================================================
 *
 * A single Google Sheet becomes a lightweight WhatsApp CRM for the Mozon
 * restaurant/cafeteria. It:
 *
 *   1. Keeps a CONTACT LIST of every customer who messages you (Customers tab).
 *   2. Logs every message in and out (Messages tab) and IDENTIFIES CUSTOMER
 *      BEHAVIOUR (new / regular / VIP / at-risk, order & complaint counts).
 *   3. Tracks LATE-DELIVERY COMPLAINTS automatically (keyword detection) and in
 *      a dedicated Complaints tab.
 *   4. NOTIFIES YOU BY EMAIL (and optionally WhatsApp) when an incoming message
 *      has NOT been attended within 5 minutes.
 *
 * ------------------------------------------------------------------------
 * HOW MESSAGES GET IN AND OUT
 * ------------------------------------------------------------------------
 * WhatsApp has two halves and they use two different channels here:
 *
 *   OUTBOUND (script -> customer/you):  CallMeBot.
 *       CallMeBot can ONLY SEND WhatsApp messages. It is used for alerts.
 *
 *   INBOUND (customer -> script):       a webhook posts to this script's
 *       /exec URL (doPost). CallMeBot CANNOT read incoming messages, so the
 *       inbound feed must come from one of:
 *         - WhatsApp Business Cloud API (Meta)  -> point its webhook here, OR
 *         - Make / Zapier "WhatsApp -> Webhook" -> POST here, OR
 *         - manual entry / a Google Form         -> write rows in Messages.
 *       See README.md for wiring. The script accepts all three shapes.
 *
 * Every function is safe to run more than once.
 */

// ============================== CONFIG ==============================
const CONFIG = {
  // --- Email alerts ---
  ALERT_EMAIL: 'gasulgachuu@gmail.com',

  // --- WhatsApp OUTBOUND via CallMeBot (send-only) ---
  CALLMEBOT_API_KEY: '2220210',
  // Where CallMeBot should send the staff alert. MUST be the number you
  // registered with CallMeBot, in full international format, e.g. '+9715XXXXXXXX'.
  // Leave '' to disable WhatsApp alerts and use email only.
  OWNER_WHATSAPP: '',

  // --- Unattended-message rule ---
  UNATTENDED_MINUTES: 5, // alert if an incoming message is not attended in N minutes

  // --- WhatsApp Business Cloud API (Meta) webhook verification ---
  // Only needed if you connect Meta's Cloud API directly (doGet challenge).
  META_VERIFY_TOKEN: 'mozon-verify',

  // --- Behaviour thresholds (used to label customers) ---
  VIP_MIN_ORDERS: 10,       // >= this many orders => "VIP"
  REGULAR_MIN_ORDERS: 3,    // >= this many orders => "Regular"
  AT_RISK_MIN_COMPLAINTS: 2 // >= this many complaints => "At-Risk"
};

const SHEETS = {
  CUSTOMERS: 'Customers',
  MESSAGES: 'Messages',
  COMPLAINTS: 'Complaints'
};

const CUSTOMER_COLS = [
  'Phone', 'Name', 'First Seen', 'Last Seen', 'Total Messages',
  'Total Orders', 'Complaints', 'Late Deliveries', 'Behaviour', 'Notes'
];

const MESSAGE_COLS = [
  'Timestamp', 'Phone', 'Name', 'Direction', 'Message',
  'Category', 'Status', 'Attended At', 'Alerted'
];

const COMPLAINT_COLS = [
  'Timestamp', 'Phone', 'Name', 'Type', 'Order Ref',
  'Details', 'Status', 'Resolved At'
];

// Keywords that mark a message as a LATE-DELIVERY complaint (EN + basic AR).
const LATE_KEYWORDS = [
  'late', 'delay', 'delayed', 'still waiting', 'not arrived', 'not delivered',
  'where is my order', 'where is my food', 'took too long', 'too long',
  'still not here', 'no delivery', 'مطعم متأخر', 'متأخر', 'تأخير', 'وين طلبي',
  'ما وصل', 'لم يصل', 'الطلب متأخر'
];

// Broader complaint keywords (any complaint, not only late delivery).
const COMPLAINT_KEYWORDS = LATE_KEYWORDS.concat([
  'complaint', 'complain', 'bad', 'cold food', 'wrong order', 'missing',
  'refund', 'terrible', 'disgusting', 'rude', 'شكوى', 'سيء', 'بارد', 'خطأ'
]);

// Keywords that suggest the message is placing / confirming an ORDER.
const ORDER_KEYWORDS = [
  'order', 'delivery', 'deliver', 'i want', 'i would like', 'send me',
  'menu', 'meal', 'اطلب', 'طلب', 'توصيل', 'قائمة'
];

// ============================== SETUP ==============================

/**
 * One-time setup: creates the three tabs with headers if missing.
 * Safe to re-run; never wipes existing data.
 */
function setupSheets() {
  ensureSheet(SHEETS.CUSTOMERS, CUSTOMER_COLS);
  ensureSheet(SHEETS.MESSAGES, MESSAGE_COLS);
  ensureSheet(SHEETS.COMPLAINTS, COMPLAINT_COLS);
}

function ensureSheet(name, cols) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, cols.length);
  }
  return sheet;
}

/**
 * One-time setup: installs the trigger that watches for unattended messages.
 * Runs every minute so the 5-minute rule is accurate. Run once from the editor.
 */
function createTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'checkUnattendedMessages')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('checkUnattendedMessages')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Nightly behaviour recompute keeps the Customers tab tidy.
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'refreshCustomerBehaviours')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('refreshCustomerBehaviours')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
}

// ============================== WEBHOOK (INBOUND) ==============================

/**
 * GET handler. Two jobs:
 *   - Meta Cloud API webhook verification (hub.challenge handshake).
 *   - A plain health check when opened in a browser.
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] === CONFIG.META_VERIFY_TOKEN) {
    return ContentService.createTextOutput(p['hub.challenge'] || '');
  }
  return ContentService.createTextOutput('Mozon WhatsApp CRM is running.');
}

/**
 * POST handler: the inbound message webhook. Accepts three payload shapes
 * (Meta Cloud API, or a simple {phone,name,message,...} JSON, or a form post)
 * and records each incoming message. Always returns 200 quickly so the
 * upstream provider does not retry.
 */
function doPost(e) {
  try {
    const events = parseIncoming(e);
    events.forEach(ev => recordIncoming(ev.phone, ev.name, ev.message, ev.timestamp));
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, received: events.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('doPost error: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Normalises the various inbound payloads into a list of
 * {phone, name, message, timestamp} objects.
 */
function parseIncoming(e) {
  const out = [];
  let body = {};
  if (e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch (ignore) { body = {}; }
  }
  const params = (e && e.parameter) || {};

  // Shape A: Meta WhatsApp Business Cloud API.
  if (body && body.entry && Array.isArray(body.entry)) {
    body.entry.forEach(entry => {
      (entry.changes || []).forEach(change => {
        const value = (change && change.value) || {};
        const contacts = value.contacts || [];
        (value.messages || []).forEach((msg, i) => {
          const contact = contacts[i] || contacts[0] || {};
          const name = (contact.profile && contact.profile.name) || '';
          const text = extractMetaText(msg);
          const ts = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();
          out.push({ phone: normalisePhone(msg.from), name: name, message: text, timestamp: ts });
        });
      });
    });
    if (out.length) return out;
  }

  // Shape B: simple JSON {phone, name, message} (Make / Zapier / custom).
  const phone = body.phone || body.from || params.phone || params.from;
  const message = body.message || body.text || body.body || params.message || params.text;
  if (phone && message !== undefined) {
    out.push({
      phone: normalisePhone(phone),
      name: body.name || params.name || '',
      message: String(message),
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date()
    });
  }
  return out;
}

function extractMetaText(msg) {
  if (!msg) return '';
  if (msg.text && msg.text.body) return msg.text.body;
  if (msg.button && msg.button.text) return msg.button.text;
  if (msg.interactive) {
    const it = msg.interactive;
    if (it.button_reply) return it.button_reply.title || '';
    if (it.list_reply) return it.list_reply.title || '';
  }
  if (msg.type) return '[' + msg.type + ' message]';
  return '';
}

// ============================== CORE LOGIC ==============================

/**
 * Records one incoming message: appends to Messages (Status = New), upserts
 * the customer, classifies the message, and opens a complaint if warranted.
 */
function recordIncoming(phone, name, message, timestamp) {
  if (!phone) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const messages = ensureSheet(SHEETS.MESSAGES, MESSAGE_COLS);
  const ts = timestamp || new Date();
  const category = classify(message);

  messages.appendRow([ts, phone, name || '', 'In', message || '', category, 'New', '', '']);

  const isOrder = category === 'Order';
  const isComplaint = category === 'Complaint' || category === 'Late Delivery';
  const isLate = category === 'Late Delivery';

  upsertCustomer(phone, name, ts, {
    messages: 1,
    orders: isOrder ? 1 : 0,
    complaints: isComplaint ? 1 : 0,
    late: isLate ? 1 : 0
  });

  if (isComplaint) {
    logComplaint(phone, name, isLate ? 'Late Delivery' : 'General', message, ts);
  }
}

/** Classifies a message into Late Delivery / Complaint / Order / Message. */
function classify(message) {
  const text = String(message || '').toLowerCase();
  if (!text) return 'Message';
  if (containsAny(text, LATE_KEYWORDS)) return 'Late Delivery';
  if (containsAny(text, COMPLAINT_KEYWORDS)) return 'Complaint';
  if (containsAny(text, ORDER_KEYWORDS)) return 'Order';
  return 'Message';
}

function containsAny(text, keywords) {
  for (let i = 0; i < keywords.length; i++) {
    if (text.indexOf(keywords[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

/**
 * Creates or updates a customer row, incrementing the given counters and
 * refreshing First/Last Seen and the behaviour label.
 */
function upsertCustomer(phone, name, ts, inc) {
  const sheet = ensureSheet(SHEETS.CUSTOMERS, CUSTOMER_COLS);
  const data = sheet.getDataRange().getValues();
  const c = colIndex(data[0], CUSTOMER_COLS);
  let rowNum = -1;
  for (let r = 1; r < data.length; r++) {
    if (normalisePhone(data[r][c['Phone']]) === phone) { rowNum = r + 1; break; }
  }

  if (rowNum === -1) {
    const orders = inc.orders || 0;
    const complaints = inc.complaints || 0;
    const late = inc.late || 0;
    const row = [
      phone, name || '', ts, ts, inc.messages || 0,
      orders, complaints, late, behaviourLabel(orders, complaints, ts, ts), ''
    ];
    sheet.appendRow(row);
    return;
  }

  const row = data[rowNum - 1];
  const firstSeen = row[c['First Seen']] || ts;
  const newName = name || row[c['Name']] || '';
  const totalMsgs = num(row[c['Total Messages']]) + (inc.messages || 0);
  const totalOrders = num(row[c['Total Orders']]) + (inc.orders || 0);
  const complaints = num(row[c['Complaints']]) + (inc.complaints || 0);
  const late = num(row[c['Late Deliveries']]) + (inc.late || 0);

  sheet.getRange(rowNum, c['Name'] + 1).setValue(newName);
  sheet.getRange(rowNum, c['Last Seen'] + 1).setValue(ts);
  sheet.getRange(rowNum, c['Total Messages'] + 1).setValue(totalMsgs);
  sheet.getRange(rowNum, c['Total Orders'] + 1).setValue(totalOrders);
  sheet.getRange(rowNum, c['Complaints'] + 1).setValue(complaints);
  sheet.getRange(rowNum, c['Late Deliveries'] + 1).setValue(late);
  sheet.getRange(rowNum, c['Behaviour'] + 1)
    .setValue(behaviourLabel(totalOrders, complaints, firstSeen, ts));
}

/** Simple behaviour model from order & complaint counts and recency. */
function behaviourLabel(orders, complaints, firstSeen, lastSeen) {
  if (complaints >= CONFIG.AT_RISK_MIN_COMPLAINTS) return 'At-Risk';
  const daysSince = lastSeen && firstSeen
    ? Math.round((stripTime(new Date()) - stripTime(new Date(lastSeen))) / 86400000)
    : 0;
  if (daysSince > 60) return 'Dormant';
  if (orders >= CONFIG.VIP_MIN_ORDERS) return 'VIP';
  if (orders >= CONFIG.REGULAR_MIN_ORDERS) return 'Regular';
  return 'New';
}

/** Appends a complaint row (Status = Open). */
function logComplaint(phone, name, type, details, ts) {
  const sheet = ensureSheet(SHEETS.COMPLAINTS, COMPLAINT_COLS);
  sheet.appendRow([ts || new Date(), phone, name || '', type, '', details || '', 'Open', '']);
}

// ============================== UNATTENDED ALERTS ==============================

/**
 * Trigger job (every minute): flags any incoming message still marked "New"
 * older than UNATTENDED_MINUTES that hasn't been alerted, then emails (and
 * optionally WhatsApps) the owner. Marks the row Alerted = Yes so it fires once.
 *
 * A message counts as "attended" when its Status is changed away from "New"
 * (e.g. to "Attended" / "Replied") in the sheet, or when a later OUTBOUND
 * message to the same phone is logged (see markAttendedByReplies()).
 */
function checkUnattendedMessages() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MESSAGES);
  if (!sheet || sheet.getLastRow() < 2) return;

  markAttendedByReplies(sheet); // auto-close messages that already got a reply

  const data = sheet.getDataRange().getValues();
  const c = colIndex(data[0], MESSAGE_COLS);
  const now = new Date();
  const cutoffMs = CONFIG.UNATTENDED_MINUTES * 60 * 1000;
  const overdue = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (String(row[c['Direction']]).toLowerCase() !== 'in') continue;
    if (String(row[c['Status']]) !== 'New') continue;
    if (String(row[c['Alerted']]) === 'Yes') continue;

    const ts = row[c['Timestamp']] ? new Date(row[c['Timestamp']]) : null;
    if (!ts) continue;
    if (now - ts < cutoffMs) continue;

    overdue.push({
      rowNum: r + 1,
      phone: row[c['Phone']],
      name: row[c['Name']],
      message: row[c['Message']],
      category: row[c['Category']],
      minutes: Math.round((now - ts) / 60000)
    });
  }

  if (!overdue.length) return;

  overdue.forEach(o => sheet.getRange(o.rowNum, c['Alerted'] + 1).setValue('Yes'));
  sendUnattendedAlert(overdue);
}

/**
 * Marks incoming "New" messages as "Attended" when a later OUTBOUND message
 * to the same phone exists (i.e. staff replied). Keeps the sheet honest even
 * if nobody manually flips the Status.
 */
function markAttendedByReplies(sheet) {
  const data = sheet.getDataRange().getValues();
  const c = colIndex(data[0], MESSAGE_COLS);

  // Latest outbound time per phone.
  const lastOut = {};
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][c['Direction']]).toLowerCase() === 'out') {
      const phone = normalisePhone(data[r][c['Phone']]);
      const ts = data[r][c['Timestamp']] ? new Date(data[r][c['Timestamp']]).getTime() : 0;
      if (!lastOut[phone] || ts > lastOut[phone]) lastOut[phone] = ts;
    }
  }

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][c['Direction']]).toLowerCase() !== 'in') continue;
    if (String(data[r][c['Status']]) !== 'New') continue;
    const phone = normalisePhone(data[r][c['Phone']]);
    const inTs = data[r][c['Timestamp']] ? new Date(data[r][c['Timestamp']]).getTime() : 0;
    if (lastOut[phone] && lastOut[phone] >= inTs) {
      sheet.getRange(r + 1, c['Status'] + 1).setValue('Attended');
      sheet.getRange(r + 1, c['Attended At'] + 1).setValue(new Date(lastOut[phone]));
    }
  }
}

function sendUnattendedAlert(overdue) {
  const tz = Session.getScriptTimeZone();
  const subject = `⚠️ ${overdue.length} WhatsApp message(s) unattended > ${CONFIG.UNATTENDED_MINUTES} min`;
  const lines = ['These WhatsApp messages have not been attended yet:', ''];
  overdue.forEach(o => {
    lines.push(`• ${o.name || o.phone} (${o.phone}) — waiting ${o.minutes} min` +
      (o.category && o.category !== 'Message' ? ` [${o.category}]` : ''));
    lines.push(`   "${truncate(o.message, 160)}"`);
  });
  lines.push('');
  lines.push(`Sent ${Utilities.formatDate(new Date(), tz, 'EEE, MMM d HH:mm')} — Mozon WhatsApp CRM`);
  const bodyText = lines.join('\n');

  MailApp.sendEmail(CONFIG.ALERT_EMAIL, subject, bodyText);

  if (CONFIG.OWNER_WHATSAPP) {
    const wa = `Mozon alert: ${overdue.length} WhatsApp msg unattended >${CONFIG.UNATTENDED_MINUTES}min. ` +
      overdue.slice(0, 3).map(o => `${o.name || o.phone} (${o.minutes}m)`).join('; ');
    sendWhatsApp(CONFIG.OWNER_WHATSAPP, wa);
  }
}

// ============================== OUTBOUND (CallMeBot) ==============================

/**
 * Sends a WhatsApp message via CallMeBot and logs it as an OUTBOUND message
 * so the "attended" logic and behaviour counts stay accurate.
 * NOTE: the destination number must have activated CallMeBot for your key.
 */
function sendWhatsApp(phone, text) {
  const to = normalisePhone(phone);
  const url = 'https://api.callmebot.com/whatsapp.php'
    + '?phone=' + encodeURIComponent(to)
    + '&text=' + encodeURIComponent(text)
    + '&apikey=' + encodeURIComponent(CONFIG.CALLMEBOT_API_KEY);

  let ok = false;
  try {
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    ok = resp.getResponseCode() === 200;
    if (!ok) console.error('CallMeBot ' + resp.getResponseCode() + ': ' + resp.getContentText());
  } catch (err) {
    console.error('sendWhatsApp error: ' + err);
  }

  // Log the outbound message regardless, so replies close open threads.
  const sheet = ensureSheet(SHEETS.MESSAGES, MESSAGE_COLS);
  sheet.appendRow([new Date(), to, '', 'Out', text, 'Outbound', 'Sent', new Date(), '']);
  return ok;
}

/** Menu helper: send a test WhatsApp to OWNER_WHATSAPP to verify CallMeBot. */
function testWhatsApp() {
  if (!CONFIG.OWNER_WHATSAPP) throw new Error('Set CONFIG.OWNER_WHATSAPP first.');
  const ok = sendWhatsApp(CONFIG.OWNER_WHATSAPP, 'Mozon WhatsApp CRM test ✅ (' + new Date() + ')');
  if (!ok) throw new Error('CallMeBot did not return 200 — check the number/API key and that you activated the bot.');
}

// ============================== MAINTENANCE ==============================

/**
 * Recomputes every customer's counters and behaviour label straight from the
 * Messages log. Use it to backfill after importing history or to self-heal.
 */
function refreshCustomerBehaviours() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const msgSheet = ss.getSheetByName(SHEETS.MESSAGES);
  const custSheet = ensureSheet(SHEETS.CUSTOMERS, CUSTOMER_COLS);
  if (!msgSheet || msgSheet.getLastRow() < 2) return;

  const data = msgSheet.getDataRange().getValues();
  const c = colIndex(data[0], MESSAGE_COLS);
  const agg = {}; // phone -> stats

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (String(row[c['Direction']]).toLowerCase() !== 'in') continue;
    const phone = normalisePhone(row[c['Phone']]);
    if (!phone) continue;
    const ts = row[c['Timestamp']] ? new Date(row[c['Timestamp']]) : new Date();
    const cat = String(row[c['Category']] || '');
    if (!agg[phone]) {
      agg[phone] = { name: row[c['Name']] || '', first: ts, last: ts, msgs: 0, orders: 0, complaints: 0, late: 0 };
    }
    const a = agg[phone];
    if (row[c['Name']]) a.name = row[c['Name']];
    if (ts < a.first) a.first = ts;
    if (ts > a.last) a.last = ts;
    a.msgs += 1;
    if (cat === 'Order') a.orders += 1;
    if (cat === 'Complaint' || cat === 'Late Delivery') a.complaints += 1;
    if (cat === 'Late Delivery') a.late += 1;
  }

  // Rewrite the Customers tab (header + one row per phone).
  const rows = Object.keys(agg).map(phone => {
    const a = agg[phone];
    return [phone, a.name, a.first, a.last, a.msgs, a.orders, a.complaints, a.late,
      behaviourLabel(a.orders, a.complaints, a.first, a.last), ''];
  });

  // Preserve any manual Notes by phone before overwrite.
  const existing = custSheet.getDataRange().getValues();
  const ec = colIndex(existing[0], CUSTOMER_COLS);
  const notesByPhone = {};
  for (let r = 1; r < existing.length; r++) {
    const p = normalisePhone(existing[r][ec['Phone']]);
    if (p && existing[r][ec['Notes']]) notesByPhone[p] = existing[r][ec['Notes']];
  }
  rows.forEach(row => { if (notesByPhone[row[0]]) row[CUSTOMER_COLS.indexOf('Notes')] = notesByPhone[row[0]]; });

  custSheet.clearContents();
  custSheet.getRange(1, 1, 1, CUSTOMER_COLS.length).setValues([CUSTOMER_COLS]);
  if (rows.length) custSheet.getRange(2, 1, rows.length, CUSTOMER_COLS.length).setValues(rows);
  custSheet.setFrozenRows(1);
}

// ============================== HELPERS ==============================

/** Maps a header row to {colName: index}. Missing columns map to -1. */
function colIndex(header, names) {
  const map = {};
  names.forEach(n => { map[n] = header.indexOf(n); });
  return map;
}

/** Keep digits and a single leading +, so '+971 5...' and '971-5...' match. */
function normalisePhone(phone) {
  if (phone === null || phone === undefined) return '';
  let s = String(phone).trim();
  const plus = s.charAt(0) === '+';
  s = s.replace(/[^\d]/g, '');
  return plus ? '+' + s : s;
}

function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function stripTime(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Quick manual test: simulate an incoming message end-to-end. */
function simulateIncoming() {
  setupSheets();
  recordIncoming('+971500000001', 'Test Customer', 'My order is very late, still waiting!', new Date());
}
