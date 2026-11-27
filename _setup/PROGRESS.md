# Release checkpoints · 27 November 2026

| Checkpoint | Completed work |
| --- | --- |
| Baseline | Inspected the repository, 32 individual workflows and the 80-row CSV. Identified historical method/path collisions, data-source differences, sensitive fields, inactive branches and incorrect public demo links. |
| Shared architecture | Added central config/API/session helpers, shared styling, folder routes, compatibility aliases, role-specific navigation and independent demo data. |
| Operational modules | Implemented six role workspaces, record transitions and activity, filtering/export, room allocation and bed moves, stock adjustments, requests, notices, finance visibility and optional private vault. |
| Protected systems | Preserved the six public URLs, the four engine hooks and residence branding. Restored compatible eKaya reporting markup; included the later staff multi-capture patch and a matching staged backend. |
| Integration and QA | Prepared a private staging gateway, scoped Postgres schema, reference workflows and DULA reconciliation. Tested Chromium flows, concurrent SQL writes, tenant/owner restrictions, gateway handling and same-device intake. Exact test scopes appear in TEST_REPORT.md. |
| Delivery | Frontend and private backend packages are independent; neither has been published or activated. DEPLOYMENT.md describes additive demo-first rollout, full pilot setup and rollback. |

**Next deployment action.** Extract the frontend into a staging copy of the Pages publishing root. Connect a staging identity project, database and workflow credentials. Verify two synthetic students at two residences and replay/loss of acknowledgement before switching any live role route. The 2027 forms need a backend that accepts separate submission IDs from one device. Reconcile existing rows before replacing an intake workflow. Confirm specialist provider integrations listed in FEATURE_INVENTORY.md before removing any currently used legacy route.
