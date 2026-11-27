import { CONFIG } from '../config.js';
import {
  actionText,
  kinds,
  extraFields,
  optionFields,
  fieldNames,
  statusFlow,
  threadKinds,
  label,
} from './catalog.js';
import { escapeHTML as h, icon, dateText } from './dom.js';
import { badge } from './views.js';
import { uploadDocument, downloadDocument } from './vault.js';
const dialog = document.querySelector('#record-dialog'),
  box = document.querySelector('#dialog-content');
const uuid = () => crypto.randomUUID();
const closeButton =
  '<button type="button" class="icon-button" aria-label="Close dialog" data-close>' +
  icon('close') +
  '</button>';
function top(title) {
  return `<div class="section-head"><h2 id="dialog-title">${h(title)}</h2>${closeButton}</div>`;
}
function field(key) {
  const name = h(fieldNames[key] || label(key)),
    choices = optionFields[key];
  let input;
  if (choices)
    input = `<select name="${key}">${choices.map((v) => `<option>${h(v)}</option>`).join('')}</select>`;
  else if (['date', 'visitDate'].includes(key)) input = `<input name="${key}" type="date" required>`;
  else if (key === 'intakeYear' || key === 'quantity')
    input = `<input name="${key}" type="number" step="1" min="${key === 'intakeYear' ? 2000 : 0}" max="${key === 'intakeYear' ? 2099 : 999999}" required>`;
  else
    input = `<input name="${key}" maxlength="160" ${['guestName', 'room', 'bed', 'pickup', 'destination', 'unit', 'location'].includes(key) ? 'required' : ''}>`;
  return `<label class="field">${name}${input}</label>`;
}
function displayField(key, val) {
  if (key === 'amount') return 'R ' + String(val);
  if (key === 'positionAt') return dateText(val);
  if (Array.isArray(val)) return val.join(', ');
  return val;
}
function fieldList(row) {
  return Object.entries(row.fields || {})
    .filter(
      ([k, v]) =>
        (!['password', 'studentId'].includes(k) && v != null && typeof v !== 'object') ||
        (k === 'devices' && Array.isArray(v)),
    )
    .map(([k, v]) => `<div><dt>${h(fieldNames[k] || label(k))}</dt><dd>${h(displayField(k, v))}</dd></div>`)
    .join('');
}
function changesFor(ctx, row) {
  const next = statusFlow[row.kind]?.[row.status] || [];
  return ctx.role === 'students'
    ? next.filter((s) => s === 'cancelled' && ['shuttle', 'visitor'].includes(row.kind))
    : next;
}
const statusAction = {
  acknowledged: 'Acknowledge',
  in_progress: 'Start work',
  resolved: 'Mark resolved',
  closed: 'Close record',
  checked_in: 'Check in',
  checked_out: 'Check out',
  cancelled: 'Cancel request',
  accepted: 'Accept request',
  completed: 'Mark complete',
  in_review: 'Start review',
  approved: 'Approve application',
  rejected: 'Reject application',
};
export function makeDialogs(ctx, getRecords, save, onSaved) {
  let record = null,
    intent = null,
    saving = false,
    submission = null,
    reference = null,
    previousSignature = null;
  function show(html) {
    box.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  function error(message) {
    const slot = box.querySelector('[data-error]');
    if (slot) {
      slot.hidden = false;
      slot.textContent = message;
    }
  }
  function errorSlot() {
    return '<p class="notice" data-tone="error" role="alert" data-error hidden></p>';
  }
  function begin(type, kind) {
    intent = { type, kind };
    submission = uuid();
    reference = uuid();
    previousSignature = null;
  }
  function create(kind) {
    begin('create', kind);
    record = null;
    const attachment =
      kind === 'document'
        ? ctx.demo
          ? '<p class="notice">The demo attaches a sample PDF. Use fictional details.</p>'
          : `<label class="field">Private document · 65 KiB maximum<input type="file" name="file" accept="application/pdf,image/png,image/jpeg" required></label>`
        : '';
    if (kind === 'document' && !ctx.demo && !CONFIG.vault.enabled) {
      show(
        top('Private file upload') +
          '<p>Your residence has not enabled private file uploads in this workspace.</p>',
      );
      return;
    }
    show(
      top(actionText[kind]) +
        `<form class="stack" id="action-form"><label class="field">Title<input name="title" maxlength="160" required autofocus></label><div class="form-grid">${(extraFields[kind] || []).map(field).join('')}</div><label class="field">${kind === 'announcement' ? 'Notice' : 'Details'}<textarea name="detail" rows="3" maxlength="2000" ${kind === 'announcement' ? 'required' : ''}></textarea></label>${attachment}${kind === 'incident' ? '<p class="notice">Saving a report records it in the security desk. Contact on-site security directly for urgent assistance.</p>' : ''}${errorSlot()}<div class="dialog-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">${kind === 'announcement' ? 'Publish notice' : 'Save record'}</button></div></form>`,
    );
  }
  function detail(id) {
    record = getRecords().find((r) => r.id === id);
    if (!record) return;
    const row = record;
    begin('view', row.kind);
    const timeline = (row.history || [])
      .slice()
      .reverse()
      .map(
        (e) =>
          `<li><strong>${h(e.message || label(e.action))}</strong><small>${h(dateText(e.at))}${e.role ? ' · ' + h(label(e.role)) : ''}</small></li>`,
      )
      .join('');
    const buttons = changesFor(ctx, row).map(
      (s) =>
        `<button class="button secondary" type="button" data-next="${h(s)}">${h(statusAction[s] || label(s))}</button>`,
    );
    if (row.kind === 'bed' && ctx.role === 'management')
      buttons.push(
        `<button class="button secondary" type="button" data-op="${row.owner ? 'release' : 'allocate'}">${row.owner ? 'Release bed' : 'Allocate bed'}</button>`,
      );
    if (row.kind === 'bed' && row.owner && ctx.role === 'management')
      buttons.push('<button class="button secondary" type="button" data-op="moveBed">Move resident</button>');
    if (row.kind === 'stock' && ctx.role === 'management')
      buttons.push(
        '<button class="button secondary" type="button" data-op="adjustStock">Record stock movement</button>',
      );
    if (row.kind === 'shuttle' && row.status === 'accepted' && ['management', 'transport'].includes(ctx.role))
      buttons.push(
        `<button class="button secondary" data-op="position">${ctx.demo ? 'Share sample position' : 'Share current location'}</button>`,
      );
    if (threadKinds.includes(row.kind) && !['closed', 'completed', 'cancelled'].includes(row.status))
      buttons.push('<button class="button secondary" data-op="comment">Add update</button>');
    if (row.kind === 'document' && (ctx.demo || CONFIG.vault.enabled))
      buttons.push(
        `<button class="button secondary" data-download>${icon('download')}Download ${ctx.demo ? 'sample' : 'file'}</button>`,
      );
    const wifi =
      ctx.demo && row.kind === 'wifi' && row.fields.password
        ? '<button type="button" class="button secondary" data-wifi>Show sample Wi-Fi password</button><p data-password hidden></p>'
        : '';
    const linked =
      row.kind === 'profile' && row.owner
        ? getRecords().filter((r) => r.owner === row.owner && r.id !== row.id)
        : [];
    const position = row.fields?.positionAt
      ? `<p class="notice">${Date.now() - new Date(row.fields.positionAt).getTime() > 600000 ? 'Last location is over 10 minutes old.' : 'Latest shared location.'} ${h(dateText(row.fields.positionAt))} SAST.</p>`
      : '';
    show(
      top(row.title) +
        `<div class="detail-meta">${badge(row.status)}<span>${h(kinds[row.kind]?.[0] || label(row.kind))} · ${h(row.id.slice(0, 8))}</span></div>${row.detail ? `<p class="record-detail">${h(row.detail)}</p>` : ''}<dl class="record-fields">${fieldList(row)}</dl>${position}${wifi}<div class="actions">${buttons.join('')}</div>${errorSlot()}${linked.length ? `<h3>Linked records</h3><div class="related">${linked.map((r) => `<button class="record-link" type="button" data-related="${h(r.id)}">${h(r.title)}</button>`).join('')}</div>` : ''}<h3>Activity</h3><ul class="timeline">${timeline || '<li>Record received without earlier activity.</li>'}</ul>`,
    );
  }
  function prepare(op, next) {
    begin(op, record.kind);
    intent.next = next;
    let title, body;
    if (op === 'transition') {
      title = statusAction[next] || 'Change status';
      body = `<p>Change <strong>${h(record.title)}</strong> from ${h(label(record.status))} to ${h(label(next))}?</p>`;
    } else if (op === 'comment') {
      title = 'Add update';
      body =
        '<label class="field">Update<textarea name="message" rows="4" maxlength="1000" required autofocus></textarea></label>';
    } else if (op === 'adjustStock') {
      title = 'Record stock movement';
      body =
        '<label class="field">Quantity change · use a minus for stock issued<input name="change" type="number" min="-999999" max="999999" step="1" required></label><label class="field">Movement reason<input name="note" maxlength="200" required></label>';
    } else if (op === 'moveBed') {
      title = 'Move resident';
      const vacant = getRecords().filter((r) => r.kind === 'bed' && r.status === 'available');
      if (!vacant.length) {
        show(top(title) + '<p>No available bed in the loaded inventory.</p>');
        return;
      }
      body = `<label class="field">Destination bed<select name="destinationId" required><option value="">Choose an available bed</option>${vacant.map((r) => `<option value="${h(r.id)}">${h(r.title)}</option>`).join('')}</select></label><p>The two bed assignments update together.</p>`;
    } else if (op === 'allocate') {
      const all = getRecords(),
        inUse = new Set(all.filter((r) => r.kind === 'bed').map((r) => r.owner));
      const candidates = all.filter((r) => r.kind === 'profile' && r.owner && !inUse.has(r.owner));
      title = 'Allocate bed';
      body = candidates.length
        ? `<label class="field">Resident<select name="studentId" required><option value="">Choose a resident</option>${candidates.map((r) => `<option value="${h(r.owner)}">${h(r.title)}</option>`).join('')}</select></label>`
        : '<p>No unallocated resident profile is available in the loaded records.</p>';
      if (!candidates.length) {
        show(top(title) + body);
        return;
      }
    } else if (op === 'release') {
      title = 'Release bed';
      body = `<p>Release the current allocation for <strong>${h(record.title)}</strong>?</p>`;
    } else {
      title = ctx.demo ? 'Share sample position' : 'Share current location';
      body = ctx.demo
        ? '<p>A fictional shuttle position will be attached to this trip.</p>'
        : '<p>Your device will share one position with this trip’s requester and authorised staff. The location clears when the trip closes.</p>';
    }
    show(
      top(title) +
        `<form class="stack" id="action-form">${body}${errorSlot()}<div class="dialog-actions"><button type="button" data-back>Back</button><button type="submit" class="primary">${op === 'comment' ? 'Save update' : 'Confirm'}</button></div></form>`,
    );
  }
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b || saving) return;
    if (b.hasAttribute('data-close')) dialog.close();
    else if (b.hasAttribute('data-back')) detail(record.id);
    else if (b.dataset.op) prepare(b.dataset.op);
    else if (b.dataset.next) prepare('transition', b.dataset.next);
    else if (b.dataset.related) detail(b.dataset.related);
    else if (b.hasAttribute('data-wifi')) {
      const p = box.querySelector('[data-password]');
      p.hidden = !p.hidden;
      p.textContent = p.hidden ? '' : record.fields.password;
      b.textContent = p.hidden ? 'Show sample Wi-Fi password' : 'Hide sample Wi-Fi password';
    } else if (b.hasAttribute('data-download')) {
      b.disabled = true;
      try {
        await downloadDocument(ctx, record);
      } catch (err) {
        error(err.message);
      } finally {
        b.disabled = false;
      }
    }
  });
  let position = null;
  box.addEventListener('submit', async (e) => {
    if (e.target.id !== 'action-form') return;
    e.preventDefault();
    if (saving) return;
    const form = e.target,
      data = new FormData(form),
      value = (k) => String(data.get(k) || '').trim(),
      controls = [...form.elements, ...box.querySelectorAll('[data-close]')];
    saving = true;
    controls.forEach((c) => (c.disabled = true));
    const submit = form.querySelector('button[type=submit]'),
      original = submit.textContent;
    submit.textContent = 'Saving…';
    form.setAttribute('aria-busy', 'true');
    try {
      let payload = {},
        action = intent.type;
      if (action === 'create') {
        const fields = {};
        for (const k of extraFields[intent.kind] || []) if (value(k)) fields[k] = value(k);
        payload = { kind: intent.kind, title: value('title'), detail: value('detail'), fields };
        if (!payload.title) throw new Error('Enter a title.');
        if (intent.kind === 'document') {
          fields.reference = reference;
          if (!ctx.demo) await uploadDocument(ctx, reference, data.get('file'));
        }
      } else if (action === 'comment') {
        payload = { message: value('message') };
        if (!payload.message) throw new Error('Enter an update.');
      } else if (action === 'transition') payload = { status: intent.next, expectedStatus: record.status };
      else if (action === 'adjustStock') {
        payload = { change: Number(value('change')), note: value('note') };
        if (!payload.change || !payload.note)
          throw new Error('Enter a nonzero quantity and movement reason.');
      } else if (action === 'moveBed')
        payload = { destinationId: value('destinationId'), studentId: record.owner };
      else if (action === 'allocate' || action === 'release')
        payload = { studentId: action === 'allocate' ? value('studentId') : record.owner };
      else if (action === 'position') {
        if (ctx.demo) payload = { latitude: -25.7479, longitude: 28.2293 };
        else {
          if (!navigator.geolocation) throw new Error('This device cannot share a location.');
          if (!position) {
            const result = await new Promise((ok, no) =>
              navigator.geolocation.getCurrentPosition(
                ok,
                () => no(new Error('Location is unavailable. Check the device permission and retry.')),
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
              ),
            );
            position = { latitude: result.coords.latitude, longitude: result.coords.longitude };
          }
          payload = position;
        }
      }
      const signature = JSON.stringify(payload);
      if (previousSignature && previousSignature !== signature)
        throw new Error(
          'A previous attempt used different details. Restore those details to check its result, or close and refresh the register first.',
        );
      previousSignature = signature;
      const saved = await save({
        action,
        ...(record ? { recordId: record.id } : {}),
        submissionId: submission,
        payload,
      });
      position = null;
      dialog.close();
      onSaved(saved);
    } catch (err) {
      error(err.message);
    } finally {
      saving = false;
      controls.forEach((c) => (c.disabled = false));
      form.removeAttribute('aria-busy');
      submit.textContent = original;
    }
  });
  dialog.addEventListener('cancel', (e) => {
    if (saving) e.preventDefault();
  });
  dialog.addEventListener('close', () => {
    position = null;
  });
  return { create, detail };
}
