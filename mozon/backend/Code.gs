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
        writes a clean "BusinessDay" column so every report/KPI lines up.
        Orders are read/written BY COLUMN NAME, so your existing Orders tab is
        never clobbered — missing columns are simply added at the end.
     2) A business day runs 12:00 (noon) → 02:00 next day. Implemented as
        bizKey(ts) = date(ts − 2h). Report runs ~02:00 for the day that closed.
     3) Dashboard "Today" uses the SAME business-day window (noon→2am).

   ───────────────────────────────────────────────────────────────────────────
   INSTALL (5 min)
     1. Extensions ▸ Apps Script. Delete old code, paste this whole file.
     2. CONFIG.SHEET_ID below is already filled with your sheet.
     3. Save. Run ▸ setup   (approve access). It creates/updates every tab and
        schedules the 2 AM report. The execution log prints exactly what it did.
     4. Deploy ▸ New deployment ▸ Web app
          Execute as: Me   |   Who has access: Anyone
        Copy the /exec URL → paste into BOTH html pages (SCRIPT_URL / API).
   ═══════════════════════════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────────────────────────
var CONFIG = {
  SHEET_ID  : '1NxRqwY1HRLU0ZxMIdh-LXFtxtQshSHOG44TWpU-VQvY',
  TZ        : 'Asia/Dubai',
  REPORT_TO : 'gasulgachuu@gmail.com',   // comma-separate for multiple recipients
  BRAND     : 'MOZON BROAST',
  LOCATION  : 'Al Nahda 2 · Dubai',
  CURRENCY  : 'AED',
  BIZ_END_HOUR : 2   // business day closes at 02:00; classify by (ts − 2h)
};

var TAB = { ORDERS:'Orders', COUPONS:'Coupons', HAPPY:'HappyHours', MEMBERS:'Members', REFERRALS:'Referrals' };

// Canonical column layouts (accessed by NAME, never by fixed position)
var ORDER_COLS = ['Timestamp','BusinessDay','Name','Phone','Area','Building','Flat','Payment',
  'Items','FoodSubtotal','DrinksTotal','Gross','PromoCode','Discount','FreeItem','Total',
  'PointsEarned','ReferralUsed','Notes','Spice','Kubus','Location','Source'];
var COUPON_COLS  = ['Code','Type','Value','MinOrder','FreeItem','From','Until','Active','Uses','UsageLimit','PerCustomerLimit','Created'];
var HAPPY_COLS   = ['Name','Discount','Days','Start','End','Date','AppliesTo','Active','Created'];
var MEMBER_COLS  = ['Phone','Name','Points','Spend','Orders','Tier','ReferralCode','ReferredBy','FirstOrder','LastOrder','Joined'];
var REF_COLS     = ['Timestamp','ReferrerPhone','RefereePhone','CodeUsed','Status','RewardPoints'];

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP — run once from the editor.  Resilient: each step is independent.
// ═══════════════════════════════════════════════════════════════════════════
function setup(){
  var log = [];
  try { ensureSheets_();     log.push('sheets ✓'); } catch(e){ log.push('sheets ✗ '+e); }
  try { seedDefaults_();     log.push('defaults ✓'); } catch(e){ log.push('defaults ✗ '+e); }
  try { installTriggers_();  log.push('trigger ✓'); } catch(e){ log.push('trigger ✗ '+e); }
  var msg = 'SETUP RESULT → ' + log.join('  |  ');
  Logger.log(msg);
  return msg;
}
/** If the 2 AM trigger ever fails to install, run just this. */
function installReportTrigger(){ installTriggers_(); Logger.log('2 AM report trigger installed.'); }
/** Health check — run anytime to confirm everything reads. */
function diagnostics(){
  var out = { time: fmt_(now_(),'yyyy-MM-dd HH:mm:ss'), businessDay: bizKey_(now_()),
    tabs:{}, loyalty: !!getLoyalty_(), referral: !!getReferral_() };
  [TAB.ORDERS,TAB.COUPONS,TAB.HAPPY,TAB.MEMBERS,TAB.REFERRALS].forEach(function(t){
    var sh = ss_().getSheetByName(t); out.tabs[t] = sh ? (sh.getLastRow()-1)+' rows' : 'MISSING';
  });
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/** Trivial test — run this FIRST. If even this errors, the problem is the
    Google project/account, not the code (reload the editor or make a new project). */
function hello(){ var s = 'hello ✓ ' + fmt_(now_(),'yyyy-MM-dd HH:mm:ss'); Logger.log(s); return s; }

/** FRESH START: deletes this system's tabs (Orders, Coupons, HappyHours,
    Members, Referrals) and rebuilds them clean, then runs setup. Use when you
    don't need the old data. Your other tabs (Promo Codes, etc.) are untouched. */
function freshStart(){
  var ss = ss_();
  [TAB.ORDERS, TAB.COUPONS, TAB.HAPPY, TAB.MEMBERS, TAB.REFERRALS].forEach(function(n){
    var sh = ss.getSheetByName(n);
    if (sh){ try { ss.deleteSheet(sh); } catch(e){} }
  });
  var r = setup();
  Logger.log('FRESH START done → ' + r);
  return r;
}

function ensureSheets_(){
  var ss = ss_();
  ensureHeaders_(ss, TAB.ORDERS,    ORDER_COLS);
  ensureHeaders_(ss, TAB.COUPONS,   COUPON_COLS);
  ensureHeaders_(ss, TAB.HAPPY,     HAPPY_COLS);
  ensureHeaders_(ss, TAB.MEMBERS,   MEMBER_COLS);
  ensureHeaders_(ss, TAB.REFERRALS, REF_COLS);
}
/** Non-destructive: creates the tab if missing, writes headers if empty,
    or APPENDS only the canonical columns that are absent. */
function ensureHeaders_(ss, name, cols){
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureCols_(sh, cols.length);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var hdr = sh.getRange(1,1,1,lastCol).getValues()[0].map(function(h){ return String(h).trim(); });
  var empty = sh.getLastRow() === 0 || hdr.every(function(c){ return c === ''; });
  if (empty){
    sh.getRange(1,1,1,cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#C0392B').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return sh;
  }
  var missing = cols.filter(function(c){ return hdr.indexOf(c) < 0; });
  if (missing.length){
    ensureCols_(sh, hdr.length + missing.length);
    sh.getRange(1, hdr.length+1, 1, missing.length).setValues([missing])
      .setFontWeight('bold').setBackground('#C0392B').setFontColor('#ffffff');
  }
  return sh;
}
/** Make sure the sheet grid has at least n columns (setValues can't extend it). */
function ensureCols_(sh, n){
  var have = sh.getMaxColumns();
  if (have < n) sh.insertColumnsAfter(have, n - have);
}
/** Returns { sh, idx:{ColName:0-based col}, width } for a named tab. */
function ctx_(name, cols){
  var sh = ensureHeaders_(ss_(), name, cols);
  var width = Math.max(sh.getLastColumn(), cols.length);
  var hdr = sh.getRange(1,1,1,width).getValues()[0].map(function(h){ return String(h).trim(); });
  var idx = {}; cols.forEach(function(c){ idx[c] = hdr.indexOf(c); });
  return { sh:sh, idx:idx, width:hdr.length };
}
function ordersCtx_(){ return ctx_(TAB.ORDERS, ORDER_COLS); }

function seedDefaults_(){
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('loyaltyConfig')){
    p.setProperty('loyaltyConfig', JSON.stringify({
      pointsPerAed:1, redeemRate:20,
      tiers:[
        { name:'🥉 Bronze',   minPoints:0,    rewardValue:0,  perks:'Earn 1 pt / AED' },
        { name:'🥈 Silver',   minPoints:500,  rewardValue:5,  perks:'5% back + birthday treat' },
        { name:'🥇 Gold',     minPoints:1500, rewardValue:10, perks:'10% back + free delivery' },
        { name:'💎 Platinum', minPoints:4000, rewardValue:15, perks:'15% back + priority + gifts' }
      ]
    }));
  }
  if (!p.getProperty('referralConfig')){
    p.setProperty('referralConfig', JSON.stringify({
      enabled:true, refereeType:'percent', refereeValue:15, refereeMinOrder:25,
      referrerPoints:100, note:'Friend saves 15% on first order (min 25), you earn 100 points.' }));
  }
}

function installTriggers_(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    var fn = t.getHandlerFunction();
    if (fn === 'dailyReportJob' || fn === 'sendDailySummary') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyReportJob').timeBased().everyDays(1).atHour(2).create();
}

// ═══════════════════════════════════════════════════════════════════════════
//  DATE / BUSINESS-DAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function ss_(){ return SpreadsheetApp.openById(CONFIG.SHEET_ID); }
function now_(){ return new Date(); }
function fmt_(d, f){ return Utilities.formatDate(d, CONFIG.TZ, f); }
function bizKey_(d){ return fmt_(new Date(d.getTime() - CONFIG.BIZ_END_HOUR*3600*1000), 'yyyy-MM-dd'); }
function closedBizKey_(d){ return bizKey_(new Date(d.getTime() - 3*3600*1000)); }
function monthKeyOf_(bkey){ return bkey.slice(0,7); }

// ═══════════════════════════════════════════════════════════════════════════
//  PHONE NORMALISATION → +9715XXXXXXXX
// ═══════════════════════════════════════════════════════════════════════════
function normPhone_(raw){
  var s = String(raw||'').replace(/[^\d]/g,'');
  if (!s) return '';
  if (s.indexOf('00971')===0) s = s.slice(2);
  if (s.indexOf('971')===0) s = s.slice(3);
  else if (s.charAt(0)==='0') s = s.slice(1);
  if (s.length > 9) s = s.slice(-9);
  return s ? ('+971'+s) : '';
}
function prettyPhone_(intl){ return String(intl||'').replace('+971','0'); }
function refCodeFor_(intl){ return 'MOZ' + String(intl||'').replace(/\D/g,'').slice(-4); }

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
  } catch(err){ return json_({ error: String(err) }); }
}
function doPost(e){
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || 'order';
    if (action === 'order')              return json_(recordOrder_(body));
    if (action === 'addCoupon')          return json_(addCoupon_(body));
    if (action === 'deleteCoupon')       return json_(deleteCoupon_(body.code));
    if (action === 'saveHappyHour')      return json_(saveHappyHour_(body));
    if (action === 'deleteHappyHour')    return json_(deleteHappyHour_(body.name));
    if (action === 'saveLoyaltyConfig')  return json_(saveLoyalty_(body));
    if (action === 'saveReferralConfig') return json_(saveReferral_(body));
    return json_({ error:'unknown action' });
  } catch(err){ return json_({ error: String(err) }); }
}
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// ═══════════════════════════════════════════════════════════════════════════
//  RECORD AN ORDER
// ═══════════════════════════════════════════════════════════════════════════
function recordOrder_(b){
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e){}
  try {
    var c = ordersCtx_();
    var now = now_();
    var phone = normPhone_(b.phone);
    var name  = String(b.name||'').trim();
    var food  = num_(b.foodSubtotal), bev = num_(b.drinksTotal);
    var gross = food + bev;
    var discount = num_(b.discount);
    var total = b.total != null ? num_(b.total) : Math.max(0, gross - discount);
    var promo = String(b.promoCode||'').trim().toUpperCase();
    var freeItem = String(b.freeItem||'').trim();
    var pts = Math.round(total * (getLoyalty_().pointsPerAed||1));
    var refUsed = String(b.referralCode||'').trim().toUpperCase();
    var refResult = applyReferral_(phone, refUsed);

    var row = new Array(c.width).fill('');
    function put(k,v){ if (c.idx[k] >= 0) row[c.idx[k]] = v; }
    put('Timestamp',   fmt_(now,'yyyy-MM-dd HH:mm:ss'));
    put('BusinessDay', bizKey_(now));
    put('Name', name); put('Phone', phone);
    put('Area',     String(b.office||b.area||'').trim());
    put('Building', String(b.company||b.building||'').trim());
    put('Flat',     String(b.flat||'').trim());
    put('Payment',  String(b.payment||'').trim());
    put('Items',    String(b.items||'').trim());
    put('FoodSubtotal', food); put('DrinksTotal', bev); put('Gross', gross);
    put('PromoCode', promo); put('Discount', discount); put('FreeItem', freeItem);
    put('Total', total); put('PointsEarned', pts); put('ReferralUsed', refUsed);
    put('Notes', String(b.notes||'').trim());
    put('Spice', String(b.spice||'').trim()); put('Kubus', String(b.kubus||'').trim());
    put('Location', String(b.location||'').trim()); put('Source', 'web');
    c.sh.appendRow(row);

    if (promo) bumpCouponUse_(promo);
    upsertMember_(phone, name, total, pts, refResult.referrer);
    return { ok:true, businessDay: bizKey_(now), points:pts, referral:refResult };
  } finally { try { lock.releaseLock(); } catch(e){} }
}
function num_(v){ var n = parseFloat(String(v).replace(/[^\d.\-]/g,'')); return isNaN(n)?0:n; }

// ═══════════════════════════════════════════════════════════════════════════
//  MEMBERS / LOYALTY
// ═══════════════════════════════════════════════════════════════════════════
function membersCtx_(){ return ctx_(TAB.MEMBERS, MEMBER_COLS); }
function membersMap_(){
  var c = membersCtx_(); var v = c.sh.getDataRange().getValues(); var I=c.idx; var map={};
  for (var i=1;i<v.length;i++){ var r=v[i]; var ph=I.Phone>=0?r[I.Phone]:''; if(!ph) continue;
    map[String(ph)] = { row:i+1, phone:ph, name:g(r,I.Name), points:+g(r,I.Points)||0,
      spend:+g(r,I.Spend)||0, orders:+g(r,I.Orders)||0, tier:g(r,I.Tier),
      refCode:g(r,I.ReferralCode), referredBy:g(r,I.ReferredBy), first:g(r,I.FirstOrder), last:g(r,I.LastOrder) };
  }
  return { c:c, map:map };
}
function g(r,i){ return i>=0 ? r[i] : ''; }
function upsertMember_(phone, name, spendAdd, pointsAdd, referredBy){
  if (!phone) return;
  var mm = membersMap_(); var c = mm.c, I = c.idx, iso = fmt_(now_(),'yyyy-MM-dd HH:mm:ss');
  var loy = getLoyalty_(), m = mm.map[phone];
  if (m){
    var points = m.points + (pointsAdd||0), spend = m.spend + (spendAdd||0), orders = m.orders + 1;
    setCell_(c, m.row, 'Name', name||m.name); setCell_(c, m.row, 'Points', points);
    setCell_(c, m.row, 'Spend', spend); setCell_(c, m.row, 'Orders', orders);
    setCell_(c, m.row, 'Tier', tierFor_(points, loy)); setCell_(c, m.row, 'LastOrder', iso);
  } else {
    var pts = pointsAdd||0;
    var row = new Array(c.width).fill('');
    function put(k,v){ if(I[k]>=0) row[I[k]]=v; }
    put('Phone',phone); put('Name',name); put('Points',pts); put('Spend',spendAdd||0);
    put('Orders',1); put('Tier',tierFor_(pts,loy)); put('ReferralCode',refCodeFor_(phone));
    put('ReferredBy',referredBy||''); put('FirstOrder',iso); put('LastOrder',iso); put('Joined',iso);
    c.sh.appendRow(row);
  }
}
function setCell_(c, row, name, val){ if (c.idx[name] >= 0) c.sh.getRange(row, c.idx[name]+1).setValue(val); }
function tierFor_(points, loy){
  loy = loy || getLoyalty_();
  var t = (loy.tiers||[]).slice().sort(function(a,b){ return (b.minPoints||0)-(a.minPoints||0); });
  for (var i=0;i<t.length;i++){ if (points >= (t[i].minPoints||0)) return t[i].name; }
  return (loy.tiers && loy.tiers[0] && loy.tiers[0].name) || 'Member';
}
function nextTier_(points, loy){
  var t = (loy.tiers||[]).slice().sort(function(a,b){ return (a.minPoints||0)-(b.minPoints||0); });
  for (var i=0;i<t.length;i++){ if ((t[i].minPoints||0) > points) return t[i]; }
  return null;
}
function getLoyalty_(){ try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('loyaltyConfig')); } catch(e){ return { pointsPerAed:1, redeemRate:20, tiers:[] }; } }
function getReferral_(){ try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('referralConfig')); } catch(e){ return { enabled:false }; } }

function getMember_(phoneRaw){
  var phone = normPhone_(phoneRaw); if (!phone) return { found:false };
  var loy = getLoyalty_(), code = refCodeFor_(phone), m = membersMap_().map[phone];
  if (!m) return { found:false, referralCode:code, pointsPerAed:loy.pointsPerAed||1 };
  var tier = tierFor_(m.points, loy), next = nextTier_(m.points, loy);
  var benefit = (loy.tiers||[]).filter(function(t){ return t.name===tier; })[0];
  return { found:true, name:m.name, points:m.points, spend:m.spend, orders:m.orders, tier:tier,
    perks:(benefit&&benefit.perks)||'', redeemRate:loy.redeemRate||20,
    redeemableAed: Math.floor(m.points/(loy.redeemRate||20)),
    referralCode: m.refCode||code,
    nextTier: next ? { name:next.name, need: next.minPoints - m.points } : null };
}

// ── REFERRALS ────────────────────────────────────────────────────────────────
function validateRef_(codeRaw, phoneRaw){
  var cfg = getReferral_(); if (!cfg.enabled) return { valid:false, reason:'disabled' };
  var code = String(codeRaw||'').trim().toUpperCase(), phone = normPhone_(phoneRaw);
  if (!code) return { valid:false };
  var owner = ownerOfRefCode_(code);
  if (!owner) return { valid:false, reason:'notfound' };
  if (phone && owner === phone) return { valid:false, reason:'self' };
  if (phone && membersMap_().map[phone]) return { valid:false, reason:'existing' };
  return { valid:true, type:cfg.refereeType, value:cfg.refereeValue, minOrder:cfg.refereeMinOrder, label:'Referral '+code };
}
function ownerOfRefCode_(code){
  code = String(code||'').toUpperCase(); var map = membersMap_().map;
  for (var p in map){ if ((map[p].refCode||refCodeFor_(p)).toUpperCase() === code) return p; }
  return null;
}
/** Credits referrer, ONLY on the referee's first order. Returns {referrer}. */
function applyReferral_(refereePhone, code){
  var out = {};
  var cfg = getReferral_();
  if (!cfg.enabled || !code || !refereePhone) return out;
  var mm = membersMap_();
  if (mm.map[refereePhone]) return out;            // not a first order
  var owner = ownerOfRefCode_(code);
  if (!owner || owner === refereePhone) return out;
  var pts = +cfg.referrerPoints||0, m = mm.map[owner];
  if (m){ var np = m.points + pts; setCell_(mm.c, m.row, 'Points', np); setCell_(mm.c, m.row, 'Tier', tierFor_(np, getLoyalty_())); }
  var rc = ctx_(TAB.REFERRALS, REF_COLS);
  var row = new Array(rc.width).fill('');
  function put(k,v){ if(rc.idx[k]>=0) row[rc.idx[k]]=v; }
  put('Timestamp', fmt_(now_(),'yyyy-MM-dd HH:mm:ss')); put('ReferrerPhone', owner);
  put('RefereePhone', refereePhone); put('CodeUsed', code); put('Status','completed'); put('RewardPoints', pts);
  rc.sh.appendRow(row);
  out.referrer = owner;
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
//  COUPONS
// ═══════════════════════════════════════════════════════════════════════════
function couponsList_(){
  var c = ctx_(TAB.COUPONS, COUPON_COLS), v = c.sh.getDataRange().getValues(), I=c.idx, out=[];
  for (var i=1;i<v.length;i++){ var r=v[i]; if(!g(r,I.Code)) continue;
    out.push({ code:String(g(r,I.Code)).toUpperCase(), type:g(r,I.Type)||'percent', value:+g(r,I.Value)||0,
      minOrder:+g(r,I.MinOrder)||0, freeItem:g(r,I.FreeItem)||'', from:isoDate_(g(r,I.From)), until:isoDate_(g(r,I.Until)),
      active:g(r,I.Active)!==false, uses:+g(r,I.Uses)||0, usageLimit:+g(r,I.UsageLimit)||0, perCustomerLimit:+g(r,I.PerCustomerLimit)||0 });
  }
  return out;
}
function isoDate_(v){ if(!v) return ''; if (v instanceof Date) return fmt_(v,'yyyy-MM-dd'); return String(v).slice(0,10); }
function addCoupon_(b){
  var c = ctx_(TAB.COUPONS, COUPON_COLS), I=c.idx, code=String(b.code||'').trim().toUpperCase();
  if (!code) return { error:'no code' };
  var v = c.sh.getDataRange().getValues();
  for (var i=1;i<v.length;i++){ if (String(g(v[i],I.Code)).toUpperCase()===code){
    writeCoupon_(c, i+1, b, code, +g(v[i],I.Uses)||0, g(v[i],I.Created)); return { ok:true, updated:true }; } }
  writeCoupon_(c, c.sh.getLastRow()+1, b, code, 0, fmt_(now_(),'yyyy-MM-dd'));
  return { ok:true };
}
function writeCoupon_(c, rowNum, b, code, uses, created){
  var row = new Array(c.width).fill('');
  function put(k,v){ if(c.idx[k]>=0) row[c.idx[k]]=v; }
  put('Code',code); put('Type',b.type||'percent'); put('Value',+b.value||0); put('MinOrder',+b.minOrder||0);
  put('FreeItem',b.freeItem||''); put('From',b.from||''); put('Until',b.until||''); put('Active',b.active!==false);
  put('Uses',uses||0); put('UsageLimit',+b.usageLimit||0); put('PerCustomerLimit',+b.perCustomerLimit||0);
  put('Created',created||fmt_(now_(),'yyyy-MM-dd'));
  c.sh.getRange(rowNum,1,1,c.width).setValues([row]);
}
function deleteCoupon_(code){
  var c = ctx_(TAB.COUPONS, COUPON_COLS), I=c.idx, v=c.sh.getDataRange().getValues(); code=String(code||'').toUpperCase();
  for (var i=v.length-1;i>=1;i--){ if (String(g(v[i],I.Code)).toUpperCase()===code) c.sh.deleteRow(i+1); }
  return { ok:true };
}
function bumpCouponUse_(code){
  var c = ctx_(TAB.COUPONS, COUPON_COLS), I=c.idx, v=c.sh.getDataRange().getValues(); code=String(code||'').toUpperCase();
  for (var i=1;i<v.length;i++){ if (String(g(v[i],I.Code)).toUpperCase()===code && I.Uses>=0){
    c.sh.getRange(i+1, I.Uses+1).setValue((+g(v[i],I.Uses)||0)+1); return; } }
}

// ═══════════════════════════════════════════════════════════════════════════
//  HAPPY HOURS
// ═══════════════════════════════════════════════════════════════════════════
function happyList_(){
  var c = ctx_(TAB.HAPPY, HAPPY_COLS), v=c.sh.getDataRange().getValues(), I=c.idx, out=[];
  for (var i=1;i<v.length;i++){ var r=v[i]; if(!g(r,I.Name)) continue;
    out.push({ name:g(r,I.Name), discount:+g(r,I.Discount)||0, days:String(g(r,I.Days)||'ALL'),
      start:hhTime_(g(r,I.Start)), end:hhTime_(g(r,I.End)), date:isoDate_(g(r,I.Date)),
      appliesTo:g(r,I.AppliesTo)||'food', active:g(r,I.Active)!==false });
  }
  return out;
}
function hhTime_(v){ if(!v) return ''; if (v instanceof Date) return fmt_(v,'HH:mm'); return String(v).slice(0,5); }
function saveHappyHour_(b){
  var c = ctx_(TAB.HAPPY, HAPPY_COLS), I=c.idx, name=String(b.name||'').trim(); if(!name) return { error:'no name' };
  var v = c.sh.getDataRange().getValues(), target = c.sh.getLastRow()+1;
  for (var i=1;i<v.length;i++){ if (String(g(v[i],I.Name))===name){ target=i+1; break; } }
  var row = new Array(c.width).fill('');
  function put(k,val){ if(c.idx[k]>=0) row[c.idx[k]]=val; }
  put('Name',name); put('Discount',+b.discount||0); put('Days',b.days||'ALL'); put('Start',b.start||'');
  put('End',b.end||''); put('Date',b.date||''); put('AppliesTo',b.appliesTo||'food'); put('Active',b.active!==false);
  put('Created',fmt_(now_(),'yyyy-MM-dd'));
  c.sh.getRange(target,1,1,c.width).setValues([row]);
  return { ok:true };
}
function deleteHappyHour_(name){
  var c = ctx_(TAB.HAPPY, HAPPY_COLS), I=c.idx, v=c.sh.getDataRange().getValues(); name=String(name||'');
  for (var i=v.length-1;i>=1;i--){ if (String(g(v[i],I.Name))===name) c.sh.deleteRow(i+1); }
  return { ok:true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG WRITE
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
function nowMinutesDubai_(){ return +fmt_(now_(),'H')*60 + +fmt_(now_(),'m'); }
function todayIso_(){ return fmt_(now_(),'yyyy-MM-dd'); }
function happyHourNow_(){
  var list = happyList_(), iso = todayIso_(), dow = new Date().getDay(), mins = nowMinutesDubai_(), best=null;
  list.forEach(function(h){
    if (!h.active) return;
    if (h.date && h.date !== iso) return;
    if (!h.date){ var days=String(h.days||'ALL').toUpperCase(); if (days!=='ALL' && days.split(',').indexOf(String(dow))<0) return; }
    var s=toMin_(h.start), e=toMin_(h.end);
    var on = (s==null||e==null)?true:(s<=e?(mins>=s&&mins<e):(mins>=s||mins<e));
    if (on && (!best || h.discount>best.discount)) best={ name:h.name, discount:h.discount, appliesTo:h.appliesTo, endsIn:e!=null?minsLeft_(mins,e):null };
  });
  return best;
}
function toMin_(t){ if(!t) return null; var m=String(t).match(/(\d{1,2}):(\d{2})/); return m?(+m[1]*60+ +m[2]):null; }
function minsLeft_(nowM,endM){ var d=endM-nowM; if(d<0)d+=1440; return d; }
function offersForCustomers_(){
  var iso=todayIso_(), running=[], upcoming=[];
  couponsList_().forEach(function(c){
    if (!c.active) return;
    var label = c.type==='flat'?('AED '+c.value+' off'):c.type==='freeitem'?('Free '+(c.freeItem||'item')):(c.value+'% off');
    if (c.minOrder) label += ' · min AED '+c.minOrder;
    var st = windowStatus_(c.from,c.until,iso);
    var entry = { code:c.code, label:label, from:c.from, until:c.until, minOrder:c.minOrder, freeItem:c.freeItem };
    if (st==='active'){ entry.endsOn=c.until; running.push(entry); }
    if (st==='upcoming'){ entry.startsOn=c.from; upcoming.push(entry); }
  });
  return { running:running, upcoming:upcoming, happyHour:happyHourNow_() };
}
function windowStatus_(from,until,iso){ if(from&&iso<from) return 'upcoming'; if(until&&iso>until) return 'expired'; return 'active'; }
function getPublicConfig_(){
  var loy=getLoyalty_(), ref=getReferral_();
  return {
    coupons: couponsList_().filter(function(c){ return c.active; }),
    happyHours: happyList_().filter(function(h){ return h.active; }),
    loyalty: { pointsPerAed:loy.pointsPerAed, redeemRate:loy.redeemRate, tiers:loy.tiers },
    referral: { enabled:ref.enabled, type:ref.refereeType, value:ref.refereeValue, minOrder:ref.refereeMinOrder, note:ref.note },
    offers: offersForCustomers_(), serverTime: fmt_(now_(),'yyyy-MM-dd HH:mm:ss'), businessDay: bizKey_(now_())
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD PAYLOAD  (business-day aware, header-name based)
// ═══════════════════════════════════════════════════════════════════════════
function getDashboard_(){
  var c = ordersCtx_(), rows = c.sh.getDataRange().getValues(), I = c.idx;
  var todayKey = bizKey_(now_());
  var t = { orders:0, revenue:0, discount:0 }, all = { orders:0, revenue:0 };
  var itemCount={}, payCount={}, areaCount={}, promoCount={}, recent=[];
  for (var i=1;i<rows.length;i++){
    var r = rows[i]; var ts = g(r,I.Timestamp); if(!ts) continue;
    var bkey = g(r,I.BusinessDay) || bizKey_(new Date(ts));
    var total = +g(r,I.Total)||0, disc = +g(r,I.Discount)||0;
    all.orders++; all.revenue += total;
    var pay=String(g(r,I.Payment)||'').trim(); if(pay) payCount[pay]=(payCount[pay]||0)+1;
    var area=String(g(r,I.Area)||'').trim(); if(area) areaCount[area]=(areaCount[area]||0)+1;
    var promo=String(g(r,I.PromoCode)||'').trim().toUpperCase(); if(promo) promoCount[promo]=(promoCount[promo]||0)+1;
    parseItems_(String(g(r,I.Items)||''), itemCount);
    if (bkey === todayKey){ t.orders++; t.revenue+=total; t.discount+=disc;
      recent.push({ name:g(r,I.Name)||'Guest', area:area, total:total, time:String(ts).slice(11,16) }); }
  }
  recent.reverse();
  var topItems = Object.keys(itemCount).map(function(k){ return [k,itemCount[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,12);
  return {
    businessDay: todayKey,
    todayOrders:t.orders, todayRevenue:t.revenue, todayDiscount:t.discount,
    avgOrder: t.orders ? t.revenue/t.orders : 0, allOrders:all.orders, allRevenue:all.revenue,
    topItems:topItems, payCount:payCount, areaCount:areaCount, promoCount:promoCount, recent:recent.slice(0,20),
    coupons:couponsList_(), happyHours:happyList_(), loyaltyConfig:getLoyalty_(), referralConfig:getReferral_(),
    topMembers:topMembers_()
  };
}
function parseItems_(txt, acc){
  if(!txt) return;
  txt.split(';').forEach(function(seg){
    var m = seg.match(/•?\s*([^—•]+?)\s*x\s*(\d+)/i) || seg.match(/([A-Za-z][^x—]+)/);
    if(m){ var nm=m[1].replace(/\(.*?\)/g,'').trim(); if(nm) acc[nm]=(acc[nm]||0)+(m[2]?+m[2]:1); }
  });
}
function topMembers_(){
  var map = membersMap_().map, arr=[];
  for (var p in map){ var m=map[p]; arr.push({ name:m.name||prettyPhone_(p), phone:p, points:m.points, spend:Math.round(m.spend), tier:m.tier }); }
  return arr.sort(function(a,b){ return b.points-a.points; }).slice(0,15);
}

// ── CUSTOMER TARGETING ───────────────────────────────────────────────────────
function getCustomers_(){
  var c = ordersCtx_(), rows = c.sh.getDataRange().getValues(), I = c.idx, by={};
  for (var i=1;i<rows.length;i++){
    var r=rows[i]; var phRaw=g(r,I.Phone); if(!phRaw) continue;
    var phone=String(phRaw), d=new Date(g(r,I.Timestamp));
    var o = by[phone] || (by[phone]={ name:g(r,I.Name)||'Guest', phone:phone, area:g(r,I.Area)||'', orders:0, spend:0, last:0, hours:{}, items:{} });
    o.orders++; o.spend += +g(r,I.Total)||0;
    var tms=d.getTime(); if(tms>o.last) o.last=tms;
    var hr=+fmt_(d,'H'); o.hours[hr]=(o.hours[hr]||0)+1;
    if (g(r,I.Name)) o.name=g(r,I.Name);
    parseItems_(String(g(r,I.Items)||''), o.items);
  }
  var nowMs=now_().getTime(), DAY=86400000, custs=[];
  var seg={Lunch:blank_(),Dinner:blank_(),Afternoon:blank_(),Breakfast:blank_(),'Late Night':blank_()};
  var rec={Active:blank_(),Slipping:blank_(),Lapsed:blank_()}, vip=blank_();
  for (var p in by){
    var o=by[p], peak=peakHour_(o.hours);
    var win = peak<11?'Breakfast':peak<16?'Lunch':peak<18?'Afternoon':peak<23?'Dinner':'Late Night';
    var daysAgo=(nowMs-o.last)/DAY, recency=daysAgo<=7?'Active':daysAgo<=21?'Slipping':'Lapsed';
    var fav=Object.keys(o.items).sort(function(a,b){return o.items[b]-o.items[a];})[0]||'—';
    var intl=normPhone_(p);
    custs.push({ name:o.name, phone:p, intl:intl, area:o.area, orders:o.orders, spend:Math.round(o.spend), dutyWindow:win, bestSend:bestPing_(win), recency:recency, fav:fav });
    push_(seg[win],intl); push_(rec[recency],intl); if(o.orders>=3) push_(vip,intl);
  }
  custs.sort(function(a,b){ return b.spend-a.spend; });
  return { total:custs.length, customers:custs.slice(0,300), segments:seg, recency:rec, vip:vip };
}
function blank_(){ return { count:0, nums:[] }; }
function push_(s,n){ if(n){ s.count++; s.nums.push(n); } }
function peakHour_(h){ var b=12,bc=-1; for(var k in h){ if(h[k]>bc){bc=h[k];b=+k;} } return b; }
function bestPing_(win){ return {Breakfast:'8:30 AM',Lunch:'11:30 AM',Afternoon:'3:30 PM',Dinner:'6:30 PM','Late Night':'9:30 PM'}[win]||'6:00 PM'; }
function getCustomersWithCopy_(){ var d=getCustomers_(); [d.segments,d.recency].forEach(function(gp){ for(var k in gp){ gp[k].copy=gp[k].nums.join(', '); } }); d.vip.copy=d.vip.nums.join(', '); return d; }

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY + MONTHLY REPORT
// ═══════════════════════════════════════════════════════════════════════════
function dailyReportJob(){
  var rep = buildReport_(closedBizKey_(now_()));
  MailApp.sendEmail({ to:CONFIG.REPORT_TO, subject:'🍗 '+CONFIG.BRAND+' — Business Report ('+rep.dayLabel+')', htmlBody:rep.html });
}
function testReportNow(){
  var rep = buildReport_(bizKey_(now_()));
  MailApp.sendEmail({ to:CONFIG.REPORT_TO, subject:'🍗 '+CONFIG.BRAND+' — Report TEST ('+rep.dayLabel+')', htmlBody:rep.html });
}
function buildReport_(dayKey){
  var c = ordersCtx_(), rows = c.sh.getDataRange().getValues(), I = c.idx, monthKey = monthKeyOf_(dayKey);
  var day = blankRep_(), month = blankRep_();
  for (var i=1;i<rows.length;i++){
    var r=rows[i]; var ts=g(r,I.Timestamp); if(!ts) continue;
    var bkey=g(r,I.BusinessDay)||bizKey_(new Date(ts));
    var total=+g(r,I.Total)||0, disc=+g(r,I.Discount)||0, promo=String(g(r,I.PromoCode)||'').toUpperCase();
    var phone=String(g(r,I.Phone)||''), hr=+fmt_(new Date(ts),'H');
    var slot=(hr>=11&&hr<16)?'Lunch':(hr>=16&&hr<21)?'Evening':(hr>=21||hr<3)?'Night':'Daytime';
    if (bkey===dayKey) addRep_(day,total,disc,promo,phone,slot);
    if (monthKeyOf_(bkey)===monthKey) addRep_(month,total,disc,promo,phone,slot);
  }
  return { dayLabel: fmt_(parseKey_(dayKey),'EEE dd MMM yyyy'),
    html: renderReport_(day, month, fmt_(parseKey_(dayKey),'EEE dd MMM yyyy'), fmt_(parseKey_(dayKey),'MMMM yyyy')) };
}
function parseKey_(k){ var p=k.split('-'); return new Date(+p[0], +p[1]-1, +p[2], 12,0,0); }
function blankRep_(){ return { orders:0, revenue:0, discount:0, phones:{}, coupons:{}, slots:{Lunch:0,Evening:0,Night:0,Daytime:0} }; }
function addRep_(b,total,disc,promo,phone,slot){ b.orders++; b.revenue+=total; b.discount+=disc; if(phone)b.phones[phone]=1; if(promo)b.coupons[promo]=(b.coupons[promo]||0)+1; b.slots[slot]++; }
function renderReport_(t,m,dayLabel,moLabel){
  var C=CONFIG.CURRENCY;
  function uniq(o){ return Object.keys(o.phones).length; }
  function avg(o){ return o.orders?(o.revenue/o.orders).toFixed(1):'0'; }
  function coup(o){ var e=Object.keys(o.coupons); return e.length? e.map(function(k){return k+' ×'+o.coupons[k];}).join(', '):'—'; }
  function slots(o){ return '🍽️ Lunch '+o.slots.Lunch+' &nbsp; 🌆 Evening '+o.slots.Evening+' &nbsp; 🌙 Night '+o.slots.Night+' &nbsp; ☀️ Daytime '+o.slots.Daytime; }
  function row(l,v,col){ return '<tr><td style="padding:6px 0">'+l+'</td><td style="text-align:right;font-weight:700'+(col?';color:'+col:'')+'">'+v+'</td></tr>'; }
  function card(title,o,sub){
    return '<div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 16px">'
      + '<div style="font:700 15px Arial;color:#C0392B">'+title+'</div>'
      + '<div style="font:12px Arial;color:#888;margin-bottom:10px">'+sub+'</div>'
      + '<table style="width:100%;border-collapse:collapse;font:14px Arial">'
      + row('📦 Orders', o.orders) + row('👥 Customers (unique)', uniq(o))
      + row('💰 Revenue', C+' '+o.revenue.toFixed(2), '#27AE60') + row('📈 Avg order', C+' '+avg(o))
      + row('🎁 Discount given', C+' '+o.discount.toFixed(2), '#E67E22') + row('🏷️ Coupons applied', coup(o))
      + '</table><div style="margin-top:10px;font:13px Arial;color:#555">'+slots(o)+'</div></div>';
  }
  return '<div style="max-width:520px;margin:auto;font-family:Arial">'
    + '<div style="background:#C0392B;color:#fff;padding:16px;border-radius:12px 12px 0 0">'
    + '<div style="font:800 18px Arial">🍗 '+CONFIG.BRAND+' — Business Report</div>'
    + '<div style="font:12px Arial;opacity:.9">'+CONFIG.LOCATION+' · business day 12 PM→2 AM</div></div>'
    + '<div style="padding:16px;background:#fafafa;border-radius:0 0 12px 12px">'
    + card('TODAY', t, dayLabel) + card('THIS MONTH (to date)', m, moLabel)
    + '<div style="font:11px Arial;color:#aaa;text-align:center;margin-top:8px">Sent automatically at 2 AM · Mozon sales bot</div>'
    + '</div></div>';
}
