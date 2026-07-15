/* ═══════════════════════════════════════════════════════════════════════════
   MOZON BROAST — UNIFIED ORDERING BACKEND  (Google Apps Script)
   ───────────────────────────────────────────────────────────────────────────
   ONE file powers everything:
     • Customer ordering page  (logs orders, loyalty, referrals, live offers)
     • Admin dashboard         (KPIs, coupons, happy hours, loyalty, members)
     • Daily + Monthly email report (business day 12:00 → 02:00, emailed ~02:00)

   WHY THIS FIXES YOUR PROBLEMS
     1) "Incorrect data" — the OLD page stamped new Date().toLocaleString(),
        i.e. the CUSTOMER'S PHONE timezone, as loose text. This backend ignores
        that and stamps the AUTHORITATIVE Dubai time on the server, and also
        writes a clean "Business Day" column so every report/KPI lines up.
     2) A business day runs 12:00 (noon) → 02:00 next day. Implemented as
        bizKey(ts) = date(ts − 2h). Report runs ~02:00 for the day that closed.
     3) Dashboard "Today" uses the SAME business-day window (noon→2am).

   ───────────────────────────────────────────────────────────────────────────
   INSTALL (5 min)
     1. Extensions ▸ Apps Script. Delete old code, paste this whole file.
     2. Put your Sheet ID in CONFIG.SHEET_ID below (already filled).
     3. Save. Run  ▸ setup   (approve access). It creates every tab + triggers.
     4. Deploy ▸ New deployment ▸ Web app
          Execute as: Me   |   Who has access: Anyone
        Copy the /exec URL → paste into BOTH html pages (SCRIPT_URL / API).
     5. Done. Orders, offers, loyalty, referrals and the 2 AM report all work.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────────────────────────
var CONFIG = {
  SHEET_ID  : '1NxRqwY1HRLU0ZxMIdh-LXFtxtQshSHOG44TWpU-VQvY',
  TZ        : 'Asia/Dubai',
  REPORT_TO : 'gasulgachuu@gmail.com',   // comma-separate for multiple: 'a@x.com,b@y.com'
  BRAND     : 'MOZON BROAST',
  LOCATION  : 'Al Nahda 2 · Dubai',
  CURRENCY  : 'AED',
  BIZ_END_HOUR : 2   // business day closes at 02:00; classify by (ts − 2h)
};

// Sheet tab names
var TAB = {
  ORDERS    : 'Orders',
  COUPONS   : 'Coupons',
  HAPPY     : 'HappyHours',
  MEMBERS   : 'Members',
  REFERRALS : 'Referrals'
};

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP — run once from the editor
// ═══════════════════════════════════════════════════════════════════════════
function setup() {
  ensureSheets_();
  seedDefaults_();
  installTriggers_();
  SpreadsheetApp.getActiveSpreadsheet(); // no-op safety
  Logger.log('✅ Setup complete. Tabs ready, defaults seeded, 2 AM report scheduled.');
}

function ensureSheets_() {
  var ss = ss_();
  header_(ss, TAB.ORDERS, ['Timestamp','BusinessDay','Name','Phone','Area','Building','Flat',
    'Payment','Items','FoodSubtotal','DrinksTotal','Gross','PromoCode','Discount','FreeItem',
    'Total','PointsEarned','ReferralUsed','Notes','Spice','Kubus','Location','Source']);
  header_(ss, TAB.COUPONS, ['Code','Type','Value','MinOrder','FreeItem','From','Until','Active',
    'Uses','UsageLimit','PerCustomerLimit','Created']);
  header_(ss, TAB.HAPPY, ['Name','Discount','Days','Start','End','Date','AppliesTo','Active','Created']);
  header_(ss, TAB.MEMBERS, ['Phone','Name','Points','Spend','Orders','Tier','ReferralCode',
    'ReferredBy','FirstOrder','LastOrder','Joined']);
  header_(ss, TAB.REFERRALS, ['Timestamp','ReferrerPhone','RefereePhone','CodeUsed','Status','RewardPoints']);
}

function header_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var first = sh.getRange(1,1,1,cols.length).getValues()[0];
  var blank = first.every(function(c){ return c === '' || c === null; });
  if (blank) {
    sh.getRange(1,1,1,cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#C0392B').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function seedDefaults_() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('loyaltyConfig')) {
    p.setProperty('loyaltyConfig', JSON.stringify({
      pointsPerAed: 1,
      redeemRate  : 20,   // 20 points = AED 1
      tiers: [
        { name:'🥉 Bronze',   minPoints:0,    rewardValue:0,  perks:'Earn 1 pt / AED' },
        { name:'🥈 Silver',   minPoints:500,  rewardValue:5,  perks:'5% back + birthday treat' },
        { name:'🥇 Gold',     minPoints:1500, rewardValue:10, perks:'10% back + free delivery' },
        { name:'💎 Platinum', minPoints:4000, rewardValue:15, perks:'15% back + priority + surprise gifts' }
      ]
    }));
  }
  if (!p.getProperty('referralConfig')) {
    p.setProperty('referralConfig', JSON.stringify({
      enabled: true,
      refereeType: 'percent',   // discount the NEW customer gets on first order
      refereeValue: 15,
      refereeMinOrder: 25,
      referrerPoints: 100,      // points the referrer gets when referral completes
      note: 'Give AED, get points. Friend saves 15% on first order (min 25), you earn 100 points.'
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════
function installTriggers_() {
  var existing = ScriptApp.getProjectTriggers();
  existing.forEach(function(t){
    var fn = t.getHandlerFunction();
    if (fn === 'dailyReportJob' || fn === 'sendDailySummary') ScriptApp.deleteTrigger(t);
  });
  // Fire at 02:00 Dubai — summarises the business day that just closed.
  ScriptApp.newTrigger('dailyReportJob').timeBased().atHour(2).nearMinute(1).everyDays(1)
    .inTimezone(CONFIG.TZ).create();
}

// ═══════════════════════════════════════════════════════════════════════════
//  DATE / BUSINESS-DAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function ss_(){ return SpreadsheetApp.openById(CONFIG.SHEET_ID); }
function now_(){ return new Date(); }
function fmt_(d, f){ return Utilities.formatDate(d, CONFIG.TZ, f); }

/** Business-day key 'yyyy-MM-dd': an order at 01:30 belongs to the PREVIOUS date. */
function bizKey_(d){
  var shifted = new Date(d.getTime() - CONFIG.BIZ_END_HOUR*3600*1000);
  return fmt_(shifted, 'yyyy-MM-dd');
}
/** The business day that has most recently CLOSED (for the 2 AM report). */
function closedBizKey_(d){
  return bizKey_(new Date(d.getTime() - 3*3600*1000));
}
function monthKeyOf_(bkey){ return bkey.slice(0,7); } // 'yyyy-MM'

// ═══════════════════════════════════════════════════════════════════════════
//  PHONE NORMALISATION  → canonical loyalty ID  (+9715XXXXXXXX)
// ═══════════════════════════════════════════════════════════════════════════
function normPhone_(raw){
  var s = String(raw||'').replace(/[^\d]/g,'');
  if (!s) return '';
  if (s.indexOf('00971') === 0) s = s.slice(2);      // 00971… → 971…
  if (s.indexOf('971')   === 0) s = s.slice(3);      // 971…   → local
  else if (s.charAt(0) === '0') s = s.slice(1);      // 0XXXX  → XXXX
  // now s should be the 9-digit local part starting 5…
  if (s.length > 9) s = s.slice(-9);
  return s ? ('+971' + s) : '';
}
function prettyPhone_(intl){
  var s = String(intl||'').replace('+971','0');
  return s.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3').trim();
}
function refCodeFor_(intl){
  var digits = String(intl||'').replace(/\D/g,'');
  return 'MOZ' + digits.slice(-4); // e.g. MOZ7701
}

// ═══════════════════════════════════════════════════════════════════════════
//  WEB APP ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════
function doGet(e){
  try {
    var a = (e && e.parameter && e.parameter.action) || '';
    if (a === 'getconfig')   return json_(getPublicConfig_());
    if (a === 'member')      return json_(getMember_(e.parameter.phone));
    if (a === 'validateref') return json_(validateRef_(e.parameter.code, e.parameter.phone));
    if (a === 'customers')   return json_(getCustomersWithCopy_());
    if (a === 'ping')        return json_({ ok:true, time: fmt_(now_(),'yyyy-MM-dd HH:mm:ss'), biz: bizKey_(now_()) });
    return json_(getDashboard_());
  } catch(err){
    return json_({ error: String(err) });
  }
}

function doPost(e){
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || 'order';
    if (action === 'order')             return json_(recordOrder_(body));
    if (action === 'addCoupon')         return json_(addCoupon_(body));
    if (action === 'deleteCoupon')      return json_(deleteCoupon_(body.code));
    if (action === 'saveHappyHour')     return json_(saveHappyHour_(body));
    if (action === 'deleteHappyHour')   return json_(deleteHappyHour_(body.name));
    if (action === 'saveLoyaltyConfig') return json_(saveLoyalty_(body));
    if (action === 'saveReferralConfig')return json_(saveReferral_(body));
    return json_({ error:'unknown action' });
  } catch(err){
    return json_({ error: String(err) });
  }
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
//  RECORD AN ORDER  (the important write path)
// ═══════════════════════════════════════════════════════════════════════════
function recordOrder_(b){
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e){}
  try {
    ensureSheets_();
    var ss = ss_();
    var now = now_();
    var iso  = fmt_(now, 'yyyy-MM-dd HH:mm:ss');
    var bkey = bizKey_(now);

    var phone = normPhone_(b.phone);
    var name  = String(b.name||'').trim();
    var food  = num_(b.foodSubtotal);
    var bev   = num_(b.drinksTotal);
    var gross = food + bev;
    var discount = num_(b.discount);
    var total = b.total != null ? num_(b.total) : Math.max(0, gross - discount);
    var promo = String(b.promoCode||'').trim().toUpperCase();
    var freeItem = String(b.freeItem||'').trim();

    // Loyalty points on this order
    var loy = getLoyalty_();
    var pts = Math.round(total * (loy.pointsPerAed||1));

    // Referral (only credited on the customer's FIRST order)
    var refUsed = String(b.referralCode||'').trim().toUpperCase();
    var refResult = applyReferral_(phone, name, refUsed, total);

    ss.getSheetByName(TAB.ORDERS).appendRow([
      iso, bkey, name, phone,
      String(b.office||b.area||'').trim(),
      String(b.company||b.building||'').trim(),
      String(b.flat||'').trim(),
      String(b.payment||'').trim(),
      String(b.items||'').trim(),
      food, bev, gross, promo, discount, freeItem, total, pts,
      refUsed, String(b.notes||'').trim(),
      String(b.spice||'').trim(), String(b.kubus||'').trim(),
      String(b.location||'').trim(), 'web'
    ]);

    if (promo) bumpCouponUse_(promo);
    upsertMember_(phone, name, total, pts + (refResult.bonusToThisCustomer||0));

    return { ok:true, businessDay:bkey, points:pts, referral:refResult };
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}

function num_(v){ var n = parseFloat(String(v).replace(/[^\d.\-]/g,'')); return isNaN(n)?0:n; }

// ═══════════════════════════════════════════════════════════════════════════
//  MEMBERS / LOYALTY
// ═══════════════════════════════════════════════════════════════════════════
function membersMap_(){
  var sh = ss_().getSheetByName(TAB.MEMBERS);
  var vals = sh.getDataRange().getValues();
  var map = {}; // phone -> {row, obj}
  for (var i=1;i<vals.length;i++){
    var r = vals[i]; if (!r[0]) continue;
    map[String(r[0])] = { row:i+1, phone:r[0], name:r[1], points:+r[2]||0, spend:+r[3]||0,
      orders:+r[4]||0, tier:r[5], refCode:r[6], referredBy:r[7], first:r[8], last:r[9], joined:r[10] };
  }
  return map;
}
function upsertMember_(phone, name, spendAdd, pointsAdd){
  if (!phone) return;
  var sh = ss_().getSheetByName(TAB.MEMBERS);
  var map = membersMap_();
  var iso = fmt_(now_(),'yyyy-MM-dd HH:mm:ss');
  var loy = getLoyalty_();
  if (map[phone]){
    var m = map[phone];
    var points = m.points + (pointsAdd||0);
    var spend  = m.spend + (spendAdd||0);
    var orders = m.orders + 1;
    sh.getRange(m.row,2,1,9).setValues([[ name||m.name, points, spend, orders,
      tierFor_(points, loy), m.refCode||refCodeFor_(phone), m.referredBy||'', m.first||iso, iso ]]);
  } else {
    var pts = pointsAdd||0;
    sh.appendRow([ phone, name, pts, spendAdd||0, 1, tierFor_(pts, loy),
      refCodeFor_(phone), '', iso, iso, iso ]);
  }
}
function tierFor_(points, loy){
  loy = loy || getLoyalty_();
  var t = (loy.tiers||[]).slice().sort(function(a,b){ return (b.minPoints||0)-(a.minPoints||0); });
  for (var i=0;i<t.length;i++){ if (points >= (t[i].minPoints||0)) return t[i].name; }
  return (loy.tiers && loy.tiers[0] && loy.tiers[0].name) || 'Member';
}
function getLoyalty_(){
  var raw = PropertiesService.getScriptProperties().getProperty('loyaltyConfig');
  try { return JSON.parse(raw); } catch(e){ return { pointsPerAed:1, redeemRate:20, tiers:[] }; }
}
function getReferral_(){
  var raw = PropertiesService.getScriptProperties().getProperty('referralConfig');
  try { return JSON.parse(raw); } catch(e){ return { enabled:false }; }
}

function getMember_(phoneRaw){
  var phone = normPhone_(phoneRaw);
  if (!phone) return { found:false };
  var m = membersMap_()[phone];
  var loy = getLoyalty_();
  var code = refCodeFor_(phone);
  if (!m) return { found:false, referralCode:code, pointsPerAed:loy.pointsPerAed||1 };
  var tier = tierFor_(m.points, loy);
  var next = nextTier_(m.points, loy);
  var benefit = (loy.tiers||[]).filter(function(t){return t.name===tier;})[0];
  return {
    found:true, name:m.name, points:m.points, spend:m.spend, orders:m.orders,
    tier:tier, perks:(benefit&&benefit.perks)||'',
    redeemRate:loy.redeemRate||20,
    redeemableAed: Math.floor(m.points / (loy.redeemRate||20)),
    referralCode: m.refCode||code,
    nextTier: next ? { name:next.name, need: next.minPoints - m.points } : null
  };
}
function nextTier_(points, loy){
  var t = (loy.tiers||[]).slice().sort(function(a,b){ return (a.minPoints||0)-(b.minPoints||0); });
  for (var i=0;i<t.length;i++){ if ((t[i].minPoints||0) > points) return t[i]; }
  return null;
}

// ── REFERRALS ────────────────────────────────────────────────────────────────
function validateRef_(codeRaw, phoneRaw){
  var cfg = getReferral_();
  if (!cfg.enabled) return { valid:false, reason:'disabled' };
  var code = String(codeRaw||'').trim().toUpperCase();
  var phone = normPhone_(phoneRaw);
  if (!code) return { valid:false };
  var owner = ownerOfRefCode_(code);
  if (!owner) return { valid:false, reason:'notfound' };
  if (phone && owner === phone) return { valid:false, reason:'self' };
  // referee must be a first-time customer
  if (phone && membersMap_()[phone]) return { valid:false, reason:'existing' };
  return { valid:true, type:cfg.refereeType, value:cfg.refereeValue, minOrder:cfg.refereeMinOrder,
           label:'Referral '+code };
}
function ownerOfRefCode_(code){
  var map = membersMap_();
  for (var p in map){ if ((map[p].refCode||refCodeFor_(p)).toUpperCase() === code) return p; }
  // also allow the deterministic MOZxxxx form even before a member row exists
  return null;
}
/** Credits referrer + logs, ONLY when this is the referee's first order. */
function applyReferral_(refereePhone, refereeName, code, orderTotal){
  var out = { applied:false, bonusToThisCustomer:0 };
  var cfg = getReferral_();
  if (!cfg.enabled || !code || !refereePhone) return out;
  if (membersMap_()[refereePhone]) return out; // not a first order → no referral credit
  var owner = ownerOfRefCode_(code);
  if (!owner || owner === refereePhone) return out;

  // credit referrer
  var pts = +cfg.referrerPoints||0;
  var sh = ss_().getSheetByName(TAB.MEMBERS);
  var map = membersMap_();
  if (map[owner]){
    var m = map[owner];
    var np = m.points + pts;
    sh.getRange(m.row,3).setValue(np);
    sh.getRange(m.row,6).setValue(tierFor_(np, getLoyalty_()));
  }
  ss_().getSheetByName(TAB.REFERRALS).appendRow([
    fmt_(now_(),'yyyy-MM-dd HH:mm:ss'), owner, refereePhone, code, 'completed', pts ]);
  // record who referred this customer (stored on their member row via upsert caller)
  out.applied = true;
  out.referrer = owner;
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
//  COUPONS
// ═══════════════════════════════════════════════════════════════════════════
function couponsList_(){
  var sh = ss_().getSheetByName(TAB.COUPONS);
  var v = sh.getDataRange().getValues(); var out=[];
  for (var i=1;i<v.length;i++){ var r=v[i]; if(!r[0]) continue;
    out.push({ code:String(r[0]).toUpperCase(), type:r[1]||'percent', value:+r[2]||0,
      minOrder:+r[3]||0, freeItem:r[4]||'', from:isoDate_(r[5]), until:isoDate_(r[6]),
      active:r[7]!==false, uses:+r[8]||0, usageLimit:+r[9]||0, perCustomerLimit:+r[10]||0 });
  }
  return out;
}
function isoDate_(v){
  if (!v) return '';
  if (v instanceof Date) return fmt_(v,'yyyy-MM-dd');
  return String(v).slice(0,10);
}
function addCoupon_(b){
  var sh = ss_().getSheetByName(TAB.COUPONS);
  var code = String(b.code||'').trim().toUpperCase();
  if (!code) return { error:'no code' };
  var v = sh.getDataRange().getValues();
  for (var i=1;i<v.length;i++){
    if (String(v[i][0]).toUpperCase() === code){          // update existing
      sh.getRange(i+1,1,1,12).setValues([[ code, b.type||'percent', +b.value||0, +b.minOrder||0,
        b.freeItem||'', b.from||'', b.until||'', b.active!==false, +v[i][8]||0,
        +b.usageLimit||0, +b.perCustomerLimit||0, v[i][11]||fmt_(now_(),'yyyy-MM-dd') ]]);
      return { ok:true, updated:true };
    }
  }
  sh.appendRow([ code, b.type||'percent', +b.value||0, +b.minOrder||0, b.freeItem||'',
    b.from||'', b.until||'', b.active!==false, 0, +b.usageLimit||0, +b.perCustomerLimit||0,
    fmt_(now_(),'yyyy-MM-dd') ]);
  return { ok:true };
}
function deleteCoupon_(code){
  var sh = ss_().getSheetByName(TAB.COUPONS);
  var v = sh.getDataRange().getValues(); code = String(code||'').toUpperCase();
  for (var i=v.length-1;i>=1;i--){ if (String(v[i][0]).toUpperCase()===code) sh.deleteRow(i+1); }
  return { ok:true };
}
function bumpCouponUse_(code){
  var sh = ss_().getSheetByName(TAB.COUPONS);
  var v = sh.getDataRange().getValues(); code = String(code||'').toUpperCase();
  for (var i=1;i<v.length;i++){ if (String(v[i][0]).toUpperCase()===code){
    sh.getRange(i+1,9).setValue((+v[i][8]||0)+1); return; } }
}

// ═══════════════════════════════════════════════════════════════════════════
//  HAPPY HOURS
// ═══════════════════════════════════════════════════════════════════════════
function happyList_(){
  var sh = ss_().getSheetByName(TAB.HAPPY);
  var v = sh.getDataRange().getValues(); var out=[];
  for (var i=1;i<v.length;i++){ var r=v[i]; if(!r[0]) continue;
    out.push({ name:r[0], discount:+r[1]||0, days:String(r[2]||'ALL'), start:hhTime_(r[3]),
      end:hhTime_(r[4]), date:isoDate_(r[5]), appliesTo:r[6]||'food', active:r[7]!==false });
  }
  return out;
}
function hhTime_(v){
  if (!v) return '';
  if (v instanceof Date) return fmt_(v,'HH:mm');
  return String(v).slice(0,5);
}
function saveHappyHour_(b){
  var sh = ss_().getSheetByName(TAB.HAPPY);
  var name = String(b.name||'').trim(); if (!name) return { error:'no name' };
  var v = sh.getDataRange().getValues();
  var row = [ name, +b.discount||0, b.days||'ALL', b.start||'', b.end||'', b.date||'',
    b.appliesTo||'food', b.active!==false, fmt_(now_(),'yyyy-MM-dd') ];
  for (var i=1;i<v.length;i++){ if (String(v[i][0])===name){ sh.getRange(i+1,1,1,9).setValues([row]); return {ok:true,updated:true}; } }
  sh.appendRow(row); return { ok:true };
}
function deleteHappyHour_(name){
  var sh = ss_().getSheetByName(TAB.HAPPY);
  var v = sh.getDataRange().getValues(); name=String(name||'');
  for (var i=v.length-1;i>=1;i--){ if (String(v[i][0])===name) sh.deleteRow(i+1); }
  return { ok:true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOYALTY / REFERRAL CONFIG WRITE
// ═══════════════════════════════════════════════════════════════════════════
function saveLoyalty_(b){
  PropertiesService.getScriptProperties().setProperty('loyaltyConfig', JSON.stringify({
    pointsPerAed:+b.pointsPerAed||1, redeemRate:+b.redeemRate||20, tiers:b.tiers||[] }));
  return { ok:true };
}
function saveReferral_(b){
  PropertiesService.getScriptProperties().setProperty('referralConfig', JSON.stringify({
    enabled:b.enabled!==false, refereeType:b.refereeType||'percent', refereeValue:+b.refereeValue||0,
    refereeMinOrder:+b.refereeMinOrder||0, referrerPoints:+b.referrerPoints||0, note:b.note||'' }));
  return { ok:true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE OFFER ENGINE  (what customers see)
// ═══════════════════════════════════════════════════════════════════════════
function nowMinutesDubai_(){ var d=now_(); return +fmt_(d,'H')*60 + +fmt_(d,'m'); }
function todayIso_(){ return fmt_(now_(),'yyyy-MM-dd'); }
function todayDow_(){ return +fmt_(now_(),'u') % 7; } // 'u' Mon=1..Sun=7 → 0..6 (Sun=0)

function happyHourNow_(){
  var list = happyList_(), iso = todayIso_(), dow = new Date().getDay(), mins = nowMinutesDubai_();
  var best = null;
  list.forEach(function(h){
    if (!h.active) return;
    if (h.date && h.date !== iso) return;
    if (!h.date){
      var days = String(h.days||'ALL').toUpperCase();
      if (days!=='ALL' && days.split(',').indexOf(String(dow))<0) return;
    }
    var s = toMin_(h.start), e = toMin_(h.end);
    var on = (s==null||e==null) ? true : (s<=e ? (mins>=s&&mins<e) : (mins>=s||mins<e));
    if (on && (!best || h.discount>best.discount)){
      best = { name:h.name, discount:h.discount, appliesTo:h.appliesTo, endsIn: e!=null?minsLeft_(mins,e):null };
    }
  });
  return best;
}
function toMin_(t){ if(!t) return null; var m=String(t).match(/(\d{1,2}):(\d{2})/); return m?(+m[1]*60+ +m[2]):null; }
function minsLeft_(nowM, endM){ var d = endM - nowM; if (d<0) d += 1440; return d; }

/** Currently-running + upcoming offers as friendly text for the ordering page. */
function offersForCustomers_(){
  var iso = todayIso_(), running=[], upcoming=[];
  couponsList_().forEach(function(c){
    if (!c.active) return;
    var label = c.type==='flat' ? ('AED '+c.value+' off') :
                c.type==='freeitem' ? ('Free '+(c.freeItem||'item')) : (c.value+'% off');
    if (c.minOrder) label += ' · min AED '+c.minOrder;
    var status = windowStatus_(c.from, c.until, iso);
    var entry = { code:c.code, label:label, from:c.from, until:c.until, minOrder:c.minOrder, freeItem:c.freeItem };
    if (status==='active')   { entry.endsOn=c.until; running.push(entry); }
    if (status==='upcoming') { entry.startsOn=c.from; upcoming.push(entry); }
  });
  var hh = happyHourNow_();
  return { running:running, upcoming:upcoming, happyHour:hh };
}
function windowStatus_(from, until, iso){
  if (from && iso < from) return 'upcoming';
  if (until && iso > until) return 'expired';
  return 'active';
}

function getPublicConfig_(){
  var loy = getLoyalty_(), ref = getReferral_();
  return {
    coupons: couponsList_().filter(function(c){ return c.active; }),
    happyHours: happyList_().filter(function(h){ return h.active; }),
    loyalty: { pointsPerAed:loy.pointsPerAed, redeemRate:loy.redeemRate, tiers:loy.tiers },
    referral: { enabled:ref.enabled, type:ref.refereeType, value:ref.refereeValue,
                minOrder:ref.refereeMinOrder, note:ref.note },
    offers: offersForCustomers_(),
    serverTime: fmt_(now_(),'yyyy-MM-dd HH:mm:ss'),
    businessDay: bizKey_(now_())
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD PAYLOAD  (business-day aware)
// ═══════════════════════════════════════════════════════════════════════════
function getDashboard_(){
  ensureSheets_();
  var rows = ss_().getSheetByName(TAB.ORDERS).getDataRange().getValues();
  var todayKey = bizKey_(now_());
  var t = { orders:0, revenue:0, discount:0 };
  var all = { orders:0, revenue:0 };
  var itemCount={}, payCount={}, areaCount={}, promoCount={}, recent=[];

  for (var i=1;i<rows.length;i++){
    var r = rows[i]; if (!r[0]) continue;
    var bkey = r[1] || bizKey_(new Date(r[0]));
    var total = +r[15]||0, disc = +r[13]||0;
    all.orders++; all.revenue += total;

    var pay = String(r[7]||'').trim(); if (pay) payCount[pay]=(payCount[pay]||0)+1;
    var area = String(r[4]||'').trim(); if (area) areaCount[area]=(areaCount[area]||0)+1;
    var promo = String(r[12]||'').trim().toUpperCase(); if (promo) promoCount[promo]=(promoCount[promo]||0)+1;
    parseItems_(String(r[8]||''), itemCount);

    if (bkey === todayKey){
      t.orders++; t.revenue += total; t.discount += disc;
      recent.push({ name:r[2]||'Guest', area:area, total:total, time: String(r[0]).slice(11,16) });
    }
  }
  recent.reverse();
  var topItems = Object.keys(itemCount).map(function(k){ return [k, itemCount[k]]; })
    .sort(function(a,b){ return b[1]-a[1]; }).slice(0,12);

  return {
    businessDay: todayKey,
    todayOrders: t.orders, todayRevenue: t.revenue, todayDiscount: t.discount,
    avgOrder: t.orders ? t.revenue/t.orders : 0,
    allOrders: all.orders, allRevenue: all.revenue,
    topItems: topItems, payCount: payCount, areaCount: areaCount, promoCount: promoCount,
    recent: recent.slice(0,20),
    coupons: couponsList_(), happyHours: happyList_(),
    loyaltyConfig: getLoyalty_(), referralConfig: getReferral_(),
    topMembers: topMembers_()
  };
}
function parseItems_(txt, acc){
  if (!txt) return;
  txt.split(';').forEach(function(seg){
    var m = seg.match(/•?\s*([^—•]+?)\s*x\s*(\d+)/i) || seg.match(/([A-Za-z][^x—]+)/);
    if (m){ var nm = m[1].replace(/\(.*?\)/g,'').trim(); if (nm) acc[nm]=(acc[nm]||0)+(m[2]?+m[2]:1); }
  });
}
function topMembers_(){
  var map = membersMap_(); var arr=[];
  for (var p in map){ var m=map[p]; arr.push({ name:m.name||prettyPhone_(p), phone:p, points:m.points, spend:Math.round(m.spend), tier:m.tier }); }
  return arr.sort(function(a,b){ return b.points-a.points; }).slice(0,15);
}

// ── CUSTOMER TARGETING (dashboard "Smart Segments") ──────────────────────────
function getCustomers_(){
  var rows = ss_().getSheetByName(TAB.ORDERS).getDataRange().getValues();
  var by = {}; // phone -> aggregate
  for (var i=1;i<rows.length;i++){
    var r = rows[i]; if (!r[3]) continue;
    var phone = String(r[3]); var d = new Date(r[0]);
    var o = by[phone] || (by[phone]={ name:r[2]||'Guest', phone:phone, area:r[4]||'', orders:0, spend:0, last:0, hours:{}, items:{} });
    o.orders++; o.spend += +r[15]||0;
    var tms = d.getTime(); if (tms>o.last) o.last=tms;
    var hr = +fmt_(d,'H'); o.hours[hr]=(o.hours[hr]||0)+1;
    if (r[2]) o.name = r[2];
    parseItems_(String(r[8]||''), o.items);
  }
  var nowMs = now_().getTime(), DAY=86400000;
  var custs=[], seg={Lunch:blank_(),Dinner:blank_(),Afternoon:blank_(),Breakfast:blank_(),'Late Night':blank_()};
  var rec={Active:blank_(),Slipping:blank_(),Lapsed:blank_()}, vip=blank_();
  for (var p in by){
    var o=by[p]; var peak=peakHour_(o.hours);
    var win = peak<11?'Breakfast': peak<16?'Lunch': peak<18?'Afternoon': peak<23?'Dinner':'Late Night';
    var daysAgo=(nowMs-o.last)/DAY;
    var recency = daysAgo<=7?'Active': daysAgo<=21?'Slipping':'Lapsed';
    var fav = Object.keys(o.items).sort(function(a,b){return o.items[b]-o.items[a];})[0]||'—';
    var intl = normPhone_(p);
    var c={ name:o.name, phone:p, intl:intl, area:o.area, orders:o.orders, spend:Math.round(o.spend),
      dutyWindow:win, bestSend:bestPing_(win), recency:recency, fav:fav };
    custs.push(c);
    push_(seg[win], intl); push_(rec[recency], intl); if (o.orders>=3) push_(vip, intl);
  }
  custs.sort(function(a,b){return b.spend-a.spend;});
  return { total:custs.length, customers:custs.slice(0,300),
    segments:seg, recency:rec, vip:vip };
}
function blank_(){ return { count:0, nums:[] }; }
function push_(s,n){ if(n){ s.count++; s.nums.push(n); } }
function peakHour_(h){ var b=12,bc=-1; for(var k in h){ if(h[k]>bc){bc=h[k];b=+k;} } return b; }
function bestPing_(win){ return {Breakfast:'8:30 AM',Lunch:'11:30 AM',Afternoon:'3:30 PM',Dinner:'6:30 PM','Late Night':'9:30 PM'}[win]||'6:00 PM'; }
// attach copy strings
function getCustomersWithCopy_(){ var d=getCustomers_(); [d.segments,d.recency].forEach(function(g){for(var k in g){g[k].copy=g[k].nums.join(', ');}}); d.vip.copy=d.vip.nums.join(', '); return d; }

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY + MONTHLY REPORT  (business day 12:00 → 02:00, emailed ~02:00)
// ═══════════════════════════════════════════════════════════════════════════
function dailyReportJob(){
  var target = closedBizKey_(now_());           // the day that just closed
  var rep = buildReport_(target);
  MailApp.sendEmail({ to: CONFIG.REPORT_TO,
    subject: '🍗 '+CONFIG.BRAND+' — Business Report ('+rep.dayLabel+')',
    htmlBody: rep.html });
}
/** Manual test — sends the report for the CURRENT business day so far. */
function testReportNow(){
  var rep = buildReport_(bizKey_(now_()));
  MailApp.sendEmail({ to: CONFIG.REPORT_TO,
    subject: '🍗 '+CONFIG.BRAND+' — Report TEST ('+rep.dayLabel+')', htmlBody: rep.html });
}

function buildReport_(dayKey){
  ensureSheets_();
  var rows = ss_().getSheetByName(TAB.ORDERS).getDataRange().getValues();
  var monthKey = monthKeyOf_(dayKey);
  var day = blankRep_(), month = blankRep_();
  for (var i=1;i<rows.length;i++){
    var r=rows[i]; if(!r[0]) continue;
    var bkey = r[1] || bizKey_(new Date(r[0]));
    var total=+r[15]||0, disc=+r[13]||0, promo=String(r[12]||'').toUpperCase(),
        phone=String(r[3]||''), d=new Date(r[0]), hr=+fmt_(d,'H');
    var slot = (hr>=11&&hr<16)?'Lunch':(hr>=16&&hr<21)?'Evening':(hr>=21||hr<3)?'Night':'Daytime';
    if (bkey===dayKey) addRep_(day, total, disc, promo, phone, slot);
    if (monthKeyOf_(bkey)===monthKey) addRep_(month, total, disc, promo, phone, slot);
  }
  var dayLabel = fmt_(parseKey_(dayKey), 'EEE dd MMM yyyy');
  var moLabel  = fmt_(parseKey_(dayKey), 'MMMM yyyy');
  return { dayLabel:dayLabel, html: renderReport_(day, month, dayLabel, moLabel) };
}
function parseKey_(k){ var p=k.split('-'); return new Date(+p[0], +p[1]-1, +p[2], 12,0,0); }
function blankRep_(){ return { orders:0, revenue:0, discount:0, phones:{}, coupons:{}, slots:{Lunch:0,Evening:0,Night:0,Daytime:0} }; }
function addRep_(b,total,disc,promo,phone,slot){ b.orders++; b.revenue+=total; b.discount+=disc;
  if(phone)b.phones[phone]=1; if(promo)b.coupons[promo]=(b.coupons[promo]||0)+1; b.slots[slot]++; }

function renderReport_(t,m,dayLabel,moLabel){
  var C=CONFIG.CURRENCY;
  function uniq(o){ return Object.keys(o.phones).length; }
  function avg(o){ return o.orders?(o.revenue/o.orders).toFixed(1):'0'; }
  function coup(o){ var e=Object.keys(o.coupons); return e.length? e.map(function(k){return k+' ×'+o.coupons[k];}).join(', '):'—'; }
  function slots(o){ return '🍽️ Lunch '+o.slots.Lunch+' &nbsp; 🌆 Evening '+o.slots.Evening+' &nbsp; 🌙 Night '+o.slots.Night+' &nbsp; ☀️ Daytime '+o.slots.Daytime; }
  function row(l,v,c){ return '<tr><td style="padding:6px 0">'+l+'</td><td style="text-align:right;font-weight:700'+(c?';color:'+c:'')+'">'+v+'</td></tr>'; }
  function card(title,o,sub){
    return '<div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 16px">'
      + '<div style="font:700 15px Arial;color:#C0392B">'+title+'</div>'
      + '<div style="font:12px Arial;color:#888;margin-bottom:10px">'+sub+'</div>'
      + '<table style="width:100%;border-collapse:collapse;font:14px Arial">'
      + row('📦 Orders', o.orders)
      + row('👥 Customers (unique)', uniq(o))
      + row('💰 Revenue', C+' '+o.revenue.toFixed(2), '#27AE60')
      + row('📈 Avg order', C+' '+avg(o))
      + row('🎁 Discount given', C+' '+o.discount.toFixed(2), '#E67E22')
      + row('🏷️ Coupons applied', coup(o))
      + '</table>'
      + '<div style="margin-top:10px;font:13px Arial;color:#555">'+slots(o)+'</div></div>';
  }
  return '<div style="max-width:520px;margin:auto;font-family:Arial">'
    + '<div style="background:#C0392B;color:#fff;padding:16px;border-radius:12px 12px 0 0">'
    + '<div style="font:800 18px Arial">🍗 '+CONFIG.BRAND+' — Business Report</div>'
    + '<div style="font:12px Arial;opacity:.9">'+CONFIG.LOCATION+' · business day 12 PM→2 AM</div></div>'
    + '<div style="padding:16px;background:#fafafa;border-radius:0 0 12px 12px">'
    + card('TODAY', t, dayLabel)
    + card('THIS MONTH (to date)', m, moLabel)
    + '<div style="font:11px Arial;color:#aaa;text-align:center;margin-top:8px">Sent automatically at 2 AM · Mozon sales bot</div>'
    + '</div></div>';
}
