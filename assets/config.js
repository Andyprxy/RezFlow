/** Public settings for the new operational workspaces. Production questionnaires keep their own configs. */
export const CONFIG = Object.freeze({
  environment: 'production', // 'production' or 'test'. Demos are selected only via /{residence}/demo/.
  backend: {
    baseUrl: 'https://engine.automania.cloud',
    prefixes: { production: '/webhook/', test: '/webhook-test/' },
    timeoutMs: 15000,
    enabled: false, // Enable after importing and testing the isolated operations workflow.
  },
  endpoints: {
    records: { path: 'rezflow-v2-records', method: 'GET' },
    changeRecord: { path: 'rezflow-v2-records', method: 'POST' },
  },
  auth: { url: '', publishableKey: '' },
  vault: { enabled: false, bucket: 'rezflow-private-v2', maxBytes: 65 * 1024 },
  timeZone: 'Africa/Johannesburg',
});

// Public branding only. All access decisions are made by the backend.
const allRoles = ['students', 'management', 'maintenance', 'security', 'transport', 'housekeeping'];
export const RESIDENCES = Object.freeze({
  phumelela: { name: 'Phumelela Residence', short: 'Phumelela', mark: 'PH', accent: '#235b49', soft: '#e5f1e9', logo: '/phumelela/assets/phumelela-wordmark.webp', roles: allRoles, questionnaire: '/phumelela/students/', application: 'https://profprod.nsfas.org.za/accommodation/display/c955dde3-cf47-4717-a89d-3b566df90c7f' },
  ekaya: { name: 'eKaya Student Accommodation', short: 'eKaya', mark: 'eK', accent: '#205176', soft: '#e4f2f6', logo: '/ekaya/assets/ekaya-wordmark.webp', roles: allRoles, questionnaire: '/ekaya/students/', application: 'https://profprod.nsfas.org.za/accommodation/display/b912172d-b0c8-4679-8db5-1693a56fafe4' },
  adowa: { name: 'Adowa Living', short: 'Adowa', mark: 'AD', accent: '#6d3c66', soft: '#f5eaf1', logo: '/home-assets/adowa.webp', roles: allRoles },
  cjstudents: { name: 'CJ Students', short: 'CJ Students', mark: 'CJ', accent: '#294f88', soft: '#e8effb', logo: '/cjstudents/cj.jpg', roles: allRoles },
  tkc: { name: 'TKC Properties', short: 'TKC', mark: 'TK', accent: '#6c4e24', soft: '#f6eddb', logo: '/home-assets/tkc.webp', roles: allRoles, demoOnly: true },
});
