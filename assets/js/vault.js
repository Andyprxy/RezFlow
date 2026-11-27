import { CONFIG } from '../config.js';
import { getAccessToken, getUserId } from '../auth.js';
import { ApiError, transfer } from '../api.js';
import { download } from './dom.js';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function objectUrl(residence, owner, reference, read = false) {
  if (
    !CONFIG.vault.enabled ||
    !uuid.test(owner || '') ||
    !uuid.test(reference || '') ||
    !/^[a-z0-9-]+$/.test(residence)
  )
    throw new Error('Private file access is unavailable for this document.');
  const path = [CONFIG.vault.bucket, residence, owner, reference, 'content']
    .map(encodeURIComponent)
    .join('/');
  return new URL('/storage/v1/object/' + (read ? 'authenticated/' : '') + path, CONFIG.auth.url);
}
async function headers() {
  const token = await getAccessToken();
  if (!token) throw new ApiError('Sign in to access private files.', 'AUTH', 401);
  return { Authorization: `Bearer ${token}`, apikey: CONFIG.auth.publishableKey };
}
async function identify(file) {
  if (!file || !file.size || file.size > CONFIG.vault.maxBytes)
    throw new Error('Choose a PDF, PNG or JPEG that is 65 KiB or smaller.');
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if ([37, 80, 68, 70, 45].every((x, i) => b[i] === x)) return ['application/pdf', 'pdf'];
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => b[i] === x)) return ['image/png', 'png'];
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return ['image/jpeg', 'jpg'];
  throw new Error('The file content must be PDF, PNG or JPEG.');
}
export async function uploadDocument(ctx, reference, file) {
  const [type] = await identify(file),
    owner = await getUserId(),
    authHeaders = await headers();
  try {
    await transfer(
      objectUrl(ctx.residence, owner, reference),
      { method: 'POST', headers: { ...authHeaders, 'Content-Type': type, 'x-upsert': 'false' }, body: file },
      { format: 'none' },
    );
  } catch (e) {
    if (!['NETWORK', 'HTTP_400', 'HTTP_409'].includes(e.code)) throw e;
    // A previous upload may have committed before the network reply was lost. Only reuse identical bytes.
    const saved = await transfer(
      objectUrl(ctx.residence, owner, reference, true),
      { headers: authHeaders },
      { format: 'blob' },
    );
    const [a, b] = await Promise.all([file.arrayBuffer(), saved.arrayBuffer()]);
    const previous = new Uint8Array(b);
    if (a.byteLength !== b.byteLength || !new Uint8Array(a).every((v, i) => v === previous[i]))
      throw new Error('The existing upload differs. Reopen the form to choose a new file.');
  }
}
export async function downloadDocument(ctx, row) {
  if (ctx.demo) {
    const sample = await transfer('/assets/samples/resident-document.pdf', {}, { format: 'blob' });
    download(sample, 'RezFlow-sample-document.pdf');
    return;
  }
  const file = await transfer(
    objectUrl(ctx.residence, row.owner, row.fields.reference, true),
    { headers: await headers() },
    { format: 'blob' },
  );
  const [, extension] = await identify(file);
  download(file, `RezFlow-${row.id.slice(0, 8)}.${extension}`);
}
