import { CONFIG } from './config.js';
import { getAccessToken } from './auth.js';

export class ApiError extends Error {
  constructor(message, code, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const messages = {
  400: 'Check the details and try again.',
  401: 'Your session has expired. Sign in to continue.',
  403: 'This account does not have access to this residence and role.',
  404: 'The requested record or workflow is unavailable.',
  409: 'This record changed. Refresh it before trying again.',
  413: 'This file is too large.',
  429: 'Too many requests. Wait a moment before trying again.',
};
export async function transfer(
  url,
  options = {},
  { format = 'json', timeout = CONFIG.backend.timeoutMs } = {},
) {
  const control = new AbortController();
  const abort = () => control.abort();
  const timer = setTimeout(abort, timeout);
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      signal: control.signal,
    });
    if (!response.ok)
      throw new ApiError(
        messages[response.status] || 'The service could not complete the request. Try again.',
        'HTTP_' + response.status,
        response.status,
      );
    if (format === 'blob') return response.blob();
    if (format === 'none') return;
    try {
      return await response.json();
    } catch {
      throw new ApiError(
        'The service returned an unreadable response. Refresh before retrying a change.',
        'CONTRACT',
      );
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    throw new ApiError(
      control.signal.aborted
        ? 'The request timed out. Retry with the same form to check the result.'
        : 'Connection interrupted. Reconnect and retry with the same form.',
      'NETWORK',
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export async function request(name, { query = {}, body, signal } = {}) {
  if (!CONFIG.backend.enabled)
    throw new ApiError('The operational integration has not been enabled for this site.', 'SETUP');
  const endpoint = CONFIG.endpoints[name];
  const prefix = CONFIG.backend.prefixes[CONFIG.environment];
  if (!endpoint || !prefix) throw new ApiError('The requested integration is not configured.', 'SETUP');
  const token = await getAccessToken();
  if (!token) throw new ApiError('Sign in to open your residence workspace.', 'AUTH', 401);
  const url = new URL(prefix + endpoint.path, CONFIG.backend.baseUrl);
  for (const [key, value] of Object.entries(query))
    if (value != null && value !== '') url.searchParams.set(key, value);
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const init = { method: endpoint.method, headers, signal };
  if (body instanceof FormData) init.body = body;
  else if (body != null) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const envelope = await transfer(url, init);
  if (envelope?.success !== true || !envelope.data || typeof envelope.data !== 'object') {
    const code = envelope?.error?.code || 'CONTRACT';
    throw new ApiError(
      typeof envelope?.error?.message === 'string' && envelope.error.message.length <= 220
        ? envelope.error.message
        : 'The server did not confirm this operation. Your form is still available.',
      code,
    );
  }
  return envelope.data;
}
export async function readRecords(ctx, cursor, signal) {
  const result = await request('records', {
    query: { residence: ctx.residence, portal: ctx.role, cursor, limit: 100 },
    signal,
  });
  if (
    !Array.isArray(result.records) ||
    !result.records.every((r) => typeof r?.id === 'string' && typeof r.kind === 'string') ||
    !Number.isInteger(result.total) ||
    result.total < result.records.length
  )
    throw new ApiError('The record list is incomplete. Please refresh.', 'CONTRACT');
  return result;
}
export async function writeRecord(ctx, change) {
  const result = await request('changeRecord', {
    body: { residence: ctx.residence, portal: ctx.role, ...change },
  });
  if (!result.record?.id || !result.record.kind)
    throw new ApiError('The server did not return the saved record. Retry with the same form.', 'CONTRACT');
  return {
    ...result.record,
    relatedRecords: Array.isArray(result.relatedRecords) ? result.relatedRecords : [],
  };
}
