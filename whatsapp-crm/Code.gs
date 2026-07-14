/**
 * Mozon WhatsApp — Simple Manual Broadcast Toolkit
 * ================================================
 *
 * No API, no webhooks, no automation. You keep a customer list in the sheet by
 * hand, type one message, and the script builds a "▶ Send" link for each
 * customer. Click a link → WhatsApp Web opens that chat with your message
 * already typed → you press send. That's the whole thing.
 *
 * Tabs it uses:
 *   Customers  - your contact list (you fill this in)
 *   Broadcast  - where you type the message + generate the send links
 *
 * Install: paste this into Extensions > Apps Script, Save, then reload the
 * sheet. A "📣 Mozon WhatsApp" menu appears. Run "Set up sheets" once.
 */

const CUSTOMERS = 'Customers';
const BROADCAST = 'Broadcast';

// Customers tab columns (you edit these by hand; "Send" is filled by the script)
const CUST_COLS = [
  'Phone', 'Name', 'Group', 'Orders', 'Complaints',
  'Late Deliveries', 'Last Contacted', 'Notes', 'Send'
];

/** Adds the menu every time the sheet is opened. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📣 Mozon WhatsApp')
    .addItem('1. Set up sheets', 'setupSheets')
    .addSeparator()
    .addItem('2. Generate send links', 'generateSendLinks')
    .addItem('3. Mark selected rows as contacted', 'markContacted')
    .addSeparator()
    .addItem('Clear send links', 'clearSendLinks')
    .addToUi();
}

/** One-time: create the Customers and Broadcast tabs. Safe to re-run. */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Customers tab
  let cust = ss.getSheetByName(CUSTOMERS);
  if (!cust) cust = ss.insertSheet(CUSTOMERS);
  if (cust.getLastRow() === 0) {
    cust.getRange(1, 1, 1, CUST_COLS.length).setValues([CUST_COLS]);
    cust.setFrozenRows(1);
    // one example row so the format is obvious (delete it whenever)
    cust.getRange(2, 1, 1, CUST_COLS.length).setValues([[
      '+9715XXXXXXXX', 'Ahmed', 'VIP', 5, 0, 0, '', 'Likes extra spicy', ''
    ]]);
    cust.autoResizeColumns(1, CUST_COLS.length);
  }

  // Broadcast tab
  let bc = ss.getSheetByName(BROADCAST);
  if (!bc) bc = ss.insertSheet(BROADCAST);
  if (bc.getRange('A1').getValue() === '') {
    bc.getRange('A1').setValue('MESSAGE (use {name} to personalise):');
    bc.getRange('A2').setValue('Hello {name}, this is Mozon! Today\'s special: ...');
    bc.getRange('A4').setValue('Only send to this Group (leave B4 blank = everyone):');
    bc.getRange('B4').setValue('');
    bc.getRange('A6').setValue('Then use menu:  📣 Mozon WhatsApp → Generate send links');
    bc.getRange('A1:A6').setFontWeight('bold');
    bc.getRange('A2').setWrap(true);
    bc.setColumnWidth(1, 380);
    bc.getRange('A2').setBackground('#fff7e0');
    bc.getRange('B4').setBackground('#fff7e0');
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Sheets ready. Fill in Customers, then Generate send links.', 'Mozon WhatsApp', 5);
}

/**
 * Reads the message from Broadcast!A2 and, for every customer (optionally
 * filtered by Group in B4), writes a clickable "▶ Send" link in the Send
 * column. Clicking it opens WhatsApp Web/app with the message pre-typed.
 */
function generateSendLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bc = ss.getSheetByName(BROADCAST);
  const cust = ss.getSheetByName(CUSTOMERS);
  if (!bc || !cust) { setupSheets(); return; }

  const message = String(bc.getRange('A2').getValue() || '').trim();
  if (!message) {
    ss.toast('Type a message in Broadcast!A2 first.', 'Mozon WhatsApp', 5);
    return;
  }
  const groupFilter = String(bc.getRange('B4').getValue() || '').trim().toLowerCase();

  const data = cust.getDataRange().getValues();
  const header = data[0];
  const cPhone = header.indexOf('Phone');
  const cName = header.indexOf('Name');
  const cGroup = header.indexOf('Group');
  const cSend = header.indexOf('Send');
  if (cPhone === -1 || cSend === -1) {
    ss.toast('Customers tab is missing "Phone" or "Send" column. Run "Set up sheets".', 'Mozon WhatsApp', 6);
    return;
  }

  let made = 0;
  for (let r = 1; r < data.length; r++) {
    const phone = cleanPhone(data[r][cPhone]);
    if (!phone) continue;
    if (groupFilter && String(data[r][cGroup] || '').trim().toLowerCase() !== groupFilter) {
      cust.getRange(r + 1, cSend + 1).clearContent();
      continue;
    }
    const name = cName !== -1 ? String(data[r][cName] || '') : '';
    const text = personalise(message, name);
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
    const rich = SpreadsheetApp.newRichTextValue()
      .setText('▶ Send to ' + (name || phone))
      .setLinkUrl(url)
      .build();
    cust.getRange(r + 1, cSend + 1).setRichTextValue(rich);
    made++;
  }

  ss.toast(made + ' send link(s) ready. Click each "▶ Send" to broadcast.', 'Mozon WhatsApp', 6);
}

/** Sets Last Contacted = today on whatever rows you have selected. */
function markContacted() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cust = ss.getSheetByName(CUSTOMERS);
  if (!cust || ss.getActiveSheet().getName() !== CUSTOMERS) {
    ss.toast('Select rows in the Customers tab first.', 'Mozon WhatsApp', 5);
    return;
  }
  const header = cust.getRange(1, 1, 1, cust.getLastColumn()).getValues()[0];
  const cLast = header.indexOf('Last Contacted');
  if (cLast === -1) { ss.toast('No "Last Contacted" column.', 'Mozon WhatsApp', 5); return; }

  const today = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const ranges = cust.getActiveRangeList() ? cust.getActiveRangeList().getRanges() : [cust.getActiveRange()];
  let count = 0;
  ranges.forEach(range => {
    const start = range.getRow();
    const rows = range.getNumRows();
    for (let i = 0; i < rows; i++) {
      const row = start + i;
      if (row === 1) continue; // skip header
      cust.getRange(row, cLast + 1).setValue(today);
      count++;
    }
  });
  ss.toast('Marked ' + count + ' row(s) contacted (' + today + ').', 'Mozon WhatsApp', 5);
}

/** Empties the Send column. */
function clearSendLinks() {
  const cust = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CUSTOMERS);
  if (!cust) return;
  const header = cust.getRange(1, 1, 1, cust.getLastColumn()).getValues()[0];
  const cSend = header.indexOf('Send');
  if (cSend === -1 || cust.getLastRow() < 2) return;
  cust.getRange(2, cSend + 1, cust.getLastRow() - 1, 1).clearContent();
}

// ---------- helpers ----------

/** {name} -> customer name; {first} -> first word of the name. */
function personalise(message, name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return message
    .replace(/\{name\}/gi, name || 'there')
    .replace(/\{first\}/gi, first || 'there');
}

/** WhatsApp links need digits only, no '+', no spaces. */
function cleanPhone(phone) {
  return String(phone == null ? '' : phone).replace(/[^\d]/g, '');
}
