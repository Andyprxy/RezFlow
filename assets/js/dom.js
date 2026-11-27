import { CONFIG } from '../config.js';
export const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const icon = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#${escapeHTML(name)}"></use></svg>`;
const formatter = new Intl.DateTimeFormat('en-ZA', {
  timeZone: CONFIG.timeZone,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CONFIG.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function dateText(raw) {
  const d = new Date(raw);
  return Number.isFinite(+d) ? formatter.format(d) : 'Date unavailable';
}
export function localDay(raw) {
  const d = new Date(raw);
  if (!Number.isFinite(+d)) return '';
  const parts = Object.fromEntries(dayFormatter.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function go(ctx, role = ctx.role, section = '') {
  return (
    (ctx.demo ? `/${ctx.residence}/demo/` : '/') +
    role +
    '/' +
    (section ? section + '/' : '') +
    (ctx.demo ? '' : '?residence=' + encodeURIComponent(ctx.residence))
  );
}
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function exportRows(rows, params) {
  const safe = (value) =>
    '"' +
    String(value ?? '')
      .replace(/^[\s]*[=+\-@\t\r]/, (m) => "'" + m)
      .replaceAll('"', '""') +
    '"';
  const lines = [
    ['Reference', 'Type', 'Title', 'Status', 'Updated (SAST)'],
    ...rows.map((r) => [r.id, r.kind, r.title, r.status, dateText(r.updatedAt)]),
  ];
  download(
    new Blob(['\ufeff' + lines.map((line) => line.map(safe).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
    params + '.csv',
  );
}
