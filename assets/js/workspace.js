import { RESIDENCES, CONFIG } from '../config.js';
import { roles, sections } from './catalog.js';
import { escapeHTML as h, icon, go, exportRows } from './dom.js';
import { overview, register, filtered, resultsView, reportChart } from './views.js';
import { makeDialogs } from './record-dialog.js';

const body = document.body,
  query = new URLSearchParams(location.search),
  demo = body.dataset.mode === 'demo';
const ctx = {
  demo,
  role: body.dataset.role,
  section: body.dataset.section || '',
  residence: demo ? body.dataset.residence : query.get('residence'),
};
const $ = (id) => document.getElementById(id),
  screen = $('screen'),
  feedback = $('feedback');
const filters = {
  text: '',
  status: query.get('group') === 'open' ? '@open' : query.get('status') || '',
  from: '',
  to: '',
  page: 1,
};
let state = { records: [], total: 0, nextCursor: null },
  adapter,
  dialogs,
  loader,
  busy = false;
const isOverview = () => !ctx.section && ['students', 'management'].includes(ctx.role);
function link(section, compact = false) {
  const [name, symbol] = sections[ctx.role][section];
  const short = {
    maintenance: 'Repairs',
    profile: 'Profile',
    security: 'Security',
    finances: 'Finances',
    applications: 'Intake',
    occupancy: 'Beds',
    visitors: 'Visitors',
  };
  return `<a href="${h(go(ctx, ctx.role, section))}" ${section === ctx.section ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${h(compact ? short[section] || name : name)}</span></a>`;
}
function menu(open) {
  body.classList.toggle('nav-open', open);
  $('scrim').hidden = !open;
  $('menu-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('side-nav').querySelector('a')?.focus();
  else $('menu-toggle').focus();
}
function shell() {
  const t = RESIDENCES[ctx.residence];
  body.dataset.residence = ctx.residence;
  body.style.setProperty('--accent', t.accent);
  body.style.setProperty('--accent-ink', t.accent);
  body.style.setProperty('--accent-soft', t.soft);
  $('tenant').innerHTML =
    `<span class="tenant-mark" aria-hidden="true">${h(t.mark)}</span><span class="tenant-name"><small>Residence</small><strong>${h(t.short)}</strong></span>`;
  $('crumb').innerHTML =
    `<span>${h(t.short)}</span><span class="crumb-role">/ ${h(roles[ctx.role][0])}</span>`;
  $('top-actions').innerHTML =
    `<span class="mode-pill" data-mode="${demo ? 'demo' : 'live'}">${demo ? 'Demo workspace' : CONFIG.environment === 'test' ? 'Test workspace' : 'Operational workspace'}</span><a class="button secondary" href="${demo ? `/${ctx.residence}/demo/` : `/workspace/?residence=${ctx.residence}`}">Switch role</a>`;
  $('side-nav').innerHTML =
    '<p class="nav-label">Workspace</p>' +
    Object.keys(sections[ctx.role])
      .map((s) => link(s))
      .join('');
  const eligible = Object.entries(RESIDENCES).filter(([, r]) => demo || !r.demoOnly);
  $('sidebar-foot').innerHTML =
    `<div class="scope-switch"><label>Residence<select id="switch-res">${eligible.map(([id, r]) => `<option value="${id}" ${id === ctx.residence ? 'selected' : ''}>${h(r.short)}</option>`).join('')}</select></label></div>${demo ? '<small>Fictional records · saved in this browser</small>' : '<button type="button" class="button secondary" data-signout>Sign out</button>'}`;
  const quick =
    ctx.role === 'students'
      ? ['', 'maintenance', 'profile']
      : ctx.role === 'management'
        ? ['', 'applications', 'occupancy']
        : Object.keys(sections[ctx.role]).slice(0, 3);
  $('bottom-nav').innerHTML =
    quick.map((s) => link(s, true)).join('') +
    `<button type="button" data-menu>${icon('menu')}<span>Menu</span></button>`;
  $('switch-res').addEventListener('change', (e) => {
    location.assign(go({ ...ctx, residence: e.target.value }, ctx.role, ctx.section));
  });
  $('menu-toggle').addEventListener('click', () => menu(!body.classList.contains('nav-open')));
  $('scrim').addEventListener('click', () => menu(false));
  document.addEventListener('keydown', (e) => {
    if (body.classList.contains('nav-open') && e.key === 'Escape') menu(false);
    if (body.classList.contains('nav-open') && e.key === 'Tab') {
      const links = [...$('sidebar').querySelectorAll('a,button,select')];
      const first = links[0],
        last = links.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
function notice(text, tone = 'info') {
  feedback.className = text ? 'notice' : '';
  feedback.dataset.tone = tone;
  feedback.textContent = text;
}
function slice() {
  return filtered(ctx, state.records, filters);
}
function results() {
  if (!$('results')) return;
  const rows = slice();
  $('results').innerHTML = resultsView(ctx, rows, filters);
  if ($('chart-slot')) $('chart-slot').innerHTML = reportChart(rows);
}
function render() {
  screen.innerHTML = isOverview() ? overview(ctx, state) : register(ctx, state, filters);
  if (!isOverview()) results();
}
function restriction(error) {
  const t = RESIDENCES[ctx.residence];
  return `<div class="intro"><div><p class="eyebrow">${h(t.name)}</p><h1>${h(sections[ctx.role][ctx.section][0])}</h1></div></div><section class="panel"><div class="section-head"><h2>${error.code === 'SETUP' ? 'Workspace awaiting setup' : error.status === 401 ? 'Sign in required' : error.status === 403 ? 'Access restricted' : 'Records unavailable'}</h2></div><p>${h(error.message)}</p><div class="actions">${error.status === 401 ? `<a class="button primary" href="${h(adapter.signInHref(location.pathname + location.search, ctx.residence))}">Sign in</a>` : ''}<button class="button secondary" data-refresh>Try again</button><a class="button secondary" href="/${ctx.residence}/demo/${ctx.role}/">Explore synthetic demo</a>${t.questionnaire ? `<a class="button secondary" href="${t.questionnaire}">2027 resident check-in</a>` : ''}</div></section>`;
}
async function load(more = false) {
  if (more && (!state.nextCursor || busy)) return;
  loader?.abort();
  const controller = new AbortController();
  loader = controller;
  busy = true;
  screen.setAttribute('aria-busy', 'true');
  if (!more) screen.innerHTML = '<p class="skeleton" role="status">Loading residence records…</p>';
  else notice('Loading more records…');
  try {
    const data = await adapter.read(ctx, more ? state.nextCursor : null, controller.signal);
    if (controller.signal.aborted) return;
    const merged = new Map((more ? state.records : []).map((r) => [r.id, r]));
    data.records.forEach((r) => merged.set(r.id, r));
    state = { ...data, records: [...merged.values()] };
    notice('');
    render();
  } catch (err) {
    if (controller.signal.aborted) return;
    if (!more) {
      state = { records: [], total: 0, nextCursor: null };
      screen.innerHTML = restriction(err);
    } else notice(err.message, 'error');
  } finally {
    if (loader === controller) {
      busy = false;
      screen.removeAttribute('aria-busy');
    }
  }
}
function saved(row) {
  const { relatedRecords = [], ...primary } = row;
  for (const changed of [primary, ...relatedRecords]) {
    const found = state.records.findIndex((r) => r.id === changed.id);
    if (found === -1) {
      state.records.push(changed);
      state.total++;
    } else state.records[found] = changed;
  }
  render();
  notice(demo ? 'Saved in this demonstration.' : 'Record saved.', 'success');
}
async function boot() {
  const tenant = Object.hasOwn(RESIDENCES, ctx.residence) && RESIDENCES[ctx.residence];
  if (!tenant || (!demo && tenant.demoOnly)) {
    $('top-actions').innerHTML = '<a class="button secondary" href="/">RezFlow home</a>';
    screen.innerHTML = `<section class="intro"><div><p class="eyebrow">${h(roles[ctx.role][0])}</p><h1>Choose your residence</h1><p class="subtitle">Open this workspace for the residence assigned to your account.</p></div></section><div class="feature-grid">${Object.entries(
      RESIDENCES,
    )
      .filter(([, r]) => !r.demoOnly)
      .map(
        ([id, r]) =>
          `<a class="feature-card" href="${h(go({ ...ctx, residence: id }, ctx.role, ctx.section))}">${icon('building')}<strong>${h(r.name)}</strong></a>`,
      )
      .join('')}</div>`;
    return;
  }
  shell();
  if (demo) {
    const mod = await import('./demo.js');
    adapter = { read: mod.readDemo, write: mod.writeDemo };
  } else {
    const [api, auth] = await Promise.all([import('../api.js'), import('../auth.js')]);
    adapter = {
      read: api.readRecords,
      write: api.writeRecord,
      signOut: auth.signOut,
      signInHref: auth.signInHref,
    };
    if (!auth.hasSession()) document.querySelector('[data-signout]')?.remove();
  }
  dialogs = makeDialogs(
    ctx,
    () => state.records,
    (change) => adapter.write(ctx, change),
    saved,
  );
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-menu')) menu(true);
    else if (b.hasAttribute('data-refresh')) await load();
    else if (b.hasAttribute('data-load-more')) await load(true);
    else if (b.dataset.record) {
      notice('');
      dialogs.detail(b.dataset.record);
    } else if (b.dataset.create) {
      notice('');
      dialogs.create(b.dataset.create);
    } else if (b.dataset.page) {
      filters.page += Number(b.dataset.page);
      results();
    } else if (b.hasAttribute('data-export')) exportRows(slice(), `RezFlow-${ctx.residence}-${ctx.section}`);
    else if (b.hasAttribute('data-signout')) {
      try {
        await adapter.signOut();
      } finally {
        location.assign(adapter.signInHref(location.pathname + location.search, ctx.residence));
      }
    }
  });
  screen.addEventListener('input', (e) => {
    const map = { search: 'text', from: 'from', to: 'to', status: 'status' };
    if (Object.hasOwn(map, e.target.id)) {
      filters[map[e.target.id]] = e.target.value;
      filters.page = 1;
      results();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      !$('record-dialog').open &&
      !busy &&
      !screen.querySelector('button[data-refresh]:only-child')
    )
      load();
  });
  await load();
}
boot().catch(() => {
  screen.innerHTML =
    '<section class="panel"><h1>Workspace unavailable</h1><p>Reload this page to try again.</p><a class="button secondary" href="/">RezFlow home</a></section>';
});
