# Add a residence

1. Agree the residence slug, authorised role roster, enabled services, contacts and identity of the operator responsible for the data. Confirm any application URLs from the operator.
2. Add branding and supported roles in `assets/config.js`. Use self-hosted assets. Set `demoOnly: true` for a sales demonstration without a commissioned operational deployment. The public roles list organises navigation; backend memberships enforce access.
3. If you need branded demonstrations, run the private `tools/add-demo-routes.py` against a staging frontend after adding its config. It creates only the new residence's directory wrappers and copies no JavaScript, CSS or other residence records. Verify all selected role links. For an operational deployment, the existing `/{role}/?residence=slug` pages resolve the same shared code.
4. In the private backend, provision the residence and authorised users/roles. Map existing student numbers to provider UUIDs, rooms to bed-level IDs, approvals, documents and finance values in an isolated staging copy. Reconcile source and destination counts by residence and status.
5. Test student ownership, role scope and denial across at least two residences. Only then connect its live workflows. Add a residence-specific questionnaire only when an approved form and backend exist.
