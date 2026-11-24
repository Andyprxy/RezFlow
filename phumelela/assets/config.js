// Both route pairs feed the same n8n workflow and the same response sheet.
export const config = Object.freeze({
  submitUrl: 'https://engine.automania.cloud/webhook-test/phumelela-2027-check-in',
  responsesUrl: 'https://n8n.automania.cloud/webhook/phumelela-2027-responses',
  hostResidence: 'phumelela',
  staffHeader: 'X-Phumelela-Key',
});
export const applicationUrls = Object.freeze({
  phumelela: 'https://profprod.nsfas.org.za/accommodation/display/c955dde3-cf47-4717-a89d-3b566df90c7f',
  ekaya: 'https://profprod.nsfas.org.za/accommodation/display/b912172d-b0c8-4679-8db5-1693a56fafe4',
});
