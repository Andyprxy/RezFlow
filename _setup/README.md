# RezFlow 2.0

Extract `RezFlow-2.0-GitHub-Ready.zip` at the **root of a staging copy of the RezFlow GitHub Pages publishing directory**. `CNAME`, `index.html`, `assets/`, `phumelela/` and `ekaya/` belong side by side. There is no build command. Use a local HTTP server or a staging Pages origin for testing.

| Start here | Address from the site root |
| --- | --- |
| Public website | `/` |
| Phumelela operating questionnaire and management | `/phumelela/`, `/phumelela/students/`, `/phumelela/admin/` |
| eKaya operating questionnaire and management | `/ekaya/`, `/ekaya/students/`, `/ekaya/admin/` |
| Sample workspaces for a presentation | `/phumelela/demo/` or `/ekaya/demo/` |
| Other synthetic residence environments | `/demo/` |
| Role selection for a configured residence | `/workspace/` |

For a walkthrough, open the Phumelela student demo, report a repair and open the maintenance role in the **same browser**. Acknowledge the repair and add an update. Return to the student request to see the new status and activity. Changing residence opens a different set of demo records.

Read `DEPLOYMENT.md` before copying files into an existing site. The configuration intentionally starts the new operational integration disabled. The four established questionnaire webhooks have their own live settings. Backend workflows, SQL, test fixtures and private migration documentation belong outside the Pages repository.
