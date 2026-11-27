import { RESIDENCES } from '../config.js';
import { kinds, roles, sections, label, tone, createKinds, actionText, closed } from './catalog.js';
import { escapeHTML as h, icon, dateText, go, localDay } from './dom.js';

export function badge(status) {
  return `<span class="tag" data-tone="${tone(status)}">${h(label(status))}</span>`;
}
function byKind(records, kind) {
  return records.filter((row) => row.kind === kind);
}
function metric(ctx, value, name, symbol, section, params = {}) {
  const url = new URL(go(ctx, ctx.role, section), location.origin);
  for (const [key, val] of Object.entries(params)) url.searchParams.set(key, val);
  return `<a class="metric" href="${h(url.pathname + url.search)}">${icon(symbol)}<strong class="metric-value">${h(value)}</strong><span class="metric-label">${h(name)}</span></a>`;
}
function rowButton(row) {
  return `<button type="button" class="record-row" data-record="${h(row.id)}"><span class="record-icon">${icon(kinds[row.kind]?.[1] || 'file')}</span><span class="record-copy"><strong>${h(row.title)}</strong><small>${h(kinds[row.kind]?.[0] || label(row.kind))} · ${h(dateText(row.updatedAt))}</small></span><span class="record-meta">${badge(row.status)}</span></button>`;
}
function newButton(kind) {
  return `<button class="button primary" data-create="${h(kind)}">${icon('plus')}${h(actionText[kind])}</button>`;
}
export function recordButtons(ctx, types) {
  return types
    .filter((k) => createKinds[ctx.role].includes(k))
    .map(newButton)
    .join('');
}
function cards(ctx, slugs) {
  return slugs
    .map((slug) => {
      const [name, symbol] = sections[ctx.role][slug];
      return `<a class="feature-card" href="${h(go(ctx, ctx.role, slug))}"><span class="feature-icon">${icon(symbol)}</span><strong>${h(name)}</strong></a>`;
    })
    .join('');
}
function scopeMessage(state) {
  return state.total > state.records.length
    ? `Showing ${state.records.length} of ${state.total} accessible records. Totals and filters apply to the loaded records. `
    : '';
}
export function scopeNote(state) {
  const partial = scopeMessage(state);
  return partial
    ? `<p class="notice" data-tone="info">${h(partial)}<button class="button secondary" data-load-more>Load more records</button></p>`
    : '';
}
export function overview(ctx, state) {
  const r = state.records,
    student = ctx.role === 'students',
    p = byKind(r, 'profile')[0],
    tenant = RESIDENCES[ctx.residence];
  const beds = byKind(r, 'bed'),
    occupied = beds.filter((x) => x.status === 'occupied').length,
    repairs = byKind(r, 'maintenance').filter((x) => !closed.has(x.status));
  const pending = byKind(r, 'application').filter((x) => ['submitted', 'in_review'].includes(x.status));
  const notices = byKind(r, 'announcement'),
    openSecurity = byKind(r, 'incident').filter((x) => !closed.has(x.status));
  const occupancy = beds.length ? Math.round((100 * occupied) / beds.length) + '%' : '—';
  const title = student
    ? p?.fields.firstName
      ? `Hello, ${p.fields.firstName}`
      : 'My residence'
    : 'Residence overview';
  const metrics = student
    ? [
        metric(ctx, repairs.length, 'Open repairs', 'tools', 'maintenance', { group: 'open' }),
        metric(ctx, byKind(r, 'document').length, 'Vault documents', 'file', 'digital-vault'),
        metric(
          ctx,
          byKind(r, 'shuttle').filter((x) => !closed.has(x.status)).length,
          'Active shuttle requests',
          'bus',
          'transport',
          { group: 'open' },
        ),
        metric(ctx, notices.length, 'Residence notices', 'bell', 'notices'),
      ]
    : [
        metric(ctx, occupancy, 'Bed occupancy', 'bed', 'occupancy'),
        metric(ctx, pending.length, 'Pending applications', 'clipboard', 'applications', { group: 'open' }),
        metric(ctx, repairs.length, 'Open repairs', 'tools', 'maintenance', { group: 'open' }),
        metric(ctx, openSecurity.length, 'Open incidents', 'shield', 'security', { group: 'open' }),
      ];
  const heading = student
    ? beds[0]?.fields.room
      ? `Room ${beds[0].fields.room}`
      : 'My room & profile'
    : 'Room availability';
  const bannerText = student
    ? beds[0]
      ? `${tenant.name} · Bed ${beds[0].fields.bed || 'on record'}`
      : 'Check your allocation and application status.'
    : beds.length
      ? `${occupied} occupied · ${beds.length - occupied} available across ${beds.length} recorded beds.`
      : 'No bed inventory is available in the loaded records.';
  const relevant = student
    ? r.filter((x) =>
        ['maintenance', 'housekeeping', 'incident', 'visitor', 'shuttle', 'application'].includes(x.kind),
      )
    : r.filter(
        (x) =>
          [
            'maintenance',
            'incident',
            'visitor',
            'shuttle',
            'housekeeping',
            'application',
            'inspection',
          ].includes(x.kind) && !closed.has(x.status),
      );
  const recent = relevant
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  return `<div class="intro"><div><p class="eyebrow">${h(roles[ctx.role][0])}</p><h1>${h(title)}</h1><p class="subtitle">${student ? 'Your room, requests and residence updates.' : 'Track bed availability, review incoming work and follow up with your team.'}</p></div><div class="actions">${student ? newButton('maintenance') : `<a class="button secondary" href="${h(go(ctx, 'management', 'reports'))}">${icon('chart')}View reports</a>`}</div></div>${scopeNote(state)}
  <section class="overview-banner"><div class="banner-copy"><p class="eyebrow">${student ? 'My accommodation' : h(tenant.short) + ' · Occupancy'}</p><h2>${h(heading)}</h2><p>${h(bannerText)}</p><a class="button secondary" href="${h(go(ctx, ctx.role, student ? 'profile' : 'occupancy'))}">${student ? 'View my room' : 'Open bed register'}</a></div></section>
  <div class="metric-grid">${metrics.join('')}</div><div class="panel-grid"><section class="panel"><div class="section-head"><h2>${student ? 'My recent requests' : 'Needs attention'}</h2></div><div class="record-list">${recent.map(rowButton).join('') || '<p class="empty">No requests to display.</p>'}</div></section><section class="panel"><div class="section-head"><h2>${student ? 'Quick access' : 'Operational registers'}</h2></div><div class="feature-grid quick-grid">${cards(ctx, student ? ['wifi', 'security', 'finances', 'transport'] : ['students', 'inspections', 'housekeeping', 'stock'])}</div></section></div>${student && notices[0] ? `<section class="panel"><div class="section-head"><h2>Latest notice</h2><a href="${h(go(ctx, ctx.role, 'notices'))}">All notices</a></div>${rowButton(notices.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0])}</section>` : ''}`;
}
const pageNotes = {
  applications: 'Review intake applications and their current decision.',
  students: 'Open a resident profile to review the records linked to it.',
  occupancy: 'Review individual beds and assign available spaces.',
  finances: 'View individual statement entries and their reconciliation status.',
  documents: 'View document records for this residence.',
  communication: 'Publish notices to the resident portal.',
  stock: 'Review recorded inventory quantities and units.',
  reports: 'Compare operational volumes and export the records behind them.',
  maintenance: 'Track repair requests from acknowledgement to closure.',
  security: 'Open an incident or visitor record for its latest status.',
  transport: 'Review shuttle requests and the latest shared trip position.',
  housekeeping: 'Track cleaning requests and completed work.',
  inspections: 'Review scheduled inspections and record completion.',
  visitors: 'Review expected arrivals and record check-in or check-out.',
  profile: 'Review your profile, room and accommodation application.',
  wifi: 'View network information provided for your account.',
  notices: 'Updates published by your residence team.',
  'digital-vault': 'Open and manage your residence documents.',
};
export function register(ctx, state, f) {
  const [title, symbol, types] = sections[ctx.role][ctx.section],
    reports = ctx.section === 'reports';
  const records = state.records.filter((r) => !types.length || types.includes(r.kind));
  const scope = scopeNote(state);
  const student = ctx.role === 'students',
    canExport = ctx.role === 'management';
  const intro = pageNotes[ctx.section] || roles[ctx.role][2];
  const statuses = [...new Set(records.map((r) => r.status))].sort();
  return `<section class="intro"><div><p class="eyebrow">${h(roles[ctx.role][0])} · ${h(RESIDENCES[ctx.residence].short)}</p><h1>${h(title)}</h1><p class="subtitle">${h(intro)}</p></div><div class="actions">${recordButtons(ctx, types)}${canExport ? `<button class="button secondary" data-export>${icon('download')}Export CSV</button>` : ''}</div></section>${scope}${ctx.section === 'wifi' && student && !ctx.demo ? '<p class="notice">Network passwords and device telemetry are managed by your residence’s network provider.</p>' : ''}${ctx.role === 'security' || types.includes('incident') ? '<p class="notice">This register records incidents. For immediate assistance, contact on-site security directly.</p>' : ''}${reports ? '<div id="chart-slot"></div>' : ''}
  <section class="panel register-panel"><div class="section-head"><h2>${reports ? 'Source records' : 'Record register'}</h2><button class="icon-button" aria-label="Refresh records" data-refresh>${icon('refresh')}</button></div>
  <div class="filters"><label class="field">Search<input id="search" type="search" placeholder="Title or reference" value="${h(f.text)}"></label><label class="field">Status<select id="status"><option value="">All statuses</option><option value="@open" ${f.status === '@open' ? 'selected' : ''}>Open work</option>${statuses.map((s) => `<option value="${h(s)}" ${s === f.status ? 'selected' : ''}>${h(label(s))}</option>`).join('')}</select></label><label class="field">Updated from<input type="date" id="from" value="${h(f.from)}"></label><label class="field">Updated to<input type="date" id="to" value="${h(f.to)}"></label></div><div id="results" aria-live="polite"></div></section>`;
}
export function filtered(ctx, records, f) {
  const types = sections[ctx.role][ctx.section][2];
  const needle = f.text.toLowerCase().trim();
  return records
    .filter(
      (r) =>
        (!types.length || types.includes(r.kind)) &&
        (!f.status || (f.status === '@open' ? !closed.has(r.status) : r.status === f.status)) &&
        (!needle ||
          [r.title, r.id, r.fields?.room, r.fields?.reference, r.fields?.guestName, kinds[r.kind]?.[0]].some(
            (v) =>
              String(v || '')
                .toLowerCase()
                .includes(needle),
          )) &&
        (!f.from || localDay(r.updatedAt) >= f.from) &&
        (!f.to || localDay(r.updatedAt) <= f.to),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}
function reportChart(records) {
  const counts = Object.entries(kinds)
    .map(([key]) => [key, byKind(records, key).length])
    .filter((r) => r[1])
    .sort((a, b) => b[1] - a[1]);
  return `<section class="panel"><div class="section-head"><h2>Record volume by service</h2></div><div class="report-bars">${counts.map(([kind, n]) => `<div><span>${h(kinds[kind][0])}</span><progress value="${n}" max="${counts[0][1]}"></progress><strong>${n}</strong></div>`).join('') || '<p class="empty">No records in the selected scope.</p>'}</div></section>`;
}
export function resultsView(ctx, rows, f) {
  const size = 8,
    pages = Math.max(1, Math.ceil(rows.length / size));
  f.page = Math.max(1, Math.min(f.page, pages));
  const batch = rows.slice((f.page - 1) * size, f.page * size);
  const table = `<div class="table-scroll"><table><thead><tr><th scope="col">Record</th><th scope="col">Status</th><th scope="col">Updated (SAST)</th></tr></thead><tbody>${batch.map((r) => `<tr><td><button class="record-link" type="button" data-record="${h(r.id)}">${h(r.title)}</button><small>${h(kinds[r.kind]?.[0] || label(r.kind))} · ${h(r.fields?.room || r.id.slice(0, 8))}</small></td><td>${badge(r.status)}</td><td>${h(dateText(r.updatedAt))}</td></tr>`).join('')}</tbody></table></div>`;
  return `<p class="scope-count">${rows.length} ${rows.length === 1 ? 'matching record' : 'matching records'}</p>${batch.length ? (ctx.role === 'students' ? `<div class="record-list">${batch.map(rowButton).join('')}</div>` : table) : '<p class="empty">No matching records. Try another filter or check back for new activity.</p>'}${pages > 1 ? `<div class="pagination"><button type="button" data-page="-1" ${f.page === 1 ? 'disabled' : ''}>Previous</button><span>Page ${f.page} of ${pages}</span><button type="button" data-page="1" ${f.page === pages ? 'disabled' : ''}>Next</button></div>` : ''}`;
}
export { reportChart };
