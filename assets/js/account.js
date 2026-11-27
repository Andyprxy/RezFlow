import { RESIDENCES } from '../config.js';
import {
  authConfigured,
  exchangeEmailCode,
  pendingRecovery,
  registerAccount,
  requestRecovery,
  safeReturnPath,
  signIn,
  signInHref,
  updateRecoveredPassword,
} from '../auth.js';

const page = document.body.dataset.accountPage;
const query = new URLSearchParams(location.search);
const requestedResidence = query.get('residence');
const explicitResidence = Object.hasOwn(RESIDENCES, requestedResidence) ? requestedResidence : '';
const returnPath = safeReturnPath(query.get('returnTo'), explicitResidence);
const residence = explicitResidence || new URL(returnPath, location.origin).searchParams.get('residence');
const tenant = RESIDENCES[residence];
const status = document.querySelector('#account-status');
const instruction = document.querySelector('#account-instruction');
const forms = Array.from(document.forms);
const callbackPage = page === 'verify' || page === 'reset-password';
const code = callbackPage ? query.get('code') : '';
const callbackFailure =
  callbackPage &&
  (query.has('error') ||
    query.has('error_code') ||
    /(?:^#|&)(?:error|error_code|access_token|refresh_token)=/.test(location.hash) ||
    query.has('token'));

function showStatus(message, tone) {
  status.textContent = message;
  status.dataset.tone = tone;
  status.hidden = false;
}

function continueTo(href, label) {
  const link = document.querySelector('#account-continue');
  link.textContent = label;
  link.href = href;
  document.querySelector('#continue-area').hidden = false;
}

function showPasswordForm() {
  document.querySelector('#recovery-form').hidden = true;
  const form = document.querySelector('#password-form');
  form.hidden = false;
  form.elements.password.focus();
  instruction.textContent = 'Choose a new password for your confirmed account.';
}

function samePassword(form) {
  const password = form.elements.password;
  const confirmation = form.elements.confirmation;
  if (password.value === confirmation.value) return true;
  confirmation.setCustomValidity('Enter the same password in both fields.');
  confirmation.reportValidity();
  return false;
}

function bindForm(id, action) {
  const form = document.getElementById(id);
  if (!form) return;
  const fields = form.querySelector('fieldset');
  const submit = form.querySelector('button[type="submit"]');
  const label = submit.textContent;
  if (form.elements.confirmation) {
    form.addEventListener('input', () => form.elements.confirmation.setCustomValidity(''));
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (fields.disabled || (form.elements.confirmation && !samePassword(form))) return;
    const values = Object.fromEntries(new FormData(form));
    fields.disabled = true;
    submit.textContent = 'Please wait…';
    form.setAttribute('aria-busy', 'true');
    status.hidden = true;
    try {
      await action(values);
    } catch (error) {
      showStatus(error.message, 'error');
      status.focus();
    } finally {
      fields.disabled = false;
      submit.textContent = label;
      form.removeAttribute('aria-busy');
    }
  });
}

if (tenant) {
  document.querySelector('#residence-name').textContent = tenant.name;
  document.body.style.setProperty('--accent', tenant.accent);
  document.body.style.setProperty('--accent-ink', tenant.accent);
  document.body.style.setProperty('--accent-soft', tenant.soft);
  document.querySelector('#account-demo').href = '/' + residence + '/demo/';
}
const accountContext = new URL(signInHref(returnPath, residence), location.origin).search;
for (const link of document.querySelectorAll('[data-account-link]')) {
  link.search = accountContext;
}

if (callbackPage && (code || callbackFailure)) {
  // Scrub one-time links from browser history before rendering any secondary navigation.
  const clean = new URL(location.href);
  for (const param of [
    'code',
    'error',
    'error_code',
    'error_description',
    'token',
    'access_token',
    'refresh_token',
  ])
    clean.searchParams.delete(param);
  clean.hash = '';
  history.replaceState(null, '', clean.pathname + clean.search);
}

bindForm('signin-form', async ({ email, password }) => {
  await signIn(email, password);
  document.querySelector('#signin-form').reset();
  location.replace(returnPath);
});

bindForm('signup-form', async ({ email, password }) => {
  await registerAccount(email, password, returnPath);
  const form = document.querySelector('#signup-form');
  form.reset();
  form.hidden = true;
  showStatus(
    'If this address is eligible, check your inbox for a confirmation link. Open it in this browser. Existing account holders can sign in.',
    'success',
  );
  status.focus();
});

bindForm('recovery-form', async ({ email }) => {
  await requestRecovery(email, returnPath);
  const form = document.querySelector('#recovery-form');
  form.reset();
  form.hidden = true;
  showStatus(
    'If your account is eligible, check your inbox for a reset link. Open the latest link in this browser.',
    'success',
  );
  status.focus();
});

bindForm('password-form', async ({ password }) => {
  const next = await updateRecoveredPassword(password);
  const form = document.querySelector('#password-form');
  form.reset();
  form.hidden = true;
  showStatus('Your password has been updated. Sign in with your new password.', 'success');
  continueTo(signInHref(next), 'Sign in');
  status.focus();
});

async function confirmEmailLink() {
  const retry = document.querySelector('#retry-link');
  retry.hidden = true;
  if (page === 'reset-password') document.querySelector('#recovery-form').hidden = true;
  showStatus('Checking your email link…', 'info');
  try {
    const next = await exchangeEmailCode(page === 'verify' ? 'signup' : 'recovery', code);
    if (page === 'verify') {
      showStatus('Your email is confirmed. Open your workspace to check your residence access.', 'success');
      continueTo(next, 'Continue to workspace');
    } else {
      status.hidden = true;
      showPasswordForm();
    }
  } catch (error) {
    showStatus(error.message, 'error');
    retry.hidden = false;
    if (page === 'reset-password') document.querySelector('#recovery-form').hidden = false;
  }
}

if (!authConfigured() || tenant?.demoOnly) {
  forms.forEach((form) => {
    form.hidden = true;
  });
  instruction.hidden = true;
  showStatus(
    tenant?.demoOnly
      ? 'This residence has a sample workspace.'
      : 'Online account access is awaiting setup. You can explore the sample workspace now.',
    'info',
  );
  document.querySelector('#account-demo').hidden = false;
} else {
  forms.forEach((form) => {
    form.querySelector('fieldset').disabled = false;
  });
  if (callbackFailure) {
    showStatus(
      'This email link is no longer usable. Request a fresh link from the current account service.',
      'error',
    );
  } else if (code) {
    document.querySelector('#retry-link').addEventListener('click', confirmEmailLink);
    confirmEmailLink();
  } else if (page === 'reset-password' && pendingRecovery()) {
    showPasswordForm();
  } else if (page === 'verify') {
    showStatus('Open the confirmation link from your email to complete this step.', 'info');
  }
}
