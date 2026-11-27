# Application architecture

Each destination has an `index.html` in its own directory. The domain-root paths match `CNAME`. Normal links point to directories. A canonicalisation helper removes an explicit `index.html` while retaining the query and fragment. Legacy bookmarks use a common redirect script and retain tenant context. The public home and each protected residence retain separate styling and configuration.

| Source | Responsibility |
| --- | --- |
| `assets/config.js` | Public engine hostname, environment, versioned endpoint names, timeout, live switch, public Supabase settings, tenant branding and permitted public roles |
| `assets/api.js` | Named API calls, bearer forwarding, URL construction, JSON/multipart/binary transport, cancellation, timeouts, strict success envelopes and errors |
| `assets/auth.js`, `assets/js/account.js` | Sign-in, registration, email confirmation and recovery, token refresh, same-origin return destinations and sign-out |
| `assets/js/catalog.js` | Actual sections and actions organised by role, allowed form fields and the human-readable status transition labels |
| `assets/js/workspace.js`, `views.js` | Navigation, selected residence, loading, search, pagination, reports and same-scope dashboard counts |
| `assets/js/record-dialog.js`, `vault.js` | Record details, form validation, pending submission reference, confirmations, comments, private document uploads and downloads |
| `assets/js/demo.js` | Seeded fictional data, an IndexedDB transaction per operation, isolated residence keys and local idempotency receipts |
| `assets/css/portal.css`, `assets/icons.svg` | Self-hosted type, themed surfaces, cards, tables, focus states, mobile navigation, solid-surface and reduced-motion fallbacks |
| `phumelela/assets/`, `ekaya/assets/` | Existing questionnaire and management applications, current residence-specific service URLs, shared response contracts and branding |

The new role portals keep records in page memory. A default page loads up to 100 accessible records. The interface reports partial coverage and offers another page. The dashboard, register and report use the same loaded collection. Search and date/status filters update locally. Export includes all matching loaded rows, including rows on the next visible table page. Staff can switch residences; each request requires fresh server-side membership authorisation. Tabs refresh on return to the page while no form is open. Location is read only when a driver confirms a one-time share for an accepted trip.

The identity service supplies a user token. n8n accepts bounded requests and passes that token to a fixed database function. The function checks current membership, scopes the requested row and performs the write. Its transaction records the action and its receipt together. Bed moves update both slots in that transaction. The optional vault uses Supabase Storage with a private bucket and separate storage policies. There are no frontend build dependencies, analytics, third-party fonts or UI frameworks in the new workspaces.
