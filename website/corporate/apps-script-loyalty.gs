// ═══════════════════════════════════════════════════════════════
//  MOZON BROAST — Google Apps Script  (v2 — CORPORATE + LOYALTY)
//
//  Upgrade of the original order-logging script. Fully additive:
//  keeps every existing column, adds 'Office Code' + 'Points' at
//  the end, and builds two new tabs:
//    👥 Loyalty Members  — you type each office in-charge here
//    🏆 Loyalty Points   — auto leaderboard (points per office code)
//
//  HOW TO INSTALL (takes 3 minutes):
//  1. Open your existing order Sheet → Extensions → Apps Script
//  2. Select ALL old code, replace with THIS entire file
//  3. Keep your SHEET_ID below (same as before)
//  4. Deploy → Manage deployments → ✏️ edit → Version: NEW VERSION
//     → Deploy.  (Without "New version" the old code keeps running!)
//  The web app URL stays the same — the order page needs no change.
// ═══════════════════════════════════════════════════════════════

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE'; // the long string in your Sheet URL between /d/ and /edit

// ── COLUMN HEADERS for Orders sheet (old 17 + 2 new at the end) ──
const HEADERS = [
  'Timestamp', 'Order Date', 'Delivery Time', 'Customer Name',
  'Phone', 'Company / Building', 'Floor / Office', 'Email',
  'Items Ordered', 'Food Subtotal (AED)', 'Drinks Total (AED)',
  'Promo Code', 'Discount (AED)', 'TOTAL (AED)',
  'Payment Method', 'Notes', 'Status',
  'Office Code', 'Points'
];

const MEMBER_HEADERS = [
  'Office Code', 'Company / Factory', 'In-Charge Name', 'Mobile (9715…)', 'Joined', 'Notes'
];

// ════════════════════════════════════════
//  1. RECEIVE ORDER FROM WEBSITE
// ════════════════════════════════════════
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // ── Setup Orders sheet ──
    let ordersSheet = ss.getSheetByName('📋 Orders');
    if (!ordersSheet) {
      ordersSheet = ss.insertSheet('📋 Orders');
      setupOrdersSheet(ordersSheet);
    }
    // Additive upgrade: if the sheet was created by v1 (17 cols), add the 2 new headers
    if (ordersSheet.getLastColumn() < HEADERS.length) {
      ordersSheet.getRange(1, 18, 1, 2).setValues([['Office Code', 'Points']])
        .setBackground('#C0392B').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11);
    }

    // ── Append the order row ──
    const row = [
      new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' }),
      data.date || '',
      data.time || '',
      data.name || '',
      data.phone || '',
      data.company || '',
      data.office || '',
      data.email || '',
      data.items || '',
      parseFloat(data.foodSubtotal) || 0,
      parseFloat(data.drinksTotal) || 0,
      data.promoCode || '',
      parseFloat(data.discount) || 0,
      parseFloat(data.total) || 0,
      data.payment || '',
      data.notes || '',
      'New ✅',
      (data.refCode || '').toString().toUpperCase(),
      parseFloat(data.points) || 0
    ];

    ordersSheet.appendRow(row);

    // ── Auto-color new row ──
    const lastRow = ordersSheet.getLastRow();
    const rowRange = ordersSheet.getRange(lastRow, 1, 1, HEADERS.length);
    rowRange.setBackground('#FFF9C4'); // yellow highlight for new orders
    ordersSheet.getRange(lastRow, 14).setFontWeight('bold').setFontColor('#C0392B');
    if (row[17]) {
      ordersSheet.getRange(lastRow, 18).setFontWeight('bold').setFontColor('#B8860B');
    }

    // ── Update Dashboard + Loyalty leaderboard ──
    refreshDashboard(ss);
    refreshLoyalty(ss);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ════════════════════════════════════════
//  2. SETUP ORDERS SHEET (first time)
// ════════════════════════════════════════
function setupOrdersSheet(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setBackground('#C0392B')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11);

  const widths = [160, 100, 110, 140, 120, 180, 120, 160, 300, 120, 110, 100, 110, 110, 130, 180, 90, 110, 80];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);
}

// ════════════════════════════════════════
//  3. LOYALTY MEMBERS SHEET
//     You fill this by hand with the contacts you collected:
//     invent a short code per office (e.g. ALFA01), then their
//     personal link is  https://mozonbroast.ae/corporate/?ref=ALFA01
// ════════════════════════════════════════
function getOrCreateMembersSheet(ss) {
  let mem = ss.getSheetByName('👥 Loyalty Members');
  if (!mem) {
    mem = ss.insertSheet('👥 Loyalty Members');
    mem.getRange(1, 1, 1, MEMBER_HEADERS.length).setValues([MEMBER_HEADERS])
      .setBackground('#1A1A1A').setFontColor('#FFC107').setFontWeight('bold').setFontSize(11);
    [110, 220, 180, 150, 110, 240].forEach((w, i) => mem.setColumnWidth(i + 1, w));
    mem.setFrozenRows(1);
    mem.getRange('A2').setNote('Type one row per office in-charge you signed up.\nOffice Code: short & unique, e.g. ALFA01.\nTheir personal order link:\nhttps://mozonbroast.ae/corporate/?ref=CODE');
  }
  return mem;
}

function readMembers(ss) {
  const mem = getOrCreateMembersSheet(ss);
  const map = {};
  if (mem.getLastRow() < 2) return map;
  const rows = mem.getRange(2, 1, mem.getLastRow() - 1, MEMBER_HEADERS.length).getValues();
  rows.forEach(r => {
    const code = (r[0] || '').toString().trim().toUpperCase();
    if (code) map[code] = { company: r[1] || '', name: r[2] || '', mobile: r[3] || '' };
  });
  return map;
}

// ════════════════════════════════════════
//  4. LOYALTY POINTS LEADERBOARD
//     Auto-rebuilt on every order. The 'Points Redeemed' column
//     is YOURS to edit by hand — it is preserved across rebuilds.
// ════════════════════════════════════════
const LOYALTY_HEADERS = [
  'Office Code', 'Company / Factory', 'In-Charge', 'Mobile',
  'Orders', 'Total Spend (AED)', 'Points Earned',
  'Points Redeemed (edit by hand)', 'Points Balance', 'Last Order'
];

function refreshLoyalty(ss) {
  let loy = ss.getSheetByName('🏆 Loyalty Points');
  if (!loy) loy = ss.insertSheet('🏆 Loyalty Points', 1);

  // Preserve manually-entered redeemed points before rebuilding
  const redeemedMap = {};
  if (loy.getLastRow() >= 3) {
    const old = loy.getRange(3, 1, loy.getLastRow() - 2, LOYALTY_HEADERS.length).getValues();
    old.forEach(r => {
      const code = (r[0] || '').toString().trim().toUpperCase();
      const redeemed = parseFloat(r[7]) || 0;
      if (code && redeemed > 0) redeemedMap[code] = redeemed;
    });
  }

  const members = readMembers(ss);

  // Aggregate orders per office code
  const stats = {}; // code → {orders, spend, points, last, company}
  const ordersSheet = ss.getSheetByName('📋 Orders');
  if (ordersSheet && ordersSheet.getLastRow() >= 2) {
    const nCols = Math.max(ordersSheet.getLastColumn(), HEADERS.length);
    const data = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, nCols).getValues();
    data.forEach(row => {
      const code = (row[17] || '').toString().trim().toUpperCase();
      if (!code) return;
      const totalAED = parseFloat(row[13]) || 0;
      const pts = parseFloat(row[18]) || Math.round(totalAED); // fallback: 1 pt / AED
      if (!stats[code]) stats[code] = { orders: 0, spend: 0, points: 0, last: '', company: '' };
      stats[code].orders += 1;
      stats[code].spend += totalAED;
      stats[code].points += pts;
      stats[code].last = row[0] || stats[code].last;
      if (!stats[code].company && row[5]) stats[code].company = row[5];
    });
  }

  // Union of registered members + codes seen in orders
  const allCodes = {};
  Object.keys(members).forEach(c => allCodes[c] = true);
  Object.keys(stats).forEach(c => allCodes[c] = true);

  const rows = Object.keys(allCodes).map(code => {
    const m = members[code] || {};
    const s = stats[code] || { orders: 0, spend: 0, points: 0, last: '', company: '' };
    const redeemed = redeemedMap[code] || 0;
    return [
      code,
      m.company || s.company || '(not registered — add in 👥 Loyalty Members)',
      m.name || '',
      m.mobile ? "'" + m.mobile : '',
      s.orders,
      Math.round(s.spend * 100) / 100,
      s.points,
      redeemed,
      s.points - redeemed,
      String(s.last)
    ];
  }).sort((a, b) => b[8] - a[8]); // by points balance, highest first

  // Rebuild the sheet
  loy.clearContents();
  loy.clearFormats();

  loy.getRange(1, 1, 1, LOYALTY_HEADERS.length).merge()
    .setValue('🏆 MOZON BROAST — OFFICE LOYALTY LEADERBOARD  (auto-updated on every order)')
    .setBackground('#1A1A1A').setFontColor('#FFC107')
    .setFontSize(13).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  loy.setRowHeight(1, 40);

  loy.getRange(2, 1, 1, LOYALTY_HEADERS.length).setValues([LOYALTY_HEADERS])
    .setBackground('#C0392B').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11);

  if (rows.length > 0) {
    loy.getRange(3, 1, rows.length, LOYALTY_HEADERS.length).setValues(rows);
    rows.forEach((r, i) => {
      const bg = i === 0 ? '#FFF9C4' : (i % 2 === 0 ? '#F9F9F9' : '#FFFFFF');
      loy.getRange(3 + i, 1, 1, LOYALTY_HEADERS.length).setBackground(bg);
      loy.getRange(3 + i, 9).setFontWeight('bold').setFontColor('#B8860B');
    });
  } else {
    loy.getRange('A3').setValue('No loyalty orders yet. Register offices in 👥 Loyalty Members and share their ?ref= links.');
  }

  [110, 240, 160, 140, 70, 140, 120, 200, 130, 160].forEach((w, i) => loy.setColumnWidth(i + 1, w));
  loy.setFrozenRows(2);
}

// ════════════════════════════════════════
//  5. DASHBOARD SHEET  (same as v1)
// ════════════════════════════════════════
function refreshDashboard(ss) {
  let dash = ss.getSheetByName('📊 Dashboard');
  if (!dash) {
    dash = ss.insertSheet('📊 Dashboard', 0);
  }
  dash.clearContents();
  dash.clearFormats();

  const ordersSheet = ss.getSheetByName('📋 Orders');
  if (!ordersSheet || ordersSheet.getLastRow() < 2) {
    dash.getRange('A1').setValue('No orders yet. Dashboard will populate automatically when orders arrive.');
    return;
  }

  const nCols = Math.max(ordersSheet.getLastColumn(), 17);
  const data = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, nCols).getValues();

  let totalRevenue = 0;
  let totalOrders = data.length;
  const companyMap = {};
  const dailyMap = {};
  const paymentMap = {};
  let totalDiscount = 0;

  data.forEach(row => {
    const company = row[5] || 'Unknown';
    const date = row[1] || '';
    const total = parseFloat(row[13]) || 0;
    const discount = parseFloat(row[12]) || 0;
    const payment = row[14] || 'Unknown';

    totalRevenue += total;
    totalDiscount += discount;

    companyMap[company] = (companyMap[company] || 0) + total;
    dailyMap[date] = (dailyMap[date] || 0) + total;
    paymentMap[payment] = (paymentMap[payment] || 0) + 1;
  });

  const avgOrder = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

  dash.getRange('A1:H1').merge()
    .setValue('🍗 MOZON BROAST — LIVE ORDER DASHBOARD')
    .setBackground('#C0392B').setFontColor('#FFFFFF')
    .setFontSize(16).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  dash.setRowHeight(1, 50);

  dash.getRange('A2:H2').merge()
    .setValue('Al Nahda 2 · Near NMC Hospital · Dubai  |  Last updated: ' + new Date().toLocaleString('en-AE', {timeZone:'Asia/Dubai'}))
    .setBackground('#1A1A1A').setFontColor('#FFC107')
    .setFontSize(10).setHorizontalAlignment('center');

  const kpis = [
    ['📦 TOTAL ORDERS', totalOrders, '#2E86C1', '#FFFFFF'],
    ['💰 TOTAL REVENUE', 'AED ' + totalRevenue.toFixed(2), '#27AE60', '#FFFFFF'],
    ['📈 AVG ORDER VALUE', 'AED ' + avgOrder, '#8E44AD', '#FFFFFF'],
    ['🎁 TOTAL DISCOUNTS', 'AED ' + totalDiscount.toFixed(2), '#E67E22', '#FFFFFF'],
  ];

  kpis.forEach((kpi, i) => {
    const col = i * 2 + 1;
    dash.getRange(4, col, 1, 2).merge()
      .setValue(kpi[0])
      .setBackground(kpi[2]).setFontColor(kpi[3])
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center');
    dash.getRange(5, col, 1, 2).merge()
      .setValue(kpi[1])
      .setBackground(kpi[2]).setFontColor('#FFFFFF')
      .setFontSize(18).setFontWeight('bold')
      .setHorizontalAlignment('center');
    [4, 5].forEach(r => dash.setRowHeight(r, 36));
  });

  dash.getRange('A7:C7').merge()
    .setValue('🏢 TOP COMPANIES BY REVENUE')
    .setBackground('#1A1A1A').setFontColor('#FFC107')
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center');

  dash.getRange('A8').setValue('Company').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');
  dash.getRange('B8').setValue('Revenue (AED)').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');
  dash.getRange('C8').setValue('Orders').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');

  const companyOrderCount = {};
  data.forEach(row => {
    const company = row[5] || 'Unknown';
    companyOrderCount[company] = (companyOrderCount[company] || 0) + 1;
  });

  const sortedCompanies = Object.entries(companyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  sortedCompanies.forEach(([company, rev], i) => {
    const r = 9 + i;
    const bg = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
    dash.getRange(r, 1).setValue(company).setBackground(bg);
    dash.getRange(r, 2).setValue(rev.toFixed(2)).setBackground(bg).setHorizontalAlignment('right');
    dash.getRange(r, 3).setValue(companyOrderCount[company] || 0).setBackground(bg).setHorizontalAlignment('center');
    if (i === 0) {
      dash.getRange(r, 1, 1, 3).setBackground('#FFF9C4').setFontWeight('bold');
    }
  });

  const startCol = 5;
  dash.getRange(7, startCol, 1, 2).merge()
    .setValue('📅 DAILY REVENUE')
    .setBackground('#1A1A1A').setFontColor('#FFC107')
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center');

  dash.getRange(8, startCol).setValue('Date').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');
  dash.getRange(8, startCol + 1).setValue('Revenue (AED)').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');

  const sortedDays = Object.entries(dailyMap)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 15);

  sortedDays.forEach(([date, rev], i) => {
    const r = 9 + i;
    const bg = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
    dash.getRange(r, startCol).setValue(String(date)).setBackground(bg);
    dash.getRange(r, startCol + 1).setValue(rev.toFixed(2)).setBackground(bg).setHorizontalAlignment('right');
  });

  dash.getRange(7, startCol + 3, 1, 2).merge()
    .setValue('💳 PAYMENT METHODS')
    .setBackground('#1A1A1A').setFontColor('#FFC107')
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center');

  dash.getRange(8, startCol + 3).setValue('Method').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');
  dash.getRange(8, startCol + 4).setValue('Orders').setBackground('#C0392B').setFontColor('#FFF').setFontWeight('bold');

  Object.entries(paymentMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count], i) => {
      const r = 9 + i;
      const bg = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
      dash.getRange(r, startCol + 3).setValue(method).setBackground(bg);
      dash.getRange(r, startCol + 4).setValue(count).setBackground(bg).setHorizontalAlignment('center');
    });

  const recentStart = Math.max(sortedCompanies.length, sortedDays.length) + 11;

  dash.getRange(recentStart, 1, 1, 8).merge()
    .setValue('🕐 RECENT ORDERS (Latest 10)')
    .setBackground('#1A1A1A').setFontColor('#FFC107')
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center');

  const recentHeaders = ['Time', 'Name', 'Company', 'Phone', 'Items', 'Total (AED)', 'Payment', 'Status'];
  dash.getRange(recentStart + 1, 1, 1, 8).setValues([recentHeaders])
    .setBackground('#C0392B').setFontColor('#FFFFFF').setFontWeight('bold');

  const recent = data.slice(-10).reverse();
  recent.forEach((row, i) => {
    const r = recentStart + 2 + i;
    const bg = i % 2 === 0 ? '#FFF9C4' : '#FFFFFF';
    dash.getRange(r, 1).setValue(String(row[0])).setBackground(bg);
    dash.getRange(r, 2).setValue(row[3]).setBackground(bg);
    dash.getRange(r, 3).setValue(row[5]).setBackground(bg);
    dash.getRange(r, 4).setValue("'" + (row[4] || '')).setBackground(bg);
    dash.getRange(r, 5).setValue(row[8]).setBackground(bg);
    dash.getRange(r, 6).setValue(row[13]).setBackground(bg).setFontWeight('bold').setFontColor('#C0392B');
    dash.getRange(r, 7).setValue(row[14]).setBackground(bg);
    dash.getRange(r, 8).setValue(row[16] || 'New ✅').setBackground(bg);
  });

  [160, 130, 180, 130, 300, 110, 130, 90].forEach((w, i) => dash.setColumnWidth(i + 1, w));
  dash.setFrozenRows(2);
}

// ════════════════════════════════════════
//  6. MANUAL REFRESH — run after editing 👥 Loyalty Members
//     or the 'Points Redeemed' column
// ════════════════════════════════════════
function manualRefresh() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  refreshDashboard(ss);
  refreshLoyalty(ss);
  SpreadsheetApp.getUi().alert('✅ Dashboard + Loyalty leaderboard refreshed!');
}

// ════════════════════════════════════════
//  7. AUTO REFRESH every 15 minutes
//     Set this up in Triggers (clock icon)
// ════════════════════════════════════════
function autoRefresh() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  refreshDashboard(ss);
  refreshLoyalty(ss);
}

// ════════════════════════════════════════
//  8. HANDLE GET (for testing)
// ════════════════════════════════════════
function doGet(e) {
  return ContentService
    .createTextOutput('🍗 Mozon Broast Order API v2 (loyalty) is running!')
    .setMimeType(ContentService.MimeType.TEXT);
}
