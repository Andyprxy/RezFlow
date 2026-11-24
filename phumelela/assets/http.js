export class RequestError extends Error {
  constructor(status) {
    super('The request could not be confirmed.');
    this.status = status;
  }
}
export async function fetchJSON(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {...options, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal});
    if (!response.ok) throw new RequestError(response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
