import {config} from './config.js';
import {responseHistory, residences} from './contract.js';
import {classify, statusLabels, summarise} from './report.js';
import {sampleRows} from './sample.js';
import {fetchJSON} from './http.js';

const byId = id => document.getElementById(id);
const node = (tag, className, content) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  svg.setAttribute('class','icon');
  svg.setAttribute('aria-hidden','true');
  use.setAttribute('href', new URL('./icons.svg', import.meta.url).href + '#' + name);
  svg.append(use);
  return svg;
}
const dateFmt = new Intl.DateTimeFormat('en-ZA', {day:'2-digit',month:'short',year:'numeric',timeZone:'Africa/Johannesburg'});
const timeFmt = new Intl.DateTimeFormat('en-ZA', {hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Africa/Johannesburg'});
const number = new Intl.NumberFormat('en-ZA');
const pct = (n,total) => total ? Math.round(100 * n / total) + '%' : '—';
const pageSize = 15;
let allRecords = [], records = [], currentIds = new Set(), counts = summarise([]).counts;
let mode = 'locked', key = '', page = 0, revision = 0, loadedAt = null;
let dialogTrigger = null;

function message(id, text = '') {
  const box = byId(id);
  box.textContent = text;
  box.hidden = !text;
}
function setView(view) {
  const overview = view === 'overview';
  byId('overview').hidden = !overview;
  byId('log-view').hidden = overview;
  byId('show-overview').setAttribute('aria-pressed', String(overview));
  byId('show-log').setAttribute('aria-pressed', String(!overview));
  if (!overview) renderLog();
}
function metric(label, value, foot, glyph, tone) {
  const card = node('article','metric ' + tone);
  const mark = node('span','metric-icon'); mark.append(icon(glyph));
  card.append(node('span','metric-label',label),mark,node('strong','',number.format(value)),node('small','',foot));
  return card;
}
function addLegend(label, count, colour) {
  const row = node('div'), left = node('span'), dot = node('i');
  dot.style.backgroundColor = colour;
  left.append(dot, document.createTextNode(label));
  row.append(left, node('b','',number.format(count)));
  return row;
}
function bar(label, n, total, colour) {
  const wrap = node('div'), line = node('div','bar-label');
  line.append(node('span','',label),node('b','',number.format(n) + ' · ' + pct(n,total)));
  const track = node('div','bar-track'), fill = node('i');
  fill.style.backgroundColor = colour;
  fill.style.width = (total ? n / total * 100 : 0) + '%';
  track.setAttribute('aria-hidden','true'); track.append(fill); wrap.append(line,track);
  return wrap;
}
function renderOverview() {
  byId('stats').replaceChildren(
    metric('Returning',counts.returning,'Plan to stay in 2027','home','returning'),
    metric('Applied',counts.applied,'Reported an application','checkcircle',''),
    metric('Yet to apply',counts.not_applied,'Returning, application due','clock','awaiting'),
    metric('Not returning',counts.leaving,'Shared a leaving reason','door','')
  );
  const frac = counts.residents ? 100 * counts.returning / counts.residents : 0;
  byId('donut').style.background = counts.residents ? 'conic-gradient(#167a8b 0 ' + frac + '%, #eec276 ' + frac + '% 100%)' : '#e9e7dd';
  byId('donut-val').textContent = pct(counts.returning,counts.residents);
  byId('return-legend').replaceChildren(addLegend('Returning',counts.returning,'#167a8b'),addLegend('Not returning',counts.leaving,'#eec276'));
  byId('reserve-bars').replaceChildren(bar('Already applied',counts.applied,counts.returning,'#298b84'),bar('Yet to apply',counts.not_applied,counts.returning,'#bd8b3b'));
  byId('latest-list').replaceChildren(...(records.length ? records.slice(0,3).map(responseRow) : [node('p','empty','No responses have been received yet.')]));
}
function responseRow(row) {
  const wrap = node('div','response-row');
  const who = node('div','identity'), initials = (Array.from(row.firstName)[0] || '') + (Array.from(row.lastName)[0] || '');
  const labels = node('div');
  labels.append(node('strong','',row.firstName + ' ' + row.lastName),node('small','',residences[row.residence] + ' · Room ' + row.room + (currentIds.has(row.submissionId) ? '' : ' · Earlier response')));
  who.append(node('span','avatar',initials.toUpperCase()),labels);
  const when = node('div','row-time'), date = new Date(row.receivedAt);
  when.append(node('span','',dateFmt.format(date)),node('small','',timeFmt.format(date) + ' SAST'));
  const state = classify(row), flag = node('span','status-pill ' + state, statusLabels[state]);
  const open = node('button','button quiet row-button','View');
  open.type = 'button';
  open.setAttribute('aria-label','View response from ' + row.firstName + ' ' + row.lastName);
  open.addEventListener('click',() => showDetail(row,open));
  wrap.append(who,when,flag,open);
  return wrap;
}
function showDetail(row, trigger) {
  dialogTrigger = trigger;
  byId('detail-title').textContent = row.firstName + ' ' + row.lastName;
  byId('detail-sub').textContent = 'Room ' + row.room + ' · ' + statusLabels[classify(row)];
  const date = new Date(row.receivedAt);
  const rows = [
    ['Residence',residences[row.residence]], ['Email address',row.email], ['Contact number',row.phone], ['Gender',row.gender], ['Current room',row.room],
    ['Return plans',row.returning === 'yes' ? 'Returning in 2027' : 'Not returning in 2027'],
    ['Reservation application',row.returning === 'yes' ? statusLabels[classify(row)] : 'Not applicable'],
  ];
  if (row.returning === 'no') rows.push(['Reason for leaving',row.reason],['Additional feedback',row.reasonDetail || 'None provided']);
  rows.push(['Received',dateFmt.format(date) + ', ' + timeFmt.format(date) + ' SAST'],
    ['Record status',currentIds.has(row.submissionId) ? 'Latest response for this email' : 'Earlier response for this email'],['Response ID',row.submissionId]);
  const details = rows.map(([name,value]) => {
    const el = node('div'); el.append(node('dt','',name),node('dd','',value)); return el;
  });
  byId('detail-fields').replaceChildren(...details);
  byId('detail').showModal();
}
function renderLog() {
  const q = byId('search').value.toLowerCase().trim(), status = byId('filter').value;
  const compact = q.replace(/[\s().-]/g,'');
  const matched = records.filter(row => {
    const matchesStatus = status === 'all' || (status === 'returning' ? row.returning === 'yes' : classify(row) === status);
    const phoneSearch = /^[\d+]+$/.test(compact) && (row.phone.includes(compact) || (row.phone.startsWith('+27') && ('0'+row.phone.slice(3)).includes(compact)));
    return matchesStatus && (phoneSearch || [row.firstName+' '+row.lastName,row.room,row.email,row.phone].some(v => v.toLowerCase().includes(q)));
  });
  const totalPages = Math.max(1,Math.ceil(matched.length / pageSize));
  page = Math.max(0,Math.min(page,totalPages-1));
  byId('log-count').textContent = matched.length + (matched.length === 1 ? ' response' : ' responses');
  const slice = matched.slice(page * pageSize, (page + 1) * pageSize);
  byId('log-list').replaceChildren(...(slice.length ? slice.map(responseRow) : [node('p','empty',records.length ? 'No responses match this search.' : 'No responses have been received yet.')]));
  byId('pager').hidden = totalPages < 2;
  byId('page-number').textContent = 'Page ' + (page+1) + ' of ' + totalPages;
  byId('prev-page').disabled = page === 0;
  byId('next-page').disabled = page === totalPages-1;
}
function renderResidence() {
  const selected = byId('report-residence').value;
  records = selected === 'all' ? allRecords : allRecords.filter(row => row.residence === selected);
  // Attribute each resident to the residence in their newest response across the group.
  currentIds = summarise(allRecords).currentIds;
  counts = summarise(records.filter(row => currentIds.has(row.submissionId))).counts;
  counts.responses = records.length;
  page = 0;
  updateSync();
  renderOverview();
  if (!byId('log-view').hidden) renderLog();
}
function display(rows, source) {
  mode = source;
  allRecords = rows;
  byId('access-view').hidden = true;
  byId('workspace').hidden = false;
  byId('admin-title').textContent = 'Intake dashboard';
  byId('source-label').textContent = mode === 'sample' ? 'Sample data' : 'Live responses';
  byId('sample-notice').hidden = mode !== 'sample';
  byId('refresh').hidden = mode === 'sample';
  byId('sign-out').textContent = mode === 'sample' ? 'Exit preview' : 'Sign out';
  renderResidence();
}
function updateSync() {
  const summary = counts.residents + (counts.residents === 1 ? ' resident' : ' residents') + ' · ' + counts.responses + (counts.responses === 1 ? ' response' : ' responses');
  byId('sync-status').textContent = summary + (mode === 'live' && loadedAt ? ' · Updated ' + timeFmt.format(loadedAt) + ' SAST' : '');
}
function lock(focus = true) {
  revision++;
  if (byId('detail').open) byId('detail').close();
  dialogTrigger = null;
  byId('report-residence').value = config.hostResidence;
  key = ''; allRecords = []; records = []; currentIds = new Set(); counts = summarise([]).counts; mode = 'locked'; page = 0; loadedAt = null;
  byId('staff-key').value = ''; byId('search').value = ''; byId('filter').value = 'all';
  for (const id of ['stats','return-legend','reserve-bars','latest-list','log-list','detail-fields','detail-title','detail-sub','sync-status','log-count','source-label','donut-val','page-number']) byId(id).replaceChildren();
  byId('donut').style.background = '';
  byId('access-view').hidden = false; byId('workspace').hidden = true;
  byId('admin-title').textContent = 'Management access';
  setView('overview');
  message('workspace-error'); message('access-error');
  byId('sign-in').disabled = byId('refresh').disabled = byId('preview').disabled = false;
  byId('sign-in').querySelector('span').textContent = 'Open dashboard';
  if (focus) byId('staff-key').focus();
}
async function loadLive(candidate, refresh) {
  const ticket = ++revision;
  message('access-error'); message('workspace-error');
  byId('sign-in').disabled = byId('refresh').disabled = byId('preview').disabled = true;
  if (!refresh) byId('sign-in').querySelector('span').textContent = 'Opening…';
  else byId('sync-status').textContent = 'Refreshing resident responses…';
  try {
    const data = await fetchJSON(config.responsesUrl, {method:'GET',headers:{[config.staffHeader]:candidate, Accept:'application/json'}});
    if (ticket !== revision) return;
    if (data?.ok !== true || !Array.isArray(data.responses) || data.intakeYear !== 2027) throw new Error('Invalid data format.');
    // The feed arrives newest first. Restore sheet order for ties before validating it.
    const rows = responseHistory(data.responses.slice().reverse());
    loadedAt = new Date();
    key = candidate; byId('staff-key').value = '';
    display(rows,'live');
    if (!refresh) { setView('overview'); byId('admin-title').focus(); }
  } catch (error) {
    if (ticket !== revision) return;
    if (error.status === 401 || error.status === 403) {
      lock();
      message('access-error','Access was denied. Check your staff access key and try again.');
    } else if (refresh) {
      updateSync();
      message('workspace-error','The latest responses could not be loaded. The dashboard is showing the last successful update.');
    } else {
      message('access-error','The response service could not be reached or verified. Check your connection and access key, then try again.');
    }
  } finally {
    if (ticket === revision) {
      byId('sign-in').disabled = byId('refresh').disabled = byId('preview').disabled = false;
      byId('sign-in').querySelector('span').textContent = 'Open dashboard';
    }
  }
}
byId('report-residence').value = config.hostResidence;
byId('report-residence').addEventListener('change', renderResidence);
byId('access-form').addEventListener('submit',event => {
  event.preventDefault();
  const candidate = byId('staff-key').value.trim();
  if (!candidate) { message('access-error','Enter your staff access key.'); return; }
  loadLive(candidate,false);
});
byId('refresh').addEventListener('click',() => { if (mode === 'live' && key) loadLive(key,true); });
byId('sign-out').addEventListener('click',() => lock());
byId('preview').addEventListener('click',() => {
  lock(false); display(responseHistory(sampleRows),'sample'); setView('overview'); byId('admin-title').focus();
});
byId('show-overview').addEventListener('click',() => setView('overview'));
byId('show-log').addEventListener('click',() => setView('log'));
byId('view-all').addEventListener('click',() => { setView('log'); byId('search').focus(); });
byId('search').addEventListener('input',() => { page = 0; renderLog(); });
byId('filter').addEventListener('change',() => { page = 0; renderLog(); });
byId('prev-page').addEventListener('click',() => { page--; renderLog(); });
byId('next-page').addEventListener('click',() => { page++; renderLog(); });
byId('close-detail').addEventListener('click',() => byId('detail').close());
byId('detail').addEventListener('click',event => { if (event.target === byId('detail')) {
  const rect = byId('detail').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) byId('detail').close();
}});
byId('detail').addEventListener('close',() => { if (dialogTrigger?.isConnected) dialogTrigger.focus(); dialogTrigger = null; });
window.addEventListener('pagehide',() => lock(false));
byId('access-form').hidden = byId('preview').hidden = false;
