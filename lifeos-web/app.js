/* =========================================================================
   Life OS — personal web app (static, localStorage-backed)
   Implements: Accounts (Shop + Personal), Tasks (daily/committed + pending),
   Credit Ledger, Reminders, Ideas. No server required — deploy on Netlify.
   ========================================================================= */

const STORE_KEY = 'lifeos_v3';
const CURRENCY = 'AED';
const BIZ_CUTOFF_HOUR = 6; // before 6am counts as previous business day

/* ---------- storage ---------- */
const seed = {
  tasks: [], finances: [], personal: [], credit: [], reminders: [], ideas: [],
  counters: { T: 0, SF: 0, PF: 0, C: 0, R: 0, I: 0 }
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(seed);
    const d = JSON.parse(raw);
    return Object.assign(structuredClone(seed), d);
  } catch (e) { return structuredClone(seed); }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
let db = load();

function nextId(prefix) {
  db.counters[prefix] = (db.counters[prefix] || 0) + 1;
  return prefix + String(db.counters[prefix]).padStart(3, '0');
}

/* ---------- helpers ---------- */
function bizToday() {
  const n = new Date();
  n.setHours(n.getHours() - BIZ_CUTOFF_HOUR);
  return isoDate(n);
}
function isoDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function fmt(n) {
  return Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function money(n) { return `${fmt(n)} ${CURRENCY}`; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const a = new Date(bizToday()); const b = new Date(dateStr);
  return Math.round((b - a) / 86400000);
}
function prettyDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/* ---------- balances ---------- */
function ledgerBalance(list) {
  let cash = 0, bank = 0;
  for (const r of list) {
    const amt = Number(r.amount) || 0;
    const sign = r.type === 'Income' ? 1 : -1;
    if (r.account === 'Bank') bank += sign * amt; else cash += sign * amt;
  }
  return { cash, bank, total: cash + bank };
}
function creditPending() {
  let owedToMe = 0, iOwe = 0;
  for (const c of db.credit) {
    if (c.status !== 'Pending') continue;
    if (c.type === 'Given') owedToMe += Number(c.amount) || 0;
    else iOwe += Number(c.amount) || 0;
  }
  return { owedToMe, iOwe };
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- modal ---------- */
const modalBack = document.getElementById('modalBack');
const modalEl = document.getElementById('modal');
function openModal(html) { modalEl.innerHTML = html; modalBack.classList.add('open'); }
function closeModal() { modalBack.classList.remove('open'); modalEl.innerHTML = ''; }
modalBack.addEventListener('click', e => { if (e.target === modalBack) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function fieldInput(id, label, val = '', type = 'text', extra = '') {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(val)}" ${extra}></div>`;
}
function fieldSelect(id, label, options, val = '') {
  const opts = options.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${opts}</select></div>`;
}
function fieldArea(id, label, val = '') {
  return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}">${esc(val)}</textarea></div>`;
}
const val = id => (document.getElementById(id) || {}).value || '';

/* =========================================================================
   VIEWS
   ========================================================================= */
const views = document.getElementById('views');
let currentView = 'dashboard';
const titles = { dashboard: 'Dashboard', tasks: 'Tasks', finances: 'Accounts', credit: 'Credit Ledger', reminders: 'Reminders', ideas: 'Ideas' };

function render() {
  document.getElementById('viewTitle').textContent = titles[currentView];
  document.getElementById('bizDate').textContent = 'Business day · ' +
    new Date(bizToday()).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  ({ dashboard: viewDashboard, tasks: viewTasks, finances: viewFinances, credit: viewCredit, reminders: viewReminders, ideas: viewIdeas }[currentView])();
  save();
}

/* ---------- Dashboard ---------- */
function viewDashboard() {
  const shop = ledgerBalance(db.finances);
  const pers = ledgerBalance(db.personal);
  const cp = creditPending();
  const today = bizToday();

  const committed = db.tasks.filter(t => t.committed === 'Yes' && t.status !== 'Done');
  const overdueTasks = db.tasks.filter(t => t.status !== 'Done' && t.due && daysUntil(t.due) < 0);
  const dueRems = db.reminders.filter(r => r.status === 'Active' && r.due && daysUntil(r.due) <= 7)
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''));

  views.innerHTML = `
    <div class="grid cols-4">
      <div class="card stat ${shop.total >= 0 ? 'good' : 'bad'}">
        <div class="label">Shop Balance</div>
        <div class="value">${fmt(shop.total)}</div>
        <div class="sub">Cash ${fmt(shop.cash)} · Bank ${fmt(shop.bank)}</div>
      </div>
      <div class="card stat ${pers.total >= 0 ? 'good' : 'bad'}">
        <div class="label">Personal Balance</div>
        <div class="value">${fmt(pers.total)}</div>
        <div class="sub">Cash ${fmt(pers.cash)} · Bank ${fmt(pers.bank)}</div>
      </div>
      <div class="card stat good">
        <div class="label">Owed to me</div>
        <div class="value">${fmt(cp.owedToMe)}</div>
        <div class="sub">receivable (pending)</div>
      </div>
      <div class="card stat bad">
        <div class="label">I owe</div>
        <div class="value">${fmt(cp.iOwe)}</div>
        <div class="sub">payable (pending)</div>
      </div>
    </div>

    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h3>Committed today <span class="count">${committed.length}</span></h3>
        ${committed.length ? taskMiniList(committed) : `<div class="empty">Nothing committed. Go to Tasks and commit what you'll do today.</div>`}
      </div>
      <div class="card">
        <h3>Overdue tasks <span class="count">${overdueTasks.length}</span></h3>
        ${overdueTasks.length ? taskMiniList(overdueTasks) : `<div class="empty">No overdue tasks. 🎉</div>`}
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Reminders — next 7 days <span class="count">${dueRems.length}</span></h3>
      ${dueRems.length ? `<div class="tablewrap"><table><thead><tr><th>Title</th><th>Due</th><th class="num">Amount</th><th>In</th></tr></thead><tbody>
        ${dueRems.map(r => {
          const d = daysUntil(r.due);
          const b = d < 0 ? 'b-red' : d <= 1 ? 'b-amber' : 'b-brand';
          const lbl = d < 0 ? `${-d}d overdue` : d === 0 ? 'today' : `${d}d`;
          return `<tr><td>${esc(r.title)}</td><td>${prettyDate(r.due)}</td><td class="num mono">${r.amount ? fmt(r.amount) : '—'}</td><td><span class="badge ${b}">${lbl}</span></td></tr>`;
        }).join('')}
      </tbody></table></div>` : `<div class="empty">No reminders due this week.</div>`}
    </div>`;
}

function taskMiniList(list) {
  return `<div class="tablewrap"><table><tbody>
    ${list.map(t => {
      const od = t.due && daysUntil(t.due) < 0;
      return `<tr>
        <td><button class="checkbtn ${t.status === 'Done' ? 'done' : ''}" onclick="toggleTaskDone('${t.id}')">✓</button></td>
        <td class="ttl">${esc(t.title)} ${prioBadge(t.priority)}</td>
        <td class="num muted">${od ? `<span class="badge b-red">overdue</span>` : (t.due ? prettyDate(t.due) : '')}</td>
      </tr>`;
    }).join('')}
  </tbody></table></div>`;
}
function prioBadge(p) {
  if (p === 'High') return `<span class="badge b-red">High</span>`;
  if (p === 'Medium') return `<span class="badge b-amber">Med</span>`;
  if (p === 'Low') return `<span class="badge b-gray">Low</span>`;
  return '';
}

/* ---------- Tasks ---------- */
let taskFilter = 'open';
function viewTasks() {
  const all = db.tasks;
  let list;
  if (taskFilter === 'open') list = all.filter(t => t.status !== 'Done');
  else if (taskFilter === 'committed') list = all.filter(t => t.committed === 'Yes' && t.status !== 'Done');
  else if (taskFilter === 'overdue') list = all.filter(t => t.status !== 'Done' && t.due && daysUntil(t.due) < 0);
  else if (taskFilter === 'done') list = all.filter(t => t.status === 'Done');
  else list = all;

  const order = { High: 0, Medium: 1, Low: 2, '': 3 };
  list = list.slice().sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3) || (a.due || 'z').localeCompare(b.due || 'z'));

  views.innerHTML = `
    <div class="section-head">
      <div class="tabs">
        ${['open', 'committed', 'overdue', 'done', 'all'].map(f =>
          `<button class="${taskFilter === f ? 'active' : ''}" onclick="setTaskFilter('${f}')">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
      </div>
      <button class="btn primary" onclick="taskModal()">+ New Task</button>
    </div>
    <div class="card">
      ${list.length ? `<div class="tablewrap"><table>
        <thead><tr><th></th><th>Task</th><th>Priority</th><th>Due</th><th>Commit</th><th></th></tr></thead>
        <tbody>${list.map(taskRow).join('')}</tbody>
      </table></div>` : `<div class="empty">No tasks here. Add one to get started.</div>`}
    </div>`;
}
function taskRow(t) {
  const done = t.status === 'Done';
  const od = !done && t.due && daysUntil(t.due) < 0;
  return `<tr class="${done ? 'done-row' : ''}">
    <td><button class="checkbtn ${done ? 'done' : ''}" onclick="toggleTaskDone('${t.id}')">✓</button></td>
    <td><span class="ttl">${esc(t.title)}</span>${t.notes ? `<div class="muted" style="font-size:12px">${esc(t.notes)}</div>` : ''}</td>
    <td>${prioBadge(t.priority) || '<span class="muted">—</span>'}</td>
    <td>${od ? `<span class="badge b-red">${prettyDate(t.due)}</span>` : (t.due ? prettyDate(t.due) : '<span class="muted">—</span>')}</td>
    <td>${done ? '' : `<button class="btn sm ${t.committed === 'Yes' ? 'primary' : ''}" onclick="toggleCommit('${t.id}')">${t.committed === 'Yes' ? '★ Committed' : '☆ Commit'}</button>`}</td>
    <td class="num">
      <button class="iconbtn" onclick="taskModal('${t.id}')">✎</button>
      <button class="iconbtn danger" onclick="delItem('tasks','${t.id}')">🗑</button>
    </td>
  </tr>`;
}
window.setTaskFilter = f => { taskFilter = f; render(); };
window.toggleTaskDone = id => {
  const t = db.tasks.find(x => x.id === id); if (!t) return;
  t.status = t.status === 'Done' ? 'Open' : 'Done';
  if (t.status === 'Done') t.committed = '';
  save(); render(); toast(t.status === 'Done' ? 'Task done ✓' : 'Reopened');
};
window.toggleCommit = id => {
  const t = db.tasks.find(x => x.id === id); if (!t) return;
  t.committed = t.committed === 'Yes' ? '' : 'Yes';
  save(); render();
};
window.taskModal = (id) => {
  const t = id ? db.tasks.find(x => x.id === id) : null;
  openModal(`
    <h3>${t ? 'Edit Task' : 'New Task'}</h3>
    ${fieldInput('t_title', 'Title', t?.title)}
    <div class="row2">
      ${fieldInput('t_due', 'Due date', t?.due, 'date')}
      ${fieldSelect('t_prio', 'Priority', ['Low', 'Medium', 'High'], t?.priority || 'Medium')}
    </div>
    ${fieldArea('t_notes', 'Notes', t?.notes)}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveTask('${t ? t.id : ''}')">Save</button>
    </div>`);
  setTimeout(() => document.getElementById('t_title').focus(), 40);
};
window.saveTask = (id) => {
  const title = val('t_title').trim();
  if (!title) { toast('Title is required'); return; }
  const data = { title, due: val('t_due'), priority: val('t_prio'), notes: val('t_notes').trim() };
  if (id) { Object.assign(db.tasks.find(x => x.id === id), data); }
  else { db.tasks.push({ id: nextId('T'), status: 'Open', committed: '', created: new Date().toISOString(), ...data }); }
  save(); closeModal(); render(); toast(id ? 'Task updated' : 'Task added');
};

/* ---------- Finances (Accounts) ---------- */
let finBook = 'finances'; // 'finances' (shop) | 'personal'
function viewFinances() {
  const list = db[finBook];
  const bal = ledgerBalance(list);
  const label = finBook === 'finances' ? 'Shop' : 'Personal';
  const sorted = list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));

  views.innerHTML = `
    <div class="section-head">
      <div class="tabs">
        <button class="${finBook === 'finances' ? 'active' : ''}" onclick="setBook('finances')">Shop</button>
        <button class="${finBook === 'personal' ? 'active' : ''}" onclick="setBook('personal')">Personal</button>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="cashPairModal()">⇄ Bank→Cash</button>
        <button class="btn primary" onclick="finModal()">+ New Entry</button>
      </div>
    </div>
    <div class="grid cols-3">
      <div class="card stat"><div class="label">${label} — Cash in Hand</div><div class="value">${fmt(bal.cash)}</div></div>
      <div class="card stat"><div class="label">${label} — Bank</div><div class="value">${fmt(bal.bank)}</div></div>
      <div class="card stat brandc"><div class="label">${label} — Total</div><div class="value">${fmt(bal.total)}</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>${label} Ledger <span class="count">${list.length} entries</span></h3>
      ${sorted.length ? `<div class="tablewrap"><table>
        <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Account</th><th class="num">Amount</th><th>Category</th><th>Notes</th><th></th></tr></thead>
        <tbody>${sorted.map(finRow).join('')}</tbody>
      </table></div>` : `<div class="empty">No entries yet.</div>`}
    </div>`;
}
function finRow(r) {
  const inc = r.type === 'Income';
  return `<tr>
    <td class="muted mono">${r.id}</td>
    <td>${prettyDate(r.date)}</td>
    <td><span class="badge ${inc ? 'b-green' : 'b-red'}">${inc ? 'Income' : 'Expense'}</span></td>
    <td>${esc(r.account)}</td>
    <td class="num mono" style="color:${inc ? 'var(--green)' : 'var(--red)'}">${inc ? '+' : '−'}${fmt(r.amount)}</td>
    <td>${esc(r.category) || '<span class="muted">—</span>'}</td>
    <td class="muted">${esc(r.notes)}</td>
    <td class="num"><button class="iconbtn" onclick="finModal('${r.id}')">✎</button><button class="iconbtn danger" onclick="delItem('${finBook}','${r.id}')">🗑</button></td>
  </tr>`;
}
window.setBook = b => { finBook = b; render(); };
window.finModal = (id) => {
  const r = id ? db[finBook].find(x => x.id === id) : null;
  openModal(`
    <h3>${r ? 'Edit Entry' : 'New Entry'} — ${finBook === 'finances' ? 'Shop' : 'Personal'}</h3>
    <div class="row2">
      ${fieldInput('f_date', 'Date', r?.date || bizToday(), 'date')}
      ${fieldInput('f_amount', 'Amount (AED)', r?.amount, 'number', 'step="0.01" min="0"')}
    </div>
    <div class="row2">
      ${fieldSelect('f_type', 'Type', ['Income', 'Expense'], r?.type || 'Expense')}
      ${fieldSelect('f_account', 'Account', ['Cash in Hand', 'Bank'], r?.account || 'Cash in Hand')}
    </div>
    ${fieldInput('f_category', 'Category', r?.category, 'text', 'placeholder="Salary, Supplier, Sales…"')}
    ${fieldArea('f_notes', 'Notes', r?.notes)}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveFin('${r ? r.id : ''}')">Save</button>
    </div>`);
};
window.saveFin = (id) => {
  const amount = parseFloat(val('f_amount'));
  if (!(amount >= 0)) { toast('Amount is required'); return; }
  const data = { date: val('f_date') || bizToday(), type: val('f_type'), account: val('f_account'), amount, category: val('f_category').trim(), notes: val('f_notes').trim() };
  const prefix = finBook === 'finances' ? 'SF' : 'PF';
  if (id) Object.assign(db[finBook].find(x => x.id === id), data);
  else db[finBook].push({ id: nextId(prefix), ...data });
  save(); closeModal(); render(); toast(id ? 'Entry updated' : 'Entry added');
};
window.cashPairModal = () => {
  openModal(`
    <h3>Bank → Cash withdrawal</h3>
    <p class="muted" style="font-size:13px;margin-top:-6px">Creates a paired Expense (Bank) + Income (Cash) so balances stay correct.</p>
    <div class="row2">
      ${fieldInput('cp_date', 'Date', bizToday(), 'date')}
      ${fieldInput('cp_amount', 'Amount (AED)', '', 'number', 'step="0.01" min="0"')}
    </div>
    ${fieldInput('cp_note', 'Note', 'Petty cash withdrawal')}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveCashPair()">Create pair</button>
    </div>`);
};
window.saveCashPair = () => {
  const amount = parseFloat(val('cp_amount'));
  if (!(amount > 0)) { toast('Amount is required'); return; }
  const date = val('cp_date') || bizToday();
  const note = val('cp_note').trim();
  const prefix = finBook === 'finances' ? 'SF' : 'PF';
  const outId = nextId(prefix);
  const inId = nextId(prefix);
  db[finBook].push({ id: outId, date, type: 'Expense', account: 'Bank', amount, category: 'Petty Cash', notes: note });
  db[finBook].push({ id: inId, date, type: 'Income', account: 'Cash in Hand', amount, category: 'Petty Cash', notes: `Cash from bank (pairs with ${outId})` });
  save(); closeModal(); render(); toast('Cash pair created');
};

/* ---------- Credit Ledger ---------- */
let creditFilter = 'pending';
function viewCredit() {
  const cp = creditPending();
  let list = db.credit.slice();
  if (creditFilter === 'pending') list = list.filter(c => c.status === 'Pending');
  else if (creditFilter === 'paid') list = list.filter(c => c.status === 'Paid');
  list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  views.innerHTML = `
    <div class="section-head">
      <div class="tabs">
        ${['pending', 'paid', 'all'].map(f => `<button class="${creditFilter === f ? 'active' : ''}" onclick="setCreditFilter('${f}')">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
      </div>
      <button class="btn primary" onclick="creditModal()">+ New Entry</button>
    </div>
    <div class="grid cols-2">
      <div class="card stat good"><div class="label">Owed to me (pending)</div><div class="value">${fmt(cp.owedToMe)}</div></div>
      <div class="card stat bad"><div class="label">I owe (pending)</div><div class="value">${fmt(cp.iOwe)}</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      ${list.length ? `<div class="tablewrap"><table>
        <thead><tr><th>ID</th><th>Date</th><th>Person</th><th>Type</th><th class="num">Amount</th><th>Account</th><th>Status</th><th>Notes</th><th></th></tr></thead>
        <tbody>${list.map(creditRow).join('')}</tbody>
      </table></div>` : `<div class="empty">No entries here.</div>`}
    </div>`;
}
function creditRow(c) {
  const given = c.type === 'Given';
  return `<tr>
    <td class="muted mono">${c.id}</td>
    <td>${prettyDate(c.date)}</td>
    <td><strong>${esc(c.person)}</strong></td>
    <td><span class="badge ${given ? 'b-brand' : 'b-amber'}">${c.type}</span></td>
    <td class="num mono">${fmt(c.amount)}</td>
    <td class="muted">${esc(c.account)}</td>
    <td><button class="btn sm ${c.status === 'Paid' ? '' : 'primary'}" onclick="toggleCreditStatus('${c.id}')">${c.status}</button></td>
    <td class="muted">${esc(c.notes)}</td>
    <td class="num"><button class="iconbtn" onclick="creditModal('${c.id}')">✎</button><button class="iconbtn danger" onclick="delItem('credit','${c.id}')">🗑</button></td>
  </tr>`;
}
window.setCreditFilter = f => { creditFilter = f; render(); };
window.toggleCreditStatus = id => {
  const c = db.credit.find(x => x.id === id); if (!c) return;
  c.status = c.status === 'Paid' ? 'Pending' : 'Paid';
  save(); render(); toast('Marked ' + c.status);
};
window.creditModal = (id) => {
  const c = id ? db.credit.find(x => x.id === id) : null;
  openModal(`
    <h3>${c ? 'Edit' : 'New'} Credit Entry</h3>
    <div class="row2">
      ${fieldInput('c_person', 'Person', c?.person)}
      ${fieldInput('c_date', 'Date', c?.date || bizToday(), 'date')}
    </div>
    <div class="row2">
      ${fieldSelect('c_type', 'Type', ['Given', 'Taken'], c?.type || 'Given')}
      ${fieldInput('c_amount', 'Amount (AED)', c?.amount, 'number', 'step="0.01" min="0"')}
    </div>
    <div class="row2">
      ${fieldSelect('c_account', 'Account', ['Shop - Cash', 'Shop - Bank', 'Personal - Cash', 'Personal - Bank'], c?.account || 'Shop - Cash')}
      ${fieldSelect('c_status', 'Status', ['Pending', 'Paid'], c?.status || 'Pending')}
    </div>
    ${fieldArea('c_notes', 'Notes', c?.notes)}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveCredit('${c ? c.id : ''}')">Save</button>
    </div>`);
};
window.saveCredit = (id) => {
  const person = val('c_person').trim();
  const amount = parseFloat(val('c_amount'));
  if (!person) { toast('Person is required'); return; }
  if (!(amount >= 0)) { toast('Amount is required'); return; }
  const data = { person, date: val('c_date') || bizToday(), type: val('c_type'), amount, account: val('c_account'), status: val('c_status'), notes: val('c_notes').trim() };
  if (id) Object.assign(db.credit.find(x => x.id === id), data);
  else db.credit.push({ id: nextId('C'), ...data });
  save(); closeModal(); render(); toast(id ? 'Updated' : 'Added');
};

/* ---------- Reminders ---------- */
function viewReminders() {
  const list = db.reminders.slice().sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
    return (a.due || 'z').localeCompare(b.due || 'z');
  });
  views.innerHTML = `
    <div class="section-head">
      <div></div>
      <button class="btn primary" onclick="remModal()">+ New Reminder</button>
    </div>
    <div class="card">
      ${list.length ? `<div class="tablewrap"><table>
        <thead><tr><th>ID</th><th>Category</th><th>Title</th><th>Due</th><th class="num">Amount</th><th>Recurrence</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map(remRow).join('')}</tbody>
      </table></div>` : `<div class="empty">No reminders yet.</div>`}
    </div>`;
}
function remRow(r) {
  const d = daysUntil(r.due);
  let due = prettyDate(r.due);
  if (r.status === 'Active' && d != null) {
    if (d < 0) due = `${prettyDate(r.due)} <span class="badge b-red">${-d}d overdue</span>`;
    else if (d <= 3) due = `${prettyDate(r.due)} <span class="badge b-amber">${d === 0 ? 'today' : d + 'd'}</span>`;
  }
  return `<tr>
    <td class="muted mono">${r.id}</td>
    <td>${esc(r.category)}</td>
    <td><strong>${esc(r.title)}</strong>${r.notes ? `<div class="muted" style="font-size:12px">${esc(r.notes)}</div>` : ''}</td>
    <td>${due}</td>
    <td class="num mono">${r.amount ? fmt(r.amount) : '—'}</td>
    <td>${esc(r.recurrence)}</td>
    <td><span class="badge ${r.status === 'Active' ? 'b-green' : 'b-gray'}">${r.status}</span></td>
    <td class="num">
      <button class="iconbtn" onclick="toggleRem('${r.id}')">${r.status === 'Active' ? '✓' : '↺'}</button>
      <button class="iconbtn" onclick="remModal('${r.id}')">✎</button>
      <button class="iconbtn danger" onclick="delItem('reminders','${r.id}')">🗑</button>
    </td>
  </tr>`;
}
window.toggleRem = id => {
  const r = db.reminders.find(x => x.id === id); if (!r) return;
  r.status = r.status === 'Active' ? 'Done' : 'Active';
  save(); render();
};
window.remModal = (id) => {
  const r = id ? db.reminders.find(x => x.id === id) : null;
  openModal(`
    <h3>${r ? 'Edit' : 'New'} Reminder</h3>
    <div class="row2">
      ${fieldSelect('r_cat', 'Category', ['Payment', 'Document', 'Health', 'Task', 'Habit', 'Other'], r?.category || 'Payment')}
      ${fieldInput('r_due', 'Due date', r?.due, 'date')}
    </div>
    ${fieldInput('r_title', 'Title', r?.title)}
    <div class="row2">
      ${fieldInput('r_amount', 'Amount (AED)', r?.amount, 'number', 'step="0.01" min="0"')}
      ${fieldSelect('r_rec', 'Recurrence', ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'], r?.recurrence || 'None')}
    </div>
    ${fieldInput('r_lead', 'Lead days (alert before)', r?.lead || '3,1')}
    ${fieldArea('r_notes', 'Notes', r?.notes)}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveRem('${r ? r.id : ''}')">Save</button>
    </div>`);
};
window.saveRem = (id) => {
  const title = val('r_title').trim();
  if (!title) { toast('Title is required'); return; }
  const data = { category: val('r_cat'), title, due: val('r_due'), amount: val('r_amount') ? parseFloat(val('r_amount')) : '', recurrence: val('r_rec'), lead: val('r_lead').trim(), notes: val('r_notes').trim() };
  if (id) Object.assign(db.reminders.find(x => x.id === id), data);
  else db.reminders.push({ id: nextId('R'), status: 'Active', ...data });
  save(); closeModal(); render(); toast(id ? 'Updated' : 'Added');
};

/* ---------- Ideas ---------- */
function viewIdeas() {
  const list = db.ideas.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  views.innerHTML = `
    <div class="section-head"><div></div><button class="btn primary" onclick="ideaModal()">+ New Idea</button></div>
    ${list.length ? `<div class="grid cols-2">${list.map(ideaCard).join('')}</div>` : `<div class="card"><div class="empty">No ideas captured yet.</div></div>`}`;
}
function ideaCard(i) {
  return `<div class="card">
    <h3>${esc(i.idea)}<span class="count">${prettyDate(i.date)}</span></h3>
    ${i.category ? `<span class="badge b-brand">${esc(i.category)}</span>` : ''}
    ${i.notes ? `<p class="muted" style="font-size:13px;margin:10px 0 0">${esc(i.notes)}</p>` : ''}
    <div style="margin-top:12px;text-align:right">
      <button class="btn ghost sm" onclick="ideaModal('${i.id}')">Edit</button>
      <button class="btn ghost sm danger" onclick="delItem('ideas','${i.id}')">Delete</button>
    </div>
  </div>`;
}
window.ideaModal = (id) => {
  const i = id ? db.ideas.find(x => x.id === id) : null;
  openModal(`
    <h3>${i ? 'Edit' : 'New'} Idea</h3>
    ${fieldInput('i_idea', 'Idea', i?.idea)}
    ${fieldInput('i_cat', 'Category', i?.category, 'text', 'placeholder="Staff Policy, Marketing…"')}
    ${fieldArea('i_notes', 'Notes', i?.notes)}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveIdea('${i ? i.id : ''}')">Save</button>
    </div>`);
};
window.saveIdea = (id) => {
  const idea = val('i_idea').trim();
  if (!idea) { toast('Idea is required'); return; }
  const data = { idea, category: val('i_cat').trim(), notes: val('i_notes').trim() };
  if (id) Object.assign(db.ideas.find(x => x.id === id), data);
  else db.ideas.push({ id: nextId('I'), date: bizToday(), ...data });
  save(); closeModal(); render(); toast(id ? 'Updated' : 'Added');
};

/* ---------- shared delete ---------- */
window.delItem = (coll, id) => {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  db[coll] = db[coll].filter(x => x.id !== id);
  save(); render(); toast('Deleted');
};

/* ---------- import / export ---------- */
document.getElementById('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lifeos-backup-${bizToday()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('Backup downloaded');
};
document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.counters) throw new Error('bad file');
      if (!confirm('This replaces all current data with the backup. Continue?')) return;
      db = Object.assign(structuredClone(seed), data);
      save(); render(); toast('Data imported');
    } catch (err) { toast('Invalid backup file'); }
    e.target.value = '';
  };
  reader.readAsText(file);
};

/* ---------- Google Sheet cloud sync ---------- */
const CLOUD_KEY = 'lifeos_cloud';
function getCloud() { try { return JSON.parse(localStorage.getItem(CLOUD_KEY)) || {}; } catch (e) { return {}; } }
function setCloud(c) { localStorage.setItem(CLOUD_KEY, JSON.stringify(c)); }

function jsonp(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const cb = '__lifeos_cb_' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, timeout);
    function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb] = (data) => { cleanup(); resolve(data); };
    s.onerror = () => { cleanup(); reject(new Error('network')); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.body.appendChild(s);
  });
}

document.getElementById('cloudBtn').onclick = () => {
  const c = getCloud();
  openModal(`
    <h3>Connect Google Sheet</h3>
    <p class="muted" style="font-size:13px;margin-top:-6px">Paste your Apps Script Web App URL and secret. "Push" sends all your data to the Sheet; your daily WhatsApp/email reports read from there.</p>
    ${fieldInput('cl_url', 'Web App URL (…/exec)', c.url)}
    ${fieldInput('cl_secret', 'Webhook secret', c.secret || 'gazul-lifeos-Kx7q-2026')}
    <div id="cl_status" class="muted" style="font-size:12.5px;min-height:18px"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Close</button>
      <button class="btn" onclick="cloudTest()">Test</button>
      <button class="btn primary" onclick="cloudPush()">☁ Push all to Sheet</button>
    </div>`);
};
function saveCloudFromForm() {
  const c = { url: val('cl_url').trim().replace(/\s+/g, ''), secret: val('cl_secret').trim() };
  setCloud(c); return c;
}
window.cloudTest = async () => {
  const c = saveCloudFromForm();
  const st = document.getElementById('cl_status');
  if (!c.url) { st.textContent = 'Enter the Web App URL first.'; return; }
  st.textContent = 'Testing…';
  try {
    const r = await jsonp(`${c.url}?action=read&secret=${encodeURIComponent(c.secret)}`);
    st.innerHTML = r && r.ok
      ? `<span style="color:var(--green)">✓ Connected. Sheet business day: ${r.businessDate}</span>`
      : `<span style="color:var(--red)">✗ ${r && r.error ? r.error : 'Unexpected response'}</span>`;
  } catch (e) {
    st.innerHTML = `<span style="color:var(--red)">✗ Could not reach the Web App (check URL & that access = Anyone).</span>`;
  }
};
window.cloudPush = () => {
  const c = saveCloudFromForm();
  const st = document.getElementById('cl_status');
  if (!c.url) { st.textContent = 'Enter the Web App URL first.'; return; }
  const payload = { secret: c.secret, action: 'sync', data: {
    tasks: db.tasks, finances: db.finances, personal: db.personal,
    credit: db.credit, reminders: db.reminders, ideas: db.ideas
  }};
  // text/plain keeps this a "simple" request (no CORS preflight). Response is
  // opaque under no-cors, so we confirm the write by reading back via JSONP.
  fetch(c.url, { method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload) })
    .then(async () => {
      st.textContent = 'Sent. Verifying…';
      try {
        const r = await jsonp(`${c.url}?action=read&secret=${encodeURIComponent(c.secret)}`);
        st.innerHTML = r && r.ok
          ? `<span style="color:var(--green)">✓ Pushed. Shop balance on Sheet: ${fmt(r.balances.shop.total)} AED</span>`
          : `<span style="color:var(--green)">✓ Sent to Sheet.</span>`;
      } catch (e) { st.innerHTML = `<span style="color:var(--green)">✓ Sent to Sheet.</span>`; }
      toast('Pushed to Google Sheet');
    })
    .catch(() => { st.innerHTML = `<span style="color:var(--red)">✗ Push failed — check the URL.</span>`; });
};

/* ---------- nav ---------- */
document.getElementById('nav').addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentView = btn.dataset.view;
  render();
});

/* ---------- first-run demo data ---------- */
function seedDemo() {
  if (localStorage.getItem(STORE_KEY)) return;
  const today = bizToday();
  db.finances.push(
    { id: nextId('SF'), date: today, type: 'Expense', account: 'Bank', amount: 27000, category: 'Petty Cash', notes: 'Cheque withdrawal from bank' },
    { id: nextId('SF'), date: today, type: 'Income', account: 'Cash in Hand', amount: 27000, category: 'Petty Cash', notes: 'Cash received from bank (pairs with SF001)' },
    { id: nextId('SF'), date: today, type: 'Expense', account: 'Cash in Hand', amount: 800, category: 'Salary', notes: 'Ibathath' },
    { id: nextId('SF'), date: today, type: 'Expense', account: 'Cash in Hand', amount: 1800, category: 'Salary', notes: 'Savad (juice maker)' },
    { id: nextId('SF'), date: today, type: 'Expense', account: 'Cash in Hand', amount: 1734, category: 'Salary', notes: 'Mishab — Base 1500 + Incentive 234' },
    { id: nextId('SF'), date: today, type: 'Expense', account: 'Cash in Hand', amount: 1700, category: 'Salary', notes: 'Suhail' },
    { id: nextId('SF'), date: today, type: 'Expense', account: 'Cash in Hand', amount: 2000, category: 'Salary', notes: 'Safwan' }
  );
  db.tasks.push(
    { id: nextId('T'), title: 'Corporate lunch offer prep', due: '2026-07-15', priority: 'High', status: 'Open', committed: 'Yes', notes: 'Ties into marketing push', created: new Date().toISOString() },
    { id: nextId('T'), title: 'Verify Mishab incentive vs delivery totals', due: '', priority: 'Medium', status: 'Open', committed: '', notes: 'Base 1500 + 10% above 30k', created: new Date().toISOString() }
  );
  db.reminders.push(
    { id: nextId('R'), category: 'Payment', title: 'Staff Room Rent', due: '2026-07-15', amount: 6500, recurrence: 'Monthly', lead: '3,1', status: 'Active', notes: 'Landlord Ali' }
  );
  db.ideas.push(
    { id: nextId('I'), date: today, idea: 'Mishab incentive structure verification', category: 'Staff Policy', notes: 'Base 1500 + 10% above 30k delivery threshold' }
  );
  save();
}

/* ---------- boot ---------- */
seedDemo();
render();
