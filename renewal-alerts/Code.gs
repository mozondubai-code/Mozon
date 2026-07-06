/**
 * Renewal / Payment Alert Script
 *
 * Reads renewal rows from a Google Sheet and emails a single fixed
 * recipient 30, 7, and 3 days before each renewal date. Runs once a day
 * via a time-driven trigger (see createDailyTrigger()).
 *
 * Sheet columns (header row required, any column order):
 *   Name            - subscription / payment name (required)
 *   Renewal Date    - date of next renewal (required)
 *   Amount          - e.g. "$49.99" (optional, shown in email)
 *   Recurrence      - None | Weekly | Monthly | Yearly (optional, default None)
 *   Notes           - free text (optional, shown in email)
 *   Last Alert Sent - written by the script, do not edit manually
 */

// ---------------------- CONFIG ----------------------
const CONFIG = {
  SHEET_NAME: 'Renewals',
  ALERT_EMAILS: [
    'gasulgachuu@gmail.com',
    'alidaymart@gmail.com',
    'musthafadaymart@gmail.com',
  ],
  ALERT_DAYS: [30, 7, 3],
  TRIGGER_HOUR: 8, // 24h, script timezone
};
// ------------------------------------------------------

const COLUMNS = ['Name', 'Renewal Date', 'Amount', 'Recurrence', 'Notes', 'Last Alert Sent'];

/**
 * One-time setup: creates the sheet with headers if it doesn't exist yet.
 * Safe to run again later; it won't wipe existing data.
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, COLUMNS.length);
  }
}

/**
 * One-time helper: fills the sheet with the known renewal items.
 * Only adds a row if a row with the same Name isn't already present,
 * so it's safe to run more than once (no duplicates). Extracted from
 * the Mozon / Lusso Chicken documents.
 */
function seedInitialData() {
  setupSheet();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);

  // [Name, Renewal Date, Amount, Recurrence, Notes]
  const seed = [
    [
      'Tenancy Contract - Mozon (BAKS Al Nahda S03)',
      new Date(2026, 8, 30), // 30 Sep 2026
      'AED 151,798 / yr (AED 159,388 incl VAT)',
      'Yearly',
      'Ejari No 0120171002003325; SBK Real Estate; Unit S03; Owner Beit Al Khair Society',
    ],
    [
      'Trade License 537107 - Mozon Restaurant & Cafeteria',
      new Date(2026, 7, 27), // 27 Aug 2026
      '',
      'Yearly',
      'DED-Dubai; License No 537107',
    ],
    [
      'Emirates ID - Muhammadali Chandroth (Sales Manager)',
      new Date(2026, 9, 30), // 30 Oct 2026
      '',
      'None',
      'EID 784-1970-5142984-9; renew before expiry then update this date',
    ],
  ];

  const existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map((r) => String(r[0]).trim())
    : [];

  const toAdd = seed.filter((row) => existing.indexOf(String(row[0]).trim()) === -1);
  if (toAdd.length === 0) return;

  // Pad each row to full column width (Last Alert Sent stays blank).
  const rows = toAdd.map((row) => {
    const full = row.slice();
    while (full.length < COLUMNS.length) full.push('');
    return full;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, COLUMNS.length).setValues(rows);
}

/**
 * One-time setup: installs the daily trigger that runs checkRenewals().
 * Run this once from the Apps Script editor and approve the auth prompt.
 */
function createDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'checkRenewals')
    .forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('checkRenewals')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TRIGGER_HOUR)
    .create();
}

/**
 * Main job: run daily. Checks every row's renewal date and emails
 * CONFIG.ALERT_EMAIL when it lands on 30/7/3 days out. Also rolls
 * forward any renewal date that has recurrence and already passed.
 */
function checkRenewals() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found. Run setupSheet() first.`);

  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return; // header only, nothing to check

  const header = values[0];
  const col = {};
  COLUMNS.forEach((name) => {
    col[name] = header.indexOf(name);
  });
  if (col['Name'] === -1 || col['Renewal Date'] === -1) {
    throw new Error('Sheet is missing required "Name" or "Renewal Date" column.');
  }

  const today = stripTime(new Date());

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = row[col['Name']];
    const renewalRaw = row[col['Renewal Date']];
    if (!name || !renewalRaw) continue;

    let renewalDate = stripTime(new Date(renewalRaw));
    const amount = col['Amount'] !== -1 ? row[col['Amount']] : '';
    const recurrence = col['Recurrence'] !== -1 ? String(row[col['Recurrence']] || 'None') : 'None';
    const notes = col['Notes'] !== -1 ? row[col['Notes']] : '';
    const lastAlertSent = col['Last Alert Sent'] !== -1 ? row[col['Last Alert Sent']] : '';

    // Roll a past-due recurring renewal forward to its next cycle.
    if (renewalDate < today && recurrence !== 'None') {
      renewalDate = advanceDate(renewalDate, recurrence, today);
      sheet.getRange(r + 1, col['Renewal Date'] + 1).setValue(renewalDate);
      if (col['Last Alert Sent'] !== -1) {
        sheet.getRange(r + 1, col['Last Alert Sent'] + 1).setValue('');
      }
    }

    const daysUntil = Math.round((renewalDate - today) / (24 * 60 * 60 * 1000));

    if (CONFIG.ALERT_DAYS.includes(daysUntil) && String(lastAlertSent) !== String(daysUntil)) {
      sendAlertEmail(name, renewalDate, daysUntil, amount, notes);
      if (col['Last Alert Sent'] !== -1) {
        sheet.getRange(r + 1, col['Last Alert Sent'] + 1).setValue(daysUntil);
      }
    }
  }
}

function sendAlertEmail(name, renewalDate, daysUntil, amount, notes) {
  const dateStr = Utilities.formatDate(renewalDate, Session.getScriptTimeZone(), 'EEEE, MMM d, yyyy');
  const subject = `Renewal in ${daysUntil} day${daysUntil === 1 ? '' : 's'}: ${name}`;
  const lines = [
    `"${name}" renews on ${dateStr} (${daysUntil} day${daysUntil === 1 ? '' : 's'} from today).`,
  ];
  if (amount) lines.push(`Amount: ${amount}`);
  if (notes) lines.push(`Notes: ${notes}`);
  MailApp.sendEmail(CONFIG.ALERT_EMAILS.join(','), subject, lines.join('\n'));
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function advanceDate(date, recurrence, notBefore) {
  const next = new Date(date);
  do {
    if (recurrence === 'Weekly') next.setDate(next.getDate() + 7);
    else if (recurrence === 'Monthly') next.setMonth(next.getMonth() + 1);
    else if (recurrence === 'Yearly') next.setFullYear(next.getFullYear() + 1);
    else break;
  } while (next < notBefore);
  return next;
}
