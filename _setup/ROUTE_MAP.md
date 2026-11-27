# Route map

Use the canonical directory URLs below for new links. Open the role demo under `/{residence}/demo/` to use synthetic records. Existing residence sign-in bookmarks open the operational entry point. The account and its assigned residence determine data access.

| Supplied route | Canonical route |
| --- | --- |
| `/admin/access/` | `/management/visitors/` |
| `/admin/communication/` | `/management/communication/` |
| `/admin/driver/` | `/management/transport/` |
| `/admin/finance/` | `/management/finances/` |
| `/admin/` | `/management/` |
| `/admin/inspections/` | `/management/inspections/` |
| `/admin/maintenance/` | `/management/maintenance/` |
| `/admin/occupancy/` | `/management/occupancy/` |
| `/admin/security/` | `/management/security/` |
| `/admin/vetting/` | `/management/applications/` |
| `/adowa/admin/access/` | `/management/visitors/?residence=adowa` |
| `/adowa/admin/` | `/management/?residence=adowa` |
| `/adowa/maintenance/` | `/maintenance/?residence=adowa` |
| `/adowa/portal/` | `/students/?residence=adowa` |
| `/adowa/security/` | `/security/?residence=adowa` |
| `/adowa/signin/` | `/signin/?residence=adowa` |
| `/adowa/signup/` | `/signup/?residence=adowa` |
| `/adowa/transport/` | `/transport/?residence=adowa` |
| `/adowa/verify/` | `/verify/?residence=adowa` |
| `/cjstudents/access/` | `/management/visitors/?residence=cjstudents` |
| `/cjstudents/admin/access/` | `/management/visitors/?residence=cjstudents` |
| `/cjstudents/admin/communication/` | `/management/communication/?residence=cjstudents` |
| `/cjstudents/admin/driver/` | `/management/transport/?residence=cjstudents` |
| `/cjstudents/admin/finance/` | `/management/finances/?residence=cjstudents` |
| `/cjstudents/admin/housekeeping/` | `/management/housekeeping/?residence=cjstudents` |
| `/cjstudents/admin/` | `/management/?residence=cjstudents` |
| `/cjstudents/admin/inspections/` | `/management/inspections/?residence=cjstudents` |
| `/cjstudents/admin/maintenance/` | `/management/maintenance/?residence=cjstudents` |
| `/cjstudents/admin/occupancy/` | `/management/occupancy/?residence=cjstudents` |
| `/cjstudents/admin/security/` | `/management/security/?residence=cjstudents` |
| `/cjstudents/admin/vetting/` | `/management/applications/?residence=cjstudents` |
| `/cjstudents/housekeeping/` | `/housekeeping/?residence=cjstudents` |
| `/cjstudents/` | `/cjstudents/` |
| `/cjstudents/portal/` | `/students/?residence=cjstudents` |
| `/cjstudents/signin/` | `/signin/?residence=cjstudents` |
| `/cjstudents/signup/` | `/signup/?residence=cjstudents` |
| `/cjstudents/verify/` | `/verify/?residence=cjstudents` |
| `/ekaya/admin/` | `/ekaya/admin/` |
| `/ekaya/` | `/ekaya/` |
| `/ekaya/students/` | `/ekaya/students/` |
| `/` | `/` |
| `/maintenance/` | `/maintenance/` |
| `/phumelela/admin/` | `/phumelela/admin/` |
| `/phumelela/` | `/phumelela/` |
| `/phumelela/students/` | `/phumelela/students/` |
| `/security/` | `/security/` |

The source included an extensionless file at `/adowa/admin/access`. Its directory replacement supports both the historical bookmark and `/adowa/admin/access/`. The original root maintenance and security addresses now serve the shared role pages directly.

The previous management shell used `?tab=` for navigation. The recognised names and their new section paths follow.

| Old tab | Management section |
| --- | --- |
| `vetting` | `/management/applications/` |
| `occupancy` | `/management/occupancy/` |
| `finance` | `/management/finances/` |
| `inspections` | `/management/inspections/` |
| `maintenance` | `/management/maintenance/` |
| `security` | `/management/security/` |
| `access` | `/management/visitors/` |
| `driver` | `/management/transport/` |
| `communication` | `/management/communication/` |
| `housekeeping` | `/management/housekeeping/` |

Public site demo links now use `/{residence}/demo/{role}/`. The Phumelela and eKaya questionnaire and management addresses above retain their existing meanings. The introductory CJ Students route continues to open the public residence page. See `PROTECTED-AND-HOME.md` for the homepage and bookmark regression results.
