export class RequestError extends Error {
  constructor(status, code, applicationResidence) {
    super('The request could not be confirmed.');
    this.status = status;
    this.code = code;
    this.applicationResidence = applicationResidence;
  }
}
export async function fetchJSON(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {...options, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal});
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new RequestError(response.status, body?.code, body?.applicationResidence);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
