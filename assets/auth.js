// Static Pages client for the project's Supabase Auth (GoTrue) HTTP API.
import { CONFIG, RESIDENCES } from './config.js';

const PORTAL_PATH = /^\/(students|management|maintenance|security|transport|housekeeping)(\/[a-z0-9-]+)*\/?$/;
const AUTH_TIMEOUT_MS = 15000;
const FLOW_LIFETIME_MS = 60 * 60 * 1000;
const REFRESH_MARGIN_MS = 30000;
let refreshPromise;
let sessionRevision = 0;

function projectOrigin() {
  try {
    const url = new URL(CONFIG.auth.url);
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    )
      return url.origin;
  } catch {
    /* An unconfigured project is valid for a demo-only deployment. */
  }
  return '';
}

export function authConfigured() {
  return Boolean(projectOrigin() && /^sb_publishable_[A-Za-z0-9_-]+$/.test(CONFIG.auth?.publishableKey));
}

function key(name) {
  return `rezflow:auth:v2:${CONFIG.environment}:${projectOrigin()}:${name}`;
}

function read(store, name) {
  try {
    return JSON.parse(window[store].getItem(key(name)));
  } catch {
    return null;
  }
}

function save(store, name, data) {
  try {
    window[store].setItem(key(name), JSON.stringify(data));
  } catch {
    throw new Error('Allow browser storage for this site, then try again.');
  }
}

function forget(store, name) {
  try {
    window[store].removeItem(key(name));
  } catch {
    /* Storage can be disabled. */
  }
}

function publicError(status, code) {
  if (status === 429 || code === 'over_email_send_rate_limit')
    return 'Too many attempts. Wait a few minutes, then try again.';
  if (code === 'email_not_confirmed') return 'Confirm your email using the link in your inbox, then sign in.';
  if (code === 'invalid_credentials') return 'Check your email address and password, then try again.';
  if (code === 'weak_password' || code === 'same_password')
    return 'Choose a different, stronger password and try again.';
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'bad_code_verifier' ||
    code === 'flow_state_not_found'
  ) {
    return 'This email link has expired or belongs to a different request. Use your latest email or start again.';
  }
  if (status >= 500) return 'Account services are temporarily unavailable. Please try again later.';
  if (status === 401 || status === 403) return 'Your sign-in could not be confirmed. Please sign in again.';
  return 'The account service could not complete this request. Check your details and try again.';
}

async function authRequest(path, { method = 'POST', body, token } = {}) {
  if (!authConfigured()) throw new Error('Online account access is awaiting setup for this deployment.');
  const headers = { apikey: CONFIG.auth.publishableKey, Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    let response;
    let data;
    try {
      response = await fetch(projectOrigin() + '/auth/v1/' + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
      // Logout may return 204 or an empty 200. Do not trust a successful HTML proxy page.
      const raw = await response.text();
      data = raw ? JSON.parse(raw) : {};
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Unexpected response');
    } catch {
      throw new Error(
        'Unable to confirm the response from account services. Check your connection and try again.',
      );
    }
    if (!response.ok) {
      const error = new Error(publicError(response.status, data.error_code || data.code));
      error.status = response.status;
      error.code = data.error_code || data.code || '';
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function tokenBundle(data) {
  const expiresAt = data.expires_at
    ? Number(data.expires_at) * 1000
    : Date.now() + Number(data.expires_in) * 1000;
  if (
    typeof data.access_token !== 'string' ||
    !data.access_token ||
    typeof data.refresh_token !== 'string' ||
    !data.refresh_token ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    String(data.token_type || '').toLowerCase() !== 'bearer'
  ) {
    throw new Error('The account service returned an incomplete session. Please sign in again.');
  }
  return { access: data.access_token, refresh: data.refresh_token, expiresAt };
}

function normalSession() {
  const session = read('sessionStorage', 'session');
  return authConfigured() &&
    typeof session?.access === 'string' &&
    typeof session?.refresh === 'string' &&
    Number.isFinite(session.expiresAt)
    ? session
    : null;
}

export function hasSession() {
  return Boolean(normalSession());
}

export async function getAccessToken() {
  const current = normalSession();
  if (!current) return null;
  if (current.expiresAt > Date.now() + REFRESH_MARGIN_MS) return current.access;
  if (refreshPromise) return refreshPromise;
  const revision = sessionRevision;
  refreshPromise = (async () => {
    try {
      const data = await authRequest('token?grant_type=refresh_token', {
        body: { refresh_token: current.refresh },
      });
      const next = tokenBundle(data);
      if (revision !== sessionRevision) return null;
      save('sessionStorage', 'session', next);
      return next.access;
    } catch (error) {
      // A network interruption can be retried. Revoked refresh credentials require a new login.
      if ([400, 401, 403].includes(error.status) && error.code !== 'request_timeout') {
        if (revision === sessionRevision) forget('sessionStorage', 'session');
        return null;
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function getUserId() {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  try {
    const access = await getAccessToken();
    if (access) await authRequest('logout?scope=local', { token: access });
  } finally {
    sessionRevision += 1;
    forget('sessionStorage', 'session');
    forget('sessionStorage', 'recovery');
  }
}

function cleanResidence(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(value) && Object.hasOwn(RESIDENCES, value)
    ? value
    : '';
}

export function safeReturnPath(candidate, residence) {
  const fallback = new URL('/students/', location.origin);
  let url = fallback;
  if (
    typeof candidate === 'string' &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !/[\\\x00-\x1f\x7f]/.test(candidate)
  ) {
    try {
      const target = new URL(candidate, location.origin);
      target.pathname = target.pathname.replace(/\/index\.html$/i, '/');
      if (target.origin === location.origin && PORTAL_PATH.test(target.pathname)) url = target;
    } catch {
      /* Fall back to the student workspace. */
    }
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  for (const name of [
    'token',
    'access_token',
    'refresh_token',
    'auth_code',
    'code',
    'password',
    'returnTo',
  ]) {
    url.searchParams.delete(name);
  }
  if (/(?:access_token|refresh_token|password)=/i.test(url.hash)) url.hash = '';
  const selected = cleanResidence(residence) || cleanResidence(url.searchParams.get('residence'));
  if (selected) url.searchParams.set('residence', selected);
  else url.searchParams.delete('residence');
  return url.pathname + url.search + url.hash;
}

export function signInHref(returnPath = location.pathname + location.search + location.hash, residence) {
  const target = safeReturnPath(returnPath, residence);
  const next = new URL('/signin/', location.origin);
  next.searchParams.set('returnTo', target);
  const selected =
    cleanResidence(residence) || new URL(target, location.origin).searchParams.get('residence');
  if (selected) next.searchParams.set('residence', selected);
  return next.pathname + next.search;
}

export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { body: { email: email.trim(), password } });
  const session = tokenBundle(data);
  sessionRevision += 1;
  save('sessionStorage', 'session', session);
  forget('sessionStorage', 'recovery');
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function startEmailFlow(purpose, email, password, returnPath) {
  if (!authConfigured()) throw new Error('Online account access is awaiting setup for this deployment.');
  if (!crypto.subtle) throw new Error('Open the secure HTTPS site to use account confirmation.');
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const redirect = location.origin + (purpose === 'signup' ? '/verify/' : '/reset-password/');
  const body = {
    email: email.trim(),
    code_challenge: base64url(new Uint8Array(digest)),
    code_challenge_method: 's256',
  };
  if (purpose === 'signup') body.password = password;
  const previous = pendingFlow(purpose);
  const flow = { verifier, returnPath: safeReturnPath(returnPath), expiresAt: Date.now() + FLOW_LIFETIME_MS };
  // Email apps typically open a new tab; only the one-time verifier and return path span tabs.
  save('localStorage', purpose, flow);
  try {
    const requestPath = purpose === 'signup' ? 'signup' : 'recover';
    const data = await authRequest(requestPath + '?redirect_to=' + encodeURIComponent(redirect), { body });
    if (data.access_token) {
      // The pilot requires confirmed email. Discard an unexpected auto-confirm session.
      await authRequest('logout?scope=local', { token: data.access_token }).catch(() => {});
      throw new Error('Email confirmation must be enabled for this deployment. Contact your residence team.');
    }
  } catch (error) {
    if (error.status && read('localStorage', purpose)?.verifier === verifier) {
      if (previous) save('localStorage', purpose, previous);
      else forget('localStorage', purpose);
    }
    throw error;
  }
}

export function registerAccount(email, password, returnPath) {
  return startEmailFlow('signup', email, password, returnPath);
}

export function requestRecovery(email, returnPath) {
  return startEmailFlow('recovery', email, undefined, returnPath);
}

function pendingFlow(purpose) {
  const data = read('localStorage', purpose);
  if (!data) return null;
  if (
    data.expiresAt <= Date.now() ||
    !Number.isFinite(data.expiresAt) ||
    !/^[A-Za-z0-9_-]{43}$/.test(data.verifier)
  ) {
    forget('localStorage', purpose);
    return null;
  }
  return data;
}

export async function exchangeEmailCode(purpose, code) {
  if (!['signup', 'recovery'].includes(purpose)) throw new Error('Unknown account request.');
  const flow = pendingFlow(purpose);
  if (!flow)
    throw new Error(
      'Open the latest email in the browser where you requested it, or start a new request here.',
    );
  if (!code || code.length > 1024) throw new Error('This email link is incomplete. Request a new link.');
  const data = await authRequest('token?grant_type=pkce', {
    body: { auth_code: code, code_verifier: flow.verifier },
  });
  const session = tokenBundle(data);
  const returnPath = safeReturnPath(flow.returnPath);
  if (purpose === 'signup') {
    sessionRevision += 1;
    save('sessionStorage', 'session', session);
  } else {
    // The password-change form can use this token, but operational pages cannot.
    save('sessionStorage', 'recovery', { access: session.access, expiresAt: session.expiresAt, returnPath });
  }
  if (read('localStorage', purpose)?.verifier === flow.verifier) forget('localStorage', purpose);
  return returnPath;
}

export function pendingRecovery() {
  const data = read('sessionStorage', 'recovery');
  if (typeof data?.access === 'string' && Number.isFinite(data.expiresAt) && data.expiresAt > Date.now())
    return data;
  forget('sessionStorage', 'recovery');
  return null;
}

export async function updateRecoveredPassword(password) {
  const recovery = pendingRecovery();
  if (!recovery) throw new Error('Your recovery session has expired. Request a fresh link.');
  await authRequest('user', { method: 'PUT', body: { password }, token: recovery.access });
  // Password change has been confirmed. Local tokens must be cleared even if revoke is unavailable.
  forget('sessionStorage', 'recovery');
  forget('sessionStorage', 'session');
  sessionRevision += 1;
  await authRequest('logout?scope=local', { token: recovery.access }).catch(() => {});
  return safeReturnPath(recovery.returnPath);
}
