# Public connection settings

The two protected portals retain their own copies of `assets/config.js` under each residence. Both supplied live configs specify `https://engine.automania.cloud`. Each residence has its own named POST/GET path. The two staff views report over one shared 2027 intake. Preserve their existing paths and header name.

| Function | Method and path | Request | Expected result |
| --- | --- | --- | --- |
| Phumelela / eKaya capture | POST `phumelela-2027-check-in` or `ekaya-2027-check-in` | JSON with submissionId, deviceId for compatibility, residence, intakeYear, firstName, lastName, email, phone, gender, room, returning, reservation, reason, reasonDetail | `ok:true` and the matching submissionId. Errors retain the form. `receivedAt` is assigned by n8n. |
| Phumelela / eKaya reporting | GET `phumelela-2027-responses` or `ekaya-2027-responses` | Current staff key entered at runtime in `X-Phumelela-Key` | Shared intake response list, normalised by the protected reporting adapter. Auth failure keeps the access gate closed. |
| New operational records | GET `rezflow-v2-records` | Residence, selected role, optional cursor and bounded page size; bearer token | `success:true`, `data.records`, `data.total` and `data.nextCursor`. |
| New operational change | POST `rezflow-v2-records` | Residence, role, action, stable submissionId, recordId for an existing record and whitelisted payload; bearer token | `success:true` and a saved record. Bed moves also return the changed destination. |

The new portals select `/webhook/` or `/webhook-test/` through the shared root `assets/config.js` environment. Auth settings are blank until a staging project is configured. Do not change either existing questionnaire config to the new pilot path. The detailed historical register and sensitive integration instructions are in the private package.
