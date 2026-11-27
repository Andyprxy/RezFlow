# Deployment and rollback

## Stage the frontend

1. In the existing RezFlow repository, note the currently deployed commit and Pages publishing folder. Create a staging branch from it and take a private backup of its files. Preserve repository settings, Git history, DNS and unrelated files.
2. Extract the **contents** of the frontend ZIP into that publishing folder. If Pages publishes from the branch root, this is the folder containing the existing `CNAME` and `index.html`. If Pages publishes `/docs`, extract there instead. A new outer `RezFlow-2.0/` directory would change every public URL.
3. The old snapshot contains a plain file `adowa/admin/access`. The release uses `adowa/admin/access/index.html`. In the staging copy, retain the old file in your private backup, then replace that single file with the new directory. Keep a diff of affected paths. Extracting a ZIP over an existing folder can leave obsolete files in place.
4. Remove old backend material from the **staged public tree**, including `phumelela/_setup/` and any matching `ekaya/_setup/` that holds workflow exports, sheet examples or raw data. The frontend ZIP excludes those folders. Review other historical public assets individually. The new root `_setup/` contains public-safe guides. `.nojekyll` makes these static paths servable.
5. Confirm the two residence configs still point to the four approved engine endpoints. Test `/phumelela/`, `/phumelela/students/`, `/phumelela/admin/`, `/ekaya/`, `/ekaya/students/` and `/ekaya/admin/` from the **domain root**. A normal GitHub project preview mounted beneath `/repository/` needs a domain-root preview or local HTTP server for the new portal's absolute routes.
6. In a test copy of the protected service, capture two fictional students on the same browser, retry an interrupted write, and reconcile both admin totals against the response log. The frontend includes the newer staff capture patch. A live backend that still enforces one response per device must be updated before this change can operate end to end. The private package includes a compatible four-route template.

## Select the rollout scope

To publish only the demos first, stage the homepage, `home-assets/`, reviewed replacement videos, shared `assets/`, `/demo/`, the five residence `demo/` subtrees and image/font assets those pages use. Keep all currently used operational URLs on their working implementations. Separately stage protected-questionnaire fixes only when the production backend matches. Confirm the raw private setup files are excluded before enabling `.nojekyll`.

For the full operational pilot, complete the private package's `README.md` and `docs/WORKFLOW_MIGRATION.md`. Configure the public Auth URL and publishable key; test the gateway, private data migration and at least two roles/residences first. Set `backend.enabled` only after the role tests pass. A `test` environment uses `/webhook-test/` and needs a listening n8n test webhook. Production uses a published workflow and `/webhook/`. Keep the private ZIP off GitHub Pages. Switch historical role aliases only for residences whose old business processes have been reconciled. The legacy feature inventory lists the integrations that still need work.

Check public demo links, role changes, mobile tables, retry behaviour and the enquiry mail draft on the staging origin. Do not use real addresses for notification tests. Deploy by merging the reviewed staging changes through your ordinary Pages workflow.

## Roll back

For a frontend rollback, redeploy the recorded Pages commit. Restore the prior questionnaire assets together with their matching backend version. For the new pilot, first stop new writes by disabling its feature setting and then unpublish the versioned gateway. Preserve its new database, documents, receipts and activity history for reconciliation. Point verified roles to their previous routes and workflows. Never drop a used database or overwrite a live spreadsheet to roll back a static release.
