import {config} from './config.js';
import {residences} from './contract.js';
import {responseHistory, unpackFeed, filterResponses, summarise, shortNames, planLabels, applicationLabels} from './report.js';
import {sampleRows} from './sample.js';
import {fetchJSON} from './http.js';

const byId = id => document.getElementById(id);
function node(tag, className = '', content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const use = document.createElementNS(svg.namespaceURI,'use');
  svg.setAttribute('class','icon');
  svg.setAttribute('aria-hidden','true');
  use.setAttribute('href', new URL('./icons.svg', import.meta.url).href + '#' + name);
  svg.append(use);
  return svg;
}
const dateFmt = new Intl.DateTimeFormat('en-ZA',{day:'2-digit',month:'short',year:'numeric',timeZone:'Africa/Johannesburg'});
const timeFmt = new Intl.DateTimeFormat('en-ZA',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Africa/Johannesburg'});
const number = new Intl.NumberFormat('en-ZA');
const qty = (n, one, many = one + 's') => number.format(n) + ' ' + (n === 1 ? one : many);
const pct = (n, total) => total ? Math.round(100*n/total) + '%' : '—';
const pageSize = 15;
const labels = {all:'All residences', ...residences, other:shortNames.other};
let allRecords = [], matching = [], page = 0, revision = 0;
let mode = 'locked', key = '', loadedAt = null, dialogTrigger = null;
function message(id, text = '') {
  byId(id).textContent = text;
  byId(id).hidden = !text;
}
function setView(view, focus = false) {
  const overview = view === 'overview';
  byId('overview').hidden = !overview;
  byId('log-view').hidden = overview;
  byId('show-overview').setAttribute('aria-pressed',String(overview));
  byId('show-log').setAttribute('aria-pressed',String(!overview));
  if (focus) {
    const heading = byId('log-heading');
    heading.tabIndex = -1;
    heading.focus();
  }
}
function applyFilters({restart = true} = {}) {
  const residence = byId('report-residence').value;
  const status = byId('filter').value;
  const search = byId('search').value;
  matching = filterResponses(allRecords, {residence,status,search});
  if (restart) page = 0;
  byId('scope-name').textContent = labels[residence];
  byId('reset-filters').disabled = residence === config.hostResidence && status === 'all' && search === '';
  updateSync();
  renderOverview(residence);
  renderLog();
}
function resetFilters(residence = config.hostResidence) {
  byId('report-residence').value = residence;
  byId('filter').value = 'all';
  byId('search').value = '';
}
function updateSync() {
  const shown = number.format(matching.length) + ' of ' + qty(allRecords.length,'response') + ' in the 2027 intake';
  byId('sync-status').textContent = shown + (mode === 'live' && loadedAt ? ' · Updated ' + timeFmt.format(loadedAt) + ' SAST' : '');
}
function openLog({residence, status, all = false} = {}) {
  if (all) resetFilters('all');
  if (residence) byId('report-residence').value = residence;
  if (status) byId('filter').value = status;
  applyFilters();
  setView('log', true);
}
function metric(label, n, foot, glyph, tone, status) {
  const card = node('button','kpi kpi-' + tone);
  card.type = 'button';
  card.disabled = !n;
  card.setAttribute('aria-label','View ' + qty(n,'matching response') + ' · ' + label);
  card.addEventListener('click',() => {
    const current = byId('filter').value;
    const keepSpecificPlan = status === 'returning' && ['applied','not_applied','unknown_application'].includes(current);
    openLog({status: keepSpecificPlan ? current : status});
  });
  const symbol = node('span','kpi-symbol'); symbol.append(icon(glyph));
  card.append(symbol,node('span','kpi-label',label),node('strong','',number.format(n)),node('small','',foot));
  return card;
}
function legend(text,count,colour) {
  const line = node('div'), left = node('span'), dot = node('i');
  dot.style.background = colour;
  left.append(dot,document.createTextNode(text));
  line.append(left,node('b','',number.format(count)));
  return line;
}
function bar(label,count,total,colour) {
  const wrap = node('div'), line = node('div','bar-label');
  line.append(node('span','',label),node('b','',number.format(count) + (total ? ' · ' + pct(count,total) : '')));
  const track = node('div','bar-track'), fill = node('i');
  fill.style.background = colour;
  fill.style.width = (total ? count / total * 100 : 0) + '%';
  track.setAttribute('aria-hidden','true');
  track.append(fill); wrap.append(line,track);
  return wrap;
}
function renderOverview(scope) {
  const c = summarise(matching);
  byId('stats').replaceChildren(
    metric('Responses',c.total,'Matching log entries','clipboard','total'),
    metric('Returning',c.returning,'Plan to stay in 2027','return','yes','returning'),
    metric('Not returning',c.leaving,'Plan to leave','door','no','leaving'),
    metric('Applied',c.applied,'Returning and applied','checkcircle','applied','applied'),
    metric('Yet to apply',c.not_applied,'Returning, application due','clock','due','not_applied')
  );
  const returnPercent = c.total ? 100 * c.returning / c.total : 0;
  const knownPercent = c.total ? 100 * (c.returning + c.leaving) / c.total : 0;
  byId('donut').style.background = c.total ? 'conic-gradient(#25745e 0 '+returnPercent+'%,#bd6474 '+returnPercent+'% '+knownPercent+'%,#abb3b8 '+knownPercent+'% 100%)' : '#e5e8e5';
  byId('donut-val').textContent = pct(c.returning,c.total);
  const plans = [legend('Returning',c.returning,'#25745e'),legend('Not returning',c.leaving,'#bd6474')];
  if (c.unknownReturn) plans.push(legend('Unspecified',c.unknownReturn,'#abb3b8'));
  byId('return-legend').replaceChildren(...plans);
  byId('reserve-caption').textContent = 'Of ' + qty(c.returning,'returning response');
  const bars = [bar('Applied',c.applied,c.returning,'#368277'),bar('Yet to apply',c.not_applied,c.returning,'#c27e2b')];
  if (c.unknownApplication) bars.push(bar('Unspecified',c.unknownApplication,c.returning,'#87929a'));
  byId('reserve-bars').replaceChildren(...bars);
  renderBreakdown(scope);
  renderReasons(c.leaving);
  renderRows('latest-list',matching.slice(0,3));
}
function badge(type, label) {
  return node('span','record-badge badge-' + type,label);
}
function renderBreakdown(scope) {
  const table = node('table','scope-table'), header = table.createTHead().insertRow();
  table.setAttribute('aria-label','Matching responses by residence');
  for (const label of ['Residence','Responses','Returning','Yet to apply']) {
    const th = node('th','',label); th.scope = 'col'; header.append(th);
  }
  const body = table.createTBody();
  const keys = scope === 'all' ? [...Object.keys(residences), ...(matching.some(r => r.residence === 'other') ? ['other'] : [])] : [scope];
  for (const id of keys) {
    const c = summarise(matching.filter(row => row.residence === id));
    const tr = body.insertRow(), heading = node('th');
    heading.scope = 'row';
    const link = node('button','res-link');
    link.type = 'button'; link.append(badge(id,shortNames[id]));
    link.setAttribute('aria-label','View matching log for ' + labels[id]);
    link.addEventListener('click',() => openLog({residence:id}));
    heading.append(link); tr.append(heading);
    for (const value of [c.total,c.returning,c.not_applied]) tr.insertCell().textContent = number.format(value);
  }
  byId('residence-summary').replaceChildren(table);
}
function renderReasons(total) {
  const frequency = new Map();
  for (const row of matching) {
    if (row.returning !== 'no') continue;
    const reason = row.reason || 'Unspecified';
    frequency.set(reason,(frequency.get(reason) || 0) + 1);
  }
  const list = [...frequency.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).map(([reason,count]) => {
    const li = node('li'); li.append(node('span','',reason),node('strong','',number.format(count))); return li;
  });
  byId('reason-caption').textContent = 'From ' + qty(total,'non-returning response');
  byId('reasons-summary').replaceChildren(...(list.length ? list : [node('li','no-reasons','No leaving reasons in this selection.')]));
}
function fullName(row) {
  return [row.firstName,row.lastName].filter(Boolean).join(' ') || 'Name unspecified';
}
function stamp(row) {
  if (row.time === null) return row.receivedAt || 'Time unspecified';
  return dateFmt.format(row.time) + ' · ' + timeFmt.format(row.time) + ' SAST';
}
function responseRow(row) {
  const button = node('button','log-entry');
  button.type = 'button';
  button.setAttribute('aria-label','View response from ' + fullName(row) + ', ' + row.residenceLabel + ', ' + stamp(row));
  const who = node('span','log-person'), details = node('span','log-name');
  const initials = [...row.firstName][0] || '';
  const surnameInitial = [...row.lastName][0] || '';
  details.append(node('strong','',fullName(row)),node('small','',row.room ? 'Room ' + row.room : 'Room unspecified'));
  who.append(node('span','log-avatar avatar-' + row.residence,(initials + surnameInitial).toUpperCase() || '·'),details);
  const place = node('span','log-place');
  place.append(badge(row.residence,row.residence === 'other' ? row.residenceLabel : shortNames[row.residence]));
  const status = node('span','log-plan');
  status.append(badge(row.returning,planLabels[row.returning]));
  if (row.returning === 'yes') status.append(node('small','application-'+row.reservation,row.reservation === 'unknown' ? 'Application unspecified' : applicationLabels[row.reservation]));
  const date = node('span','log-date');
  if (row.time !== null) date.append(node('span','',dateFmt.format(row.time)),node('small','',timeFmt.format(row.time) + ' SAST'));
  else date.textContent = stamp(row);
  button.append(who,place,status,date,node('span','log-arrow','›'));
  button.lastChild.setAttribute('aria-hidden','true');
  button.addEventListener('click',() => showDetail(row,button));
  return button;
}
function renderRows(id,rows) {
  const list = byId(id);
  if (!rows.length) {
    const empty = node('div','records-empty');
    empty.append(icon('inbox'),node('strong','',allRecords.length ? 'No matching responses' : 'No responses yet'),node('p','',allRecords.length ? 'Adjust the residence, status or search to see more responses.' : 'Completed 2027 check-ins will appear here.'));
    list.replaceChildren(empty);
    return;
  }
  const header = node('div','log-head');
  header.setAttribute('aria-hidden','true');
  for (const col of ['Resident','Residence','Return plan','Received','']) header.append(node('span','',col));
  list.replaceChildren(header,...rows.map(responseRow));
}
function renderLog() {
  const total = matching.length, pages = Math.max(1,Math.ceil(total / pageSize));
  page = Math.min(Math.max(0,page),pages-1);
  const start = page*pageSize, end = Math.min(total,start+pageSize);
  byId('log-count').textContent = qty(total,'matching response') + (total ? ' · Showing ' + (start+1) + '–' + end + ', newest first' : '');
  renderRows('log-list',matching.slice(start,end));
  byId('pager').hidden = pages < 2;
  byId('page-number').textContent = 'Page ' + (page+1) + ' of ' + pages;
  byId('prev-page').disabled = page === 0;
  byId('next-page').disabled = page === pages-1;
}
function showDetail(row, trigger) {
  dialogTrigger = trigger;
  byId('detail-title').textContent = fullName(row);
  byId('detail-sub').replaceChildren(badge(row.residence,row.residenceLabel),document.createTextNode(' '),badge(row.returning,planLabels[row.returning]));
  const fields = [
    ['Current room',row.room],['Email address',row.email],['Contact number',row.phone],['Gender',row.gender],
    ['Return plans',planLabels[row.returning]],['Reservation application',applicationLabels[row.reservation]]
  ];
  if (row.returning === 'no' || row.reason || row.reasonDetail) fields.push(['Reason for leaving',row.reason],['Additional feedback',row.reasonDetail]);
  fields.push(['Received',stamp(row)],['Submission ID',row.submissionId]);
  const pairs = fields.map(([label,value]) => {
    const item = node('div'); item.append(node('dt','',label),node('dd','',value || 'Unspecified')); return item;
  });
  byId('detail-fields').replaceChildren(...pairs);
  byId('detail').showModal();
}

function display(rows, source, refresh = false) {
  allRecords = rows;
  mode = source;
  byId('access-view').hidden = true;
  byId('workspace').hidden = false;
  byId('source-label').textContent = mode === 'sample' ? 'Sample data' : 'Live responses';
  byId('sample-notice').hidden = mode !== 'sample';
  byId('refresh').hidden = mode === 'sample';
  byId('sign-out').textContent = mode === 'sample' ? 'Exit preview' : 'Sign out';
  if (!refresh) resetFilters();
  byId('other-option').hidden = !rows.some(r => r.residence === 'other') && byId('report-residence').value !== 'other';
  const statuses = byId('filter');
  for (const [value, available] of [
    ['unknown_return',rows.some(r => r.returning === 'unknown')],
    ['unknown_application',rows.some(r => r.returning === 'yes' && r.reservation === 'unknown')]
  ]) statuses.querySelector('[value="'+value+'"]').hidden = !available && statuses.value !== value;
  applyFilters({restart:!refresh});
}
function lock(focus = true) {
  revision++;
  dialogTrigger = null;
  if (byId('detail').open) byId('detail').close();
  key = ''; allRecords = []; matching = []; page = 0; mode = 'locked'; loadedAt = null;
  byId('staff-key').value = '';
  resetFilters();
  for (const id of ['stats','return-legend','reserve-bars','latest-list','log-list','detail-fields','detail-title','detail-sub','sync-status','log-count','source-label','donut-val','page-number','residence-summary','reasons-summary','scope-name','reason-caption','reserve-caption']) byId(id).replaceChildren();
  byId('donut').style.background = '';
  byId('access-view').hidden = false; byId('workspace').hidden = true;
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
    const data = await fetchJSON(config.responsesUrl, {method:'GET',headers:{[config.staffHeader]:candidate,Accept:'application/json'}});
    if (ticket !== revision) return;
    const rows = unpackFeed(data);
    key = candidate; loadedAt = new Date();
    byId('staff-key').value = '';
    display(rows,'live',refresh);
    if (!refresh) { setView('overview'); byId('admin-title').focus(); }
  } catch (error) {
    if (ticket !== revision) return;
    if (error.status === 401 || error.status === 403) {
      lock();
      message('access-error','Access was denied. Check your staff access key and try again.');
    } else if (refresh) {
      updateSync();
      message('workspace-error','Refresh failed. You’re viewing the responses from the last successful update.');
    } else {
      message('access-error','The response service could not be reached or verified. Check the connection and try again.');
    }
  } finally {
    if (ticket === revision) {
      byId('sign-in').disabled = byId('refresh').disabled = byId('preview').disabled = false;
      byId('sign-in').querySelector('span').textContent = 'Open dashboard';
    }
  }
}
byId('access-form').addEventListener('submit',event => {
  event.preventDefault();
  const candidate = byId('staff-key').value.trim();
  if (!candidate) { message('access-error','Enter your staff access key.'); return; }
  loadLive(candidate,false);
});
byId('preview').addEventListener('click',() => {
  lock(false); display(responseHistory(sampleRows),'sample'); setView('overview'); byId('admin-title').focus();
});
byId('refresh').addEventListener('click',() => { if (mode === 'live' && key) loadLive(key,true); });
byId('sign-out').addEventListener('click',() => lock());
byId('report-residence').addEventListener('change',() => applyFilters());
byId('filter').addEventListener('change',() => applyFilters());
byId('search').addEventListener('input',() => applyFilters());
byId('reset-filters').addEventListener('click',() => { resetFilters(); applyFilters(); });
byId('show-overview').addEventListener('click',() => setView('overview'));
byId('show-log').addEventListener('click',() => setView('log'));
byId('all-logs').addEventListener('click',() => openLog({all:true}));
byId('view-all').addEventListener('click',() => openLog());
byId('prev-page').addEventListener('click',() => { page--; renderLog(); });
byId('next-page').addEventListener('click',() => { page++; renderLog(); });
byId('close-detail').addEventListener('click',() => byId('detail').close());
byId('detail').addEventListener('click',event => {
  if (event.target !== byId('detail')) return;
  const r = byId('detail').getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) byId('detail').close();
});
byId('detail').addEventListener('close',() => { if (dialogTrigger?.isConnected) dialogTrigger.focus(); dialogTrigger = null; });
window.addEventListener('pagehide',() => lock(false));
resetFilters();
byId('access-form').hidden = byId('preview').hidden = false;
