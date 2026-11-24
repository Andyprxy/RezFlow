import {config, applicationUrls} from './config.js';
import {deviceReference, readReceipt, rememberReceipt} from './device.js';
import {normalisePhone, validateSubmission, residences} from './contract.js';
import {fetchJSON} from './http.js';

const get = (id) => document.getElementById(id);
const form = get('resident-form');
const panels = [...form.querySelectorAll('[data-step]')];
const rails = [...document.querySelectorAll('[data-rail]')];
const submit = get('continue'), back = get('back');
const field = (name) => form.elements.namedItem(name);
const answer = (name) => String(field(name)?.value || '').trim();
const pendingKey = 'rezflow-residences-2027-pending';
let step = 1, busy = false, previousReturn = '';
let attempt = null;

function showError(message = '') {
  get('form-error').textContent = message;
  get('form-error').hidden = !message;
}
function enableSection(section, enabled) {
  section.hidden = !enabled;
  section.disabled = !enabled;
}
function showStep(next, moveFocus = true) {
  step = next;
  showError();
  panels.forEach((p, i) => enableSection(p, i === step - 1));
  const comingBack = answer('returning') === 'yes';
  enableSection(get('reservation-fields'), step === 3 && comingBack);
  enableSection(get('leaving-fields'), step === 3 && !comingBack);
  rails.forEach((li, i) => {
    li.classList.toggle('done', i < step - 1);
    if (i === step - 1) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
  back.hidden = step === 1;
  submit.textContent = step === 3 ? 'Submit response' : 'Continue';
  get('step-label').textContent = 'Step ' + step + ' of 3';
  get('progress-fill').style.width = (100 * step / 3) + '%';
  if (moveFocus) {
    const title = [...panels[step - 1].querySelectorAll('.question-title')].find(el => !el.closest('[hidden]'));
    title?.focus();
    form.scrollIntoView({block: 'nearest'});
  }
}
function setDetailRequirement() {
  const other = answer('reason') === 'Other';
  field('reasonDetail').required = other;
  get('detail-label').textContent = other ? 'Please tell us why' : 'Anything to add? (optional)';
  field('reasonDetail').placeholder = other ? 'Tell us your main reason for leaving.' : 'Share a little more if you’d like.';
}
form.addEventListener('change', (event) => {
  if (event.target.name === 'returning' && answer('returning') !== previousReturn) {
    previousReturn = answer('returning');
    form.querySelectorAll('[name="reservation"]').forEach(el => { el.checked = false; });
    field('reason').value = '';
    field('reasonDetail').value = '';
    setDetailRequirement();
  }
  if (event.target.name === 'reason') setDetailRequirement();
  if (event.target.name === 'residence') updateResidence();
});
form.addEventListener('input', e => {
  e.target.setCustomValidity?.('');
  showError();
});
function validStep() {
  for (const el of panels[step - 1].querySelectorAll('input, select, textarea')) {
    if (el.matches(':disabled')) continue;
    el.setCustomValidity('');
    const value = el.value.trim();
    if (el.required && !value && ['text','textarea'].includes(el.type)) el.setCustomValidity('Please fill in this field.');
    if (el.name === 'phone' && value && !normalisePhone(value)) el.setCustomValidity('Enter a 10-digit South African number, or include your international country code.');
    if (el.name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) el.setCustomValidity('Enter a complete email address, for example you@example.com.');
    if (!el.checkValidity()) {
      el.reportValidity();
      if (el.type === 'radio') showError('Choose one of the options to continue.');
      return false;
    }
  }
  return true;
}
function answers() {
  const returning = answer('returning');
  return {
    residence: answer('residence'), intakeYear: 2027,
    firstName: answer('firstName'), lastName: answer('lastName'), email: answer('email').toLowerCase(),
    phone: normalisePhone(answer('phone')), gender: answer('gender'), room: answer('room'), returning,
    reservation: returning === 'yes' ? answer('reservation') : 'not_applicable',
    reason: returning === 'no' ? answer('reason') : '', reasonDetail: returning === 'no' ? answer('reasonDetail') : ''
  };
}
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
}
async function referenceFor(payload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  // Keep only a digest and random reference in tab storage, never form fields.
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  if (attempt?.hash === hash) return attempt.id;
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch {}
  attempt = saved?.hash === hash && typeof saved.id === 'string' ? saved : {hash, id: uuid()};
  try { sessionStorage.setItem(pendingKey, JSON.stringify(attempt)); } catch {}
  return attempt.id;
}
function updateResidence() {
  const selected = residences[answer('residence')] || residences[config.hostResidence];
  document.querySelectorAll('[data-selected-residence]').forEach(el => { el.textContent = selected; });
}
function showReceipt(receipt, firstName = '') {
  const wasHidden = get('complete').hidden;
  form.hidden = true;
  get('complete').hidden = false;
  get('thanks-heading').textContent = firstName ? 'Thank you, ' + firstName + '!' : 'Your check-in is complete.';
  get('receipt-description').textContent = firstName ? 'Your feedback has been recorded successfully.' : 'A 2027 response has already been recorded from this browser.';
  const place = residences[receipt.residence];
  const needsApplication = Boolean(place && receipt.reservation === 'not_applied');
  const note = get('outcome-note');
  note.textContent = needsApplication ? 'Your next step is to apply for a 2027 reservation at ' + place + '.'
    : firstName && receipt.reservation === 'applied' ? 'We’ve noted that you plan to return and have already applied for your room.'
    : firstName ? 'Thank you for sharing your plans with the residence team.' : 'If your plans change, please contact residence management.';
  const link = get('apply-link');
  link.hidden = !needsApplication;
  if (needsApplication) link.href = applicationUrls[receipt.residence];
  else link.removeAttribute('href');
  rails.forEach(li => { li.removeAttribute('aria-current'); li.classList.add('done'); });
  if (wasHidden) {
    form.reset();
    get('thanks-heading').focus();
    get('complete').scrollIntoView({block: 'nearest'});
  }
}
async function checkStoredReceipt() {
  const receipt = await readReceipt();
  const newApplicationLink = receipt?.reservation === 'not_applied' && get('apply-link').hidden;
  if (receipt && (get('complete').hidden || newApplicationLink)) showReceipt(receipt);
  return Boolean(receipt);
}
function storageFailure() {
  form.hidden = true;
  get('storage-message').hidden = false;
}
back.addEventListener('click', () => { if (!busy && step > 1) showStep(step - 1); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !validStep()) return;
  if (step < 3) { showStep(step + 1); return; }
  busy = true;
  const payload = answers();
  showError();
  submit.disabled = back.disabled = true;
  panels[step - 1].disabled = true;
  submit.textContent = 'Saving…';
  form.setAttribute('aria-busy','true');
  try {
    if (await checkStoredReceipt()) return;
    const deviceId = await deviceReference();
    const submissionId = await referenceFor(payload);
    const validated = validateSubmission({...payload, submissionId});
    if (!validated.ok) { showError(validated.error); return; }
    const receipt = await fetchJSON(config.submitUrl, {
      method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({...validated.row, deviceId})
    });
    if (receipt?.ok !== true || receipt.submissionId !== submissionId) throw new Error('Receipt not confirmed.');
    const saved = {residence:payload.residence, reservation:payload.reservation};
    try { await rememberReceipt(saved); } catch { /* The sheet already holds the device lock. */ }
    try { sessionStorage.removeItem(pendingKey); } catch {}
    showReceipt(saved, payload.firstName);
  } catch (error) {
    if (error.status === 409 && error.code === 'device_already_recorded') {
      const residence = error.applicationResidence;
      let saved = Object.hasOwn(residences, residence)
        ? {residence, reservation:'not_applied'} : {recorded:true};
      try { saved = await rememberReceipt(saved); } catch {}
      showReceipt(saved);
      return;
    }
    showError(error.status === 400 ? 'The form could not be accepted. Use Back to check your answers and try again.' : 'We couldn’t confirm that your response was saved. Your answers are still here. Check your connection and tap Submit response again.');
  } finally {
    busy = false;
    panels[step - 1].disabled = false;
    submit.disabled = back.disabled = false;
    submit.textContent = 'Submit response';
    form.removeAttribute('aria-busy');
  }
});
async function initialise() {
  try {
    await deviceReference();
    if (await checkStoredReceipt()) return;
    field('residence').value = config.hostResidence;
    updateResidence();
    form.hidden = false;
    showStep(1, false);
  } catch { storageFailure(); }
}
window.addEventListener('storage', event => {
  if (event.key === 'rezflow-2027-complete') checkStoredReceipt().catch(storageFailure);
});
window.addEventListener('pageshow', () => checkStoredReceipt().catch(storageFailure));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !busy) checkStoredReceipt().catch(storageFailure);
});
initialise();
