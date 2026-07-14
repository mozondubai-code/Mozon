/*  ===========================================================================
    LIFE OS v3 — Google Apps Script backend
    Owner: Gazul (Al Nahda 2, Dubai)

    Does three things:
      1. Builds / maintains the 8-tab Google Sheet.
      2. Exposes a webhook (doPost / doGet) so the web app and AI assistant
         can add / update / read / sync data.
      3. Sends 3 daily reports (Email + WhatsApp) at 12PM / 7PM / 2AM Dubai.

    ---- FIRST-TIME SETUP (do this once) -------------------------------------
      1. Paste this file into the Apps Script editor (replace everything).
      2. Paste appsscript.json into the manifest (Project Settings ->
         "Show appsscript.json" -> paste).
      3. Run  buildSheet   once  -> approve permissions. Builds all tabs.
      4. Run  createTriggers  once -> installs the 3 daily timers.
      5. (Optional) Run  sendTestReport  to get an instant Email + WhatsApp.
      6. Deploy -> New deployment -> Web app -> Execute as: Me,
         Who has access: Anyone -> copy the /exec URL into the web app.
    =========================================================================== */

/* ----------------------------- CONFIG ----------------------------------- */
const CONFIG = {
  SHEET_ID:        '1Lrt5KpV2UkiFaVzQCt9l_1QCr7TKfhM6WcEuRUnG7BE',
  OWNER_EMAIL:     'gasulgachuu@gmail.com',
  WHATSAPP_PHONE:  '971543963100',          // country code, no '+'
  CALLMEBOT_APIKEY:'2220210',
  WEBHOOK_SECRET:  'gazul-lifeos-Kx7q-2026', // must match the web app
  SIGNATURE:       'Your Life OS 🤖',
  TIMEZONE:        'Asia/Dubai',
  BIZ_CUTOFF_HOUR: 6,                        // before 6AM = previous biz day
  NUDGE: { dayStart: 12, eveningPush: 19, nightReview: 2 },
  ENABLE_CALENDAR: false,                    // set true to also drop cal events
  VERSION: 'v3',
};

const TABS = {
  REMINDERS: 'Reminders',
  TASKS:     'Tasks',
  SHOP:      'Shop Finances',
  PERSONAL:  'Personal Finances',
  CREDIT:    'Credit Ledger',
  IDEAS:     'Ideas',
  CONFIG:    'Config',
  LOG:       'Log',
};

const HEADERS = {
  'Reminders':         ['ID','Category','Title','Due Date','Amount','Lead Days','Channels','Recurrence','Notes','Status','_SentFlags','_EventID','_Updated'],
  'Tasks':             ['ID','Title','Due Date','Priority','Status','Notes','Created','Committed'],
  'Shop Finances':     ['ID','Date','Type','Account','Amount','Category','Notes'],
  'Personal Finances': ['ID','Date','Type','Account','Amount','Category','Notes'],
  'Credit Ledger':     ['ID','Date','Person','Type','Amount','Account','Status','Notes'],
  'Ideas':             ['ID','Date','Idea','Category','Notes'],
  'Config':            ['Setting','Value'],
  'Log':               ['Time','Item','Channel','Detail','Result'],
};

const PREFIX = {
  'Reminders':'R', 'Tasks':'T', 'Shop Finances':'SF',
  'Personal Finances':'PF', 'Credit Ledger':'C', 'Ideas':'I',
};

/* ----------------------------- MENU ------------------------------------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Life OS')
    .addItem('Setup (build sheet + triggers)', 'setup')
    .addItem('Build / repair sheet', 'buildSheet')
    .addItem('Install daily triggers', 'createTriggers')
    .addSeparator()
    .addItem('Send Day Start report now', 'runDayStart')
    .addItem('Send Evening report now', 'runEveningPush')
    .addItem('Send Night report now', 'runNightReview')
    .addItem('Send TEST report (email+WhatsApp)', 'sendTestReport')
    .addToUi();
}

/* --------------------------- SHEET HELPERS ------------------------------ */
function ss_()          { return SpreadsheetApp.openById(CONFIG.SHEET_ID); }
function sh_(name) {
  const ss = ss_();
  let s = ss.getSheetByName(name);
  if (!s && HEADERS[name]) {                       // auto-create if missing
    s = ss.insertSheet(name);
    s.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}
function toast_(msg) { try { const a = SpreadsheetApp.getActive(); if (a) a.toast(msg); } catch (e) {} }
function stripTime_(d)  { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function bizToday_()    { const n = new Date(); n.setHours(n.getHours() - CONFIG.BIZ_CUTOFF_HOUR); return stripTime_(n); }
function isoDate_(d)    { return Utilities.formatDate(new Date(d), CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function fmt_(n)        { return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function daysUntil_(d)  { if(!d) return null; return Math.round((stripTime_(d) - bizToday_())/86400000); }

function nextId_(sheet, prefix) {
  const last = sheet.getLastRow();
  let max = 0;
  if (last > 1) {
    const ids = sheet.getRange(2,1,last-1,1).getValues();
    const re = new RegExp('^'+prefix+'(\\d+)$');
    ids.forEach(r => { const m = re.exec(String(r[0]||'')); if (m) max = Math.max(max, parseInt(m[1],10)); });
  }
  return prefix + String(max+1).padStart(3,'0');
}

function log_(item, channel, detail, result) {
  try {
    const s = sh_(TABS.LOG);
    s.appendRow([Utilities.formatDate(new Date(), CONFIG.TIMEZONE,'yyyy-MM-dd HH:mm'), item, channel, detail, result]);
  } catch (e) { /* logging must never throw */ }
}

/* --------------------------- BUILD SHEET -------------------------------- */
function buildSheet() {
  const ss = ss_();
  Object.values(TABS).forEach(name => {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    const head = HEADERS[name];
    s.getRange(1,1,1,head.length).setValues([head]).setFontWeight('bold');
    s.setFrozenRows(1);
    s.autoResizeColumns(1, head.length);
  });

  // Dropdowns
  dropdown_(TABS.REMINDERS, 2, ['Payment','Document','Health','Task','Habit','Other']);       // Category
  dropdown_(TABS.REMINDERS, 8, ['None','Daily','Weekly','Monthly','Yearly']);                  // Recurrence
  dropdown_(TABS.REMINDERS,10, ['Active','Done','Snoozed']);                                   // Status
  dropdown_(TABS.TASKS,     4, ['Low','Medium','High']);                                       // Priority
  dropdown_(TABS.TASKS,     5, ['Open','Done']);                                               // Status
  dropdown_(TABS.TASKS,     8, ['Yes','']);                                                    // Committed
  [TABS.SHOP, TABS.PERSONAL].forEach(t => {
    dropdown_(t, 3, ['Income','Expense']);                                                     // Type
    dropdown_(t, 4, ['Cash in Hand','Bank']);                                                  // Account
  });
  dropdown_(TABS.CREDIT, 4, ['Given','Taken']);                                                // Type
  dropdown_(TABS.CREDIT, 6, ['Shop - Cash','Shop - Bank','Personal - Cash','Personal - Bank']);// Account
  dropdown_(TABS.CREDIT, 7, ['Pending','Paid']);                                               // Status

  seedConfig_();
  // put the default 8-tab order and remove Google's leftover "Sheet1"
  const junk = ss.getSheetByName('Sheet1');
  if (junk && ss.getSheets().length > 1) ss.deleteSheet(junk);

  log_('buildSheet','System','tabs='+Object.values(TABS).length,'OK');
  toast_('Sheet built ✓');
}

/* One-shot setup: build the sheet AND install triggers in a single run. */
function setup() {
  buildSheet();
  createTriggers();
  toast_('Life OS ready ✓');
}

function dropdown_(tabName, col, values) {
  const s = sh_(tabName);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
  s.getRange(2, col, 500, 1).setDataValidation(rule);
}

function seedConfig_() {
  const s = sh_(TABS.CONFIG);
  const wanted = [
    ['OWNER_EMAIL',      CONFIG.OWNER_EMAIL],
    ['WHATSAPP_PHONE',   CONFIG.WHATSAPP_PHONE],
    ['CALLMEBOT_APIKEY', CONFIG.CALLMEBOT_APIKEY],
    ['SIGNATURE',        CONFIG.SIGNATURE],
    ['WEBHOOK_SECRET',   CONFIG.WEBHOOK_SECRET],
  ];
  const existing = {};
  const last = s.getLastRow();
  if (last > 1) s.getRange(2,1,last-1,2).getValues().forEach(r => existing[r[0]] = true);
  wanted.forEach(row => { if (!existing[row[0]]) s.appendRow(row); });
}

/* --------------------------- WEBHOOK ------------------------------------ */
function doGet(e) {
  const p = (e && e.parameter) || {};
  // JSONP read for the web app:  ?action=read&secret=...&callback=fn
  if (p.action === 'read') {
    if (p.secret !== CONFIG.WEBHOOK_SECRET) return json_({ok:false, error:'Unauthorized'}, p.callback);
    return json_(readSnapshot_(), p.callback);
  }
  return json_({ok:true, version:CONFIG.VERSION, service:'Life OS'}, p.callback);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.secret !== CONFIG.WEBHOOK_SECRET) return json_({ok:false, error:'Unauthorized'});

    switch (body.action) {
      case 'add':    return json_(addRow_(body.tab, body.data || {}));
      case 'update': return json_(updateRow_(body.tab, body.id, body.data || {}));
      case 'read':   return json_(readSnapshot_());
      case 'sync':   return json_(syncAll_(body.data || {}));
      default:       return json_({ok:false, error:'Unknown action: '+body.action});
    }
  } catch (err) {
    log_('doPost','ERROR', String(err), 'FAIL');
    return json_({ok:false, error:String(err)});
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function json_(obj, callback) {
  const s = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback+'('+s+')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

/* row builders keyed by tab (webhook 'data' -> sheet row) */
function rowFor_(tab, id, d) {
  switch (tab) {
    case TABS.TASKS:     return [id, d.title||'', d.due||'', d.priority||'Medium', d.status||'Open', d.notes||'', d.created||nowStamp_(), d.committed||''];
    case TABS.SHOP:
    case TABS.PERSONAL:  return [id, d.date||isoDate_(bizToday_()), d.type||'Expense', d.account||'Cash in Hand', num_(d.amount), d.category||'', d.notes||''];
    case TABS.CREDIT:    return [id, d.date||isoDate_(bizToday_()), d.person||'', d.type||'Given', num_(d.amount), d.account||'Shop - Cash', d.status||'Pending', d.notes||''];
    case TABS.REMINDERS: return [id, d.category||'Payment', d.title||'', d.due||'', d.amount!==''&&d.amount!=null?num_(d.amount):'', d.lead||'3,1', d.channels||'Email+WhatsApp', d.recurrence||'None', d.notes||'', d.status||'Active','','', nowStamp_()];
    case TABS.IDEAS:     return [id, d.date||isoDate_(bizToday_()), d.idea||'', d.category||'', d.notes||''];
    default: return null;
  }
}
function num_(v){ const n = parseFloat(v); return isNaN(n)?'':n; }
function nowStamp_(){ return Utilities.formatDate(new Date(), CONFIG.TIMEZONE,'yyyy-MM-dd HH:mm'); }

function addRow_(tab, data) {
  if (!PREFIX[tab]) return {ok:false, error:'Unknown tab: '+tab};
  if ((tab===TABS.SHOP||tab===TABS.PERSONAL) && (num_(data.amount)===''|| !data.type || !data.account))
    return {ok:false, error:'Finance: type, account, numeric amount are required'};
  const s = sh_(tab);
  const id = nextId_(s, PREFIX[tab]);
  s.appendRow(rowFor_(tab, id, data));
  log_(id, 'Webhook', 'add '+tab, 'OK');
  return {ok:true, id:id, tab:tab};
}

function updateRow_(tab, id, data) {
  if (!PREFIX[tab]) return {ok:false, error:'Unknown tab: '+tab};
  const s = sh_(tab);
  const last = s.getLastRow();
  const ids = last>1 ? s.getRange(2,1,last-1,1).getValues() : [];
  const head = HEADERS[tab];
  for (let i=0;i<ids.length;i++){
    if (String(ids[i][0])===String(id)){
      const rowNum = i+2;
      const updated = [];
      Object.keys(data).forEach(k => {
        const col = colFor_(tab, k);
        if (col>0){ s.getRange(rowNum, col).setValue(data[k]); updated.push(k); }
      });
      log_(id,'Webhook','update '+tab+' '+updated.join(','),'OK');
      return {ok:true, id:id, updated:updated};
    }
  }
  return {ok:false, error:'ID not found: '+id};
}

/* map webhook field name -> column index for update */
function colFor_(tab, key) {
  const maps = {
    'Tasks':             {title:2,due:3,priority:4,status:5,notes:6,created:7,committed:8},
    'Shop Finances':     {date:2,type:3,account:4,amount:5,category:6,notes:7},
    'Personal Finances': {date:2,type:3,account:4,amount:5,category:6,notes:7},
    'Credit Ledger':     {date:2,person:3,type:4,amount:5,account:6,status:7,notes:8},
    'Reminders':         {category:2,title:3,due:4,amount:5,lead:6,channels:7,recurrence:8,notes:9,status:10},
    'Ideas':             {date:2,idea:3,category:4,notes:5},
  };
  return (maps[tab] && maps[tab][key]) || 0;
}

/* -------------------------- READ SNAPSHOT ------------------------------- */
function readSnapshot_() {
  const shop = ledgerBalance_(TABS.SHOP);
  const pers = ledgerBalance_(TABS.PERSONAL);
  const cp   = creditPending_();
  return {
    ok:true,
    version: CONFIG.VERSION,
    businessDate: isoDate_(bizToday_()),
    balances: { shop: shop, personal: pers },
    creditPending: cp,
    openTasks: openTasks_(),
    activeReminders: activeReminders_(),
  };
}

function readTab_(tab) {
  const s = sh_(tab); const last = s.getLastRow();
  if (last < 2) return [];
  const head = HEADERS[tab];
  return s.getRange(2,1,last-1,head.length).getValues().map(r => {
    const o = {}; head.forEach((h,i) => o[h] = r[i]); return o;
  });
}

function ledgerBalance_(tab) {
  let cash=0, bank=0;
  readTab_(tab).forEach(r => {
    const amt = Number(r['Amount'])||0;
    const sign = r['Type']==='Income' ? 1 : -1;
    if (r['Account']==='Bank') bank += sign*amt; else cash += sign*amt;
  });
  return { cash: round2_(cash), bank: round2_(bank), total: round2_(cash+bank) };
}
function creditPending_() {
  let owedToMe=0, iOwe=0;
  readTab_(TABS.CREDIT).forEach(c => {
    if (String(c['Status'])!=='Pending') return;
    const amt = Number(c['Amount'])||0;
    if (c['Type']==='Given') owedToMe += amt; else iOwe += amt;
  });
  return { owedToMe: round2_(owedToMe), iOwe: round2_(iOwe) };
}
function round2_(n){ return Math.round((Number(n)||0)*100)/100; }

function openTasks_() {
  return readTab_(TABS.TASKS).filter(t => String(t['Status'])!=='Done').map(t => ({
    id:t['ID'], title:t['Title'], due: t['Due Date']?isoDate_(t['Due Date']):'',
    priority:t['Priority'], committed:t['Committed'], notes:t['Notes']
  }));
}
function activeReminders_() {
  return readTab_(TABS.REMINDERS).filter(r => String(r['Status'])==='Active').map(r => ({
    id:r['ID'], title:r['Title'], due:r['Due Date']?isoDate_(r['Due Date']):'',
    amount:r['Amount'], recurrence:r['Recurrence']
  }));
}

/* ---------------------------- SYNC (web app push) ----------------------- */
/* Replaces each tab's data rows with the arrays sent by the web app.
   Payload keys: tasks, finances(shop), personal, credit, reminders, ideas   */
function syncAll_(data) {
  const map = [
    [TABS.TASKS,     data.tasks,     r => [r.id, r.title, r.due, r.priority, r.status, r.notes, r.created||'', r.committed||'']],
    [TABS.SHOP,      data.finances,  r => [r.id, r.date, r.type, r.account, num_(r.amount), r.category, r.notes]],
    [TABS.PERSONAL,  data.personal,  r => [r.id, r.date, r.type, r.account, num_(r.amount), r.category, r.notes]],
    [TABS.CREDIT,    data.credit,    r => [r.id, r.date, r.person, r.type, num_(r.amount), r.account, r.status, r.notes]],
    [TABS.REMINDERS, data.reminders, r => [r.id, r.category, r.title, r.due, r.amount!==''&&r.amount!=null?num_(r.amount):'', r.lead||'', r.channels||'Email+WhatsApp', r.recurrence, r.notes, r.status, r._sent||'', r._event||'', nowStamp_()]],
    [TABS.IDEAS,     data.ideas,     r => [r.id, r.date, r.idea, r.category, r.notes]],
  ];
  let total = 0;
  map.forEach(([tab, arr, fn]) => {
    if (!Array.isArray(arr)) return;
    const s = sh_(tab); const head = HEADERS[tab];
    const last = s.getLastRow();
    if (last > 1) s.getRange(2,1,last-1,head.length).clearContent();
    if (arr.length) s.getRange(2,1,arr.length,head.length).setValues(arr.map(fn));
    total += arr.length;
  });
  log_('sync','Webhook','rows='+total,'OK');
  return {ok:true, synced: total};
}

/* ---------------------------- MESSAGING --------------------------------- */
function sendEmail_(subject, htmlBody) {
  try {
    MailApp.sendEmail({ to: CONFIG.OWNER_EMAIL, subject: subject,
      htmlBody: htmlBody + '<br><br><span style="color:#888">'+CONFIG.SIGNATURE+'</span>' });
    log_(subject,'Email',CONFIG.OWNER_EMAIL,'OK');
    return true;
  } catch (e) { log_(subject,'Email',CONFIG.OWNER_EMAIL,'FAIL '+e); return false; }
}
function sendWhatsApp_(text) {
  try {
    const url = 'https://api.callmebot.com/whatsapp.php?phone='+encodeURIComponent(CONFIG.WHATSAPP_PHONE)
      + '&text=' + encodeURIComponent(text)
      + '&apikey=' + encodeURIComponent(CONFIG.CALLMEBOT_APIKEY);
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions:true });
    const code = resp.getResponseCode();
    log_('WhatsApp','WhatsApp','HTTP '+code, code<300?'OK':'FAIL');
    return code < 300;
  } catch (e) { log_('WhatsApp','WhatsApp',String(e),'FAIL'); return false; }
}

/* ----------------------------- REPORTS ---------------------------------- */
function runDayStart()    { dispatchReport_('DAY START'); clearOldCommitments_(); remindersEngine_(); }
function runEveningPush() { dispatchReport_('EVENING'); }
function runNightReview() { dispatchReport_('NIGHT REVIEW'); }
function sendTestReport() { dispatchReport_('TEST'); }

function dispatchReport_(kind) {
  const snap = readSnapshot_();
  const dateLabel = Utilities.formatDate(new Date(bizToday_()), CONFIG.TIMEZONE, 'EEE dd MMM yyyy');

  const committed = snap.openTasks.filter(t => String(t.committed)==='Yes');
  const overdueTasks = snap.openTasks.filter(t => t.due && daysUntil_(t.due) < 0);
  const dueRems = snap.activeReminders.filter(r => r.due && daysUntil_(r.due) <= 3)
    .sort((a,b)=> String(a.due).localeCompare(String(b.due)));

  // ---- WhatsApp (plain text) ----
  let w = '🗓️ Life OS — '+kind+'\n'+dateLabel+'\n';
  w += '\n💰 Shop: '+fmt_(snap.balances.shop.total)+' AED (Cash '+fmt_(snap.balances.shop.cash)+' / Bank '+fmt_(snap.balances.shop.bank)+')';
  w += '\n👛 Personal: '+fmt_(snap.balances.personal.total)+' AED';
  w += '\n🤝 Owed to me '+fmt_(snap.creditPending.owedToMe)+' | I owe '+fmt_(snap.creditPending.iOwe);

  if (kind==='DAY START') {
    w += '\n\n✅ Open tasks ('+snap.openTasks.length+'):';
    snap.openTasks.slice(0,12).forEach(t => w += '\n• ['+t.id+'] '+t.title+(t.priority?' ('+t.priority+')':''));
    w += '\n\nReply: "Commit T001, T003" to lock today.';
  } else {
    w += '\n\n⭐ Committed still open ('+committed.length+'):';
    committed.length ? committed.forEach(t => w += '\n• ['+t.id+'] '+t.title) : (w += '\n• none 🎉');
  }
  if (overdueTasks.length) { w += '\n\n⚠️ OVERDUE tasks:'; overdueTasks.forEach(t => w += '\n• ['+t.id+'] '+t.title); }
  if (dueRems.length) {
    w += '\n\n⏰ Reminders soon:';
    dueRems.forEach(r => { const d = daysUntil_(r.due); w += '\n• '+r.title+' '+(r.amount?fmt_(r.amount)+' AED ':'')+'('+(d<0?(-d)+'d overdue':d===0?'today':d+'d')+')'; });
  }
  w += '\n\n'+CONFIG.SIGNATURE;

  // ---- Email (html) ----
  const h = buildEmailHtml_(kind, dateLabel, snap, committed, overdueTasks, dueRems);

  sendEmail_('Life OS — '+kind+' · '+dateLabel, h);
  sendWhatsApp_(w);
}

function buildEmailHtml_(kind, dateLabel, snap, committed, overdueTasks, dueRems) {
  const li = arr => arr.length ? '<ul>'+arr.join('')+'</ul>' : '<p style="color:#888">none</p>';
  const taskLi = t => '<li><b>'+t.id+'</b> '+esc_(t.title)+(t.priority?' <span style="color:#b5820a">('+t.priority+')</span>':'')+'</li>';
  const remLi = r => { const d=daysUntil_(r.due); return '<li>'+esc_(r.title)+(r.amount?' — '+fmt_(r.amount)+' AED':'')+' <span style="color:'+(d<0?'#d0433b':'#b5820a')+'">('+(d<0?(-d)+'d overdue':d===0?'today':d+'d')+')</span></li>'; };
  return ''
    + '<div style="font-family:Arial,sans-serif;max-width:560px">'
    + '<h2 style="margin:0 0 4px">Life OS — '+kind+'</h2>'
    + '<div style="color:#666;margin-bottom:14px">'+dateLabel+'</div>'
    + '<table style="border-collapse:collapse;width:100%;margin-bottom:14px">'
    + tr_('Shop balance', fmt_(snap.balances.shop.total)+' AED &nbsp; <span style="color:#888">Cash '+fmt_(snap.balances.shop.cash)+' / Bank '+fmt_(snap.balances.shop.bank)+'</span>')
    + tr_('Personal balance', fmt_(snap.balances.personal.total)+' AED')
    + tr_('Owed to me', fmt_(snap.creditPending.owedToMe)+' AED')
    + tr_('I owe', fmt_(snap.creditPending.iOwe)+' AED')
    + '</table>'
    + (kind==='DAY START'
        ? '<h3>Open tasks</h3>'+li(snap.openTasks.map(taskLi))
        : '<h3>Committed — still open</h3>'+li(committed.map(taskLi)))
    + (overdueTasks.length ? '<h3 style="color:#d0433b">Overdue tasks</h3>'+li(overdueTasks.map(taskLi)) : '')
    + (dueRems.length ? '<h3>Reminders — next 3 days</h3>'+li(dueRems.map(remLi)) : '')
    + '</div>';
}
function tr_(k,v){ return '<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666">'+k+'</td><td style="padding:6px 10px;border-bottom:1px solid #eee"><b>'+v+'</b></td></tr>'; }
function esc_(s){ return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ---------------------- DAILY MAINTENANCE ------------------------------- */
function clearOldCommitments_() {
  const s = sh_(TABS.TASKS); const last = s.getLastRow();
  if (last < 2) return;
  const rng = s.getRange(2,8,last-1,1);           // column H = Committed
  const vals = rng.getValues().map(() => ['']);
  rng.setValues(vals);
  log_('clearCommitments','System','rows='+(last-1),'OK');
}

/* Reminders engine: fire lead-day + overdue alerts, roll recurring forward */
function remindersEngine_() {
  const s = sh_(TABS.REMINDERS); const last = s.getLastRow();
  if (last < 2) return;
  const data = s.getRange(2,1,last-1,HEADERS['Reminders'].length).getValues();

  for (let i=0;i<data.length;i++){
    const row = data[i]; const rowNum = i+2;
    const id=row[0], title=row[2], due=row[3], amount=row[4], lead=String(row[5]||''), channels=String(row[6]||'Email+WhatsApp'),
          recurrence=String(row[7]||'None'), status=String(row[9]||'Active');
    let sentFlags = String(row[10]||'');
    if (status!=='Active' || !due) continue;

    const d = daysUntil_(due);
    const leadDays = lead.split(',').map(x=>parseInt(x.trim(),10)).filter(n=>!isNaN(n));
    const already = sentFlags.split(',').map(x=>x.trim());

    // lead-day alerts
    if (leadDays.indexOf(d) >= 0 && already.indexOf(String(d)) < 0) {
      fireReminderAlert_(channels, title, amount, d);
      sentFlags = (sentFlags?sentFlags+',':'')+d;
      s.getRange(rowNum,11).setValue(sentFlags);
      log_(id,'Reminder','lead '+d+'d','OK');
    }

    // overdue
    if (d < 0 && already.indexOf('OVERDUE') < 0) {
      fireReminderAlert_(channels, title, amount, d);
      sentFlags = (sentFlags?sentFlags+',':'')+'OVERDUE';
      s.getRange(rowNum,11).setValue(sentFlags);
      log_(id,'Reminder','OVERDUE','OK');

      if (recurrence !== 'None') {
        const nextDue = addInterval_(due, recurrence);
        s.getRange(rowNum,4).setValue(isoDate_(nextDue));  // Due Date
        s.getRange(rowNum,11).setValue('');                // _SentFlags cleared
        s.getRange(rowNum,12).setValue('');                // _EventID cleared
        log_(id,'Reminder','rolled to '+isoDate_(nextDue),'OK');
      }
    }
  }
}
function fireReminderAlert_(channels, title, amount, d) {
  const when = d<0 ? (-d)+' days OVERDUE' : d===0 ? 'due TODAY' : 'due in '+d+' days';
  const line = '⏰ '+title+(amount?' — '+fmt_(amount)+' AED':'')+' is '+when+'.';
  const c = String(channels||'').toLowerCase();
  if (c==='all' || c.indexOf('email')>=0) sendEmail_('Reminder: '+title, '<p>'+esc_(line)+'</p>');
  if (c==='all' || c.indexOf('whatsapp')>=0) sendWhatsApp_(line);
  if ((c==='all' || c.indexOf('calendar')>=0) && CONFIG.ENABLE_CALENDAR) { /* best-effort, see docs */ }
}
function addInterval_(date, recurrence) {
  const d = new Date(date);
  if (recurrence==='Daily')   d.setDate(d.getDate()+1);
  if (recurrence==='Weekly')  d.setDate(d.getDate()+7);
  if (recurrence==='Monthly') d.setMonth(d.getMonth()+1);
  if (recurrence==='Yearly')  d.setFullYear(d.getFullYear()+1);
  return d;
}

/* ---------------------------- TRIGGERS ---------------------------------- */
function createTriggers() {
  // clear existing Life OS triggers first
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['runDayStart','runEveningPush','runNightReview'].indexOf(t.getHandlerFunction())>=0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runDayStart').timeBased().atHour(CONFIG.NUDGE.dayStart).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('runEveningPush').timeBased().atHour(CONFIG.NUDGE.eveningPush).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('runNightReview').timeBased().atHour(CONFIG.NUDGE.nightReview).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  log_('createTriggers','System','12/19/02','OK');
  toast_('3 daily triggers installed ✓');
}
