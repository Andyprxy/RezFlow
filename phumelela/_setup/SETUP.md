# Phumelela Residence · 2027 resident check-in

Copy the **phumelela** folder into the existing RezFlow GitHub Pages publishing directory. The site is plain HTML, CSS and JavaScript. The browser sends resident responses to n8n, n8n writes to a private Google Sheet, and the staff dashboard reads the sheet through a separate, authenticated endpoint.

## 1. Prepare the Google Sheet

Create a private spreadsheet, for example **Phumelela Resident Check-in**, and name the first tab **Responses_2027**. Select **File → Import → Upload** and choose **sheet-headers.csv** from this folder. Choose **Replace current sheet** on the new, empty tab. Verify the tab name afterwards. Row 1 should contain 14 headings, beginning with **submissionId** and ending with **reasonDetail**. Data starts on row 2. Keep the data range continuous.

Give the Google account or service account used by n8n editor access to this spreadsheet. Keep general access set to **Restricted**. Copy the spreadsheet ID from the document URL, between /d/ and /edit.

## 2. Import and connect the workflow

1. In n8n, open a new workflow and choose **⋯ → Import from File**. Select **phumelela-2027-workflow.json**. It contains the student and staff triggers on one canvas.
2. Open **Append response row** and **Read response rows**. In both nodes, select your Google Sheets credential and replace **REPLACE_WITH_SPREADSHEET_ID** with the ID from step 1. Keep the tab set to **Responses_2027**.
3. In **Append response row**, confirm the operation is **Append Row**, with **Map Each Column Manually**, **Use Append** enabled and **Cell Format → Let n8n format (RAW)**. All 14 fields have mappings. For example, **room** maps to **{{ $json.row.room }}**. If choosing a new document resets the mapping in your n8n version, refresh the fields and map each column to its identically named property under **$json.row**. This preserves room numbers such as 004, phone prefixes and free-text feedback.
4. In **Read response rows**, keep **Get Row(s)** with no filters. Its **Settings → Always Output Data** is enabled so an empty sheet still produces a valid dashboard response.
5. Open **Staff GET**. Keep **Authentication → Header Auth**. Create a Header Auth credential whose **Name** field is **X-Phumelela-Key** and whose **Value** is a long random staff key generated in your password manager. Attach the credential to this node. Give authorised staff the value through your usual private channel. Staff enter it on the admin page. Keep the key value in n8n and in authorised staff members’ password managers. The public frontend contains the header name.
6. In both Webhook nodes, keep **Respond → Using ‘Respond to Webhook’ Node** and **Allowed Origins (CORS) → https://rezflow.co.za**. Publish the workflow when the tests below pass. On older n8n versions the switch is called **Active**.

The workflow targets n8n 2.x with built-in Webhook v2, Code v2, If v2.2, Google Sheets v4.6 and Respond to Webhook v1.4. JavaScript execution must be available to the Code nodes. The export has no credential bindings or live spreadsheet ID. Its structure and Code node logic were checked in isolation. The import and Google Sheets calls still need to be exercised on your instance.

## 3. Confirm the two webhook routes

| Method | n8n Webhook path | Production URL |
| --- | --- | --- |
| POST | phumelela-2027-check-in | https://n8n.automania.cloud/webhook/phumelela-2027-check-in |
| GET | phumelela-2027-responses | https://n8n.automania.cloud/webhook/phumelela-2027-responses |

The browser configuration is **phumelela/assets/config.js**. Both production URLs and the supplied NSFAS application URL are already set there. Change the corresponding value if you rename a webhook.

**Student POST.** The Webhook node sends its JSON body to **Validate questionnaire**. The valid branch appends a row, then returns HTTP 200 with this JSON.

    {"ok":true,"submissionId":"bf904047-b9bf-4354-a9eb-31f1ce4ea69a"}

The page shows the personalised confirmation only when this ID matches the submitted questionnaire. Invalid input follows the HTTP 400 branch. A sheet failure follows the HTTP 503 branch. The form keeps the current answers available for a retry.

**Staff GET.** n8n checks the staff header before reading the sheet. **Prepare response log** selects this residence and intake, normalises the fields and orders distinct submissions newest first. An empty sheet produces HTTP 200 with this body.

    {"ok":true,"intakeYear":2027,"responses":[]}

A populated response contains the same fields as **example-response.json**, plus **receivedAt** in UTC. The dashboard displays dates and times in South African Standard Time. Both routes return no-store headers. The workflow is set to omit saved execution payloads, which can contain resident or staff information.

## 4. Test with an empty test sheet

Use a scratch copy of the sheet for these tests. In n8n, select the relevant trigger and **Listen for Test Event** before each test call. Test URLs use **/webhook-test/**. The production **/webhook/** URLs register when you publish.

For a browser test on Windows, serve the directory that contains the phumelela folder with **py -m http.server 8000**. Open **http://localhost:8000/phumelela/**. In this local test copy only, set both URLs in **assets/config.js** to the test URLs from n8n. Temporarily add **http://localhost:8000** to the two Webhook nodes’ allowed origins. Keep the production files pointing to **/webhook/**.

| Test | Expected result |
| --- | --- |
| Returning and already applied | Personalised thank-you. Returning and Applied each increase by one for a new email. |
| Returning and yet to apply | Personalised thank-you with **Apply on NSFAS**. Returning and Yet to apply each increase by one for a new email. |
| Not returning | A reason is required. **Other** also requires a short explanation. Staff see the reason and any additional comment in the response details. |
| Go back and change the return answer | Only the final branch is submitted. Leaving responses have reservation **not_applicable**. |
| Missing or incorrect staff key | The GET request is rejected. A correct key loads the test sheet. **Explore with sample data** opens a separate fictional dashboard. |
| Same request sent twice | The raw sheet can contain two receipt rows with the same ID. The response log counts that ID once. |
| Same email with a new questionnaire ID | Both submissions appear in the response log. Only the latest distinct questionnaire contributes to overview totals. |
| Sheet connection fails during a submission | The form shows a retry message and keeps the current answers. An unconfirmed write never displays a thank-you. |

For a direct POST smoke test, open PowerShell in this setup folder and run the following while the student trigger is listening.

    $testUrl = 'https://n8n.automania.cloud/webhook-test/phumelela-2027-check-in'
    $testBody = Get-Content .\example-response.json -Raw
    Invoke-RestMethod -Method Post -Uri $testUrl -ContentType 'application/json' -Body $testBody

Expect **ok = True** and the ID in the example. Listen again and repeat the same payload to check retry grouping. Listen again and replace **returning** with **maybe** in the test payload to check HTTP 400 and confirm the sheet row count stays the same. The sample includes fictional details.

## 5. Deploy to RezFlow

Switch the two Sheets nodes to the production sheet if you used a test copy, verify their mappings, and publish the workflow. Restore the production origin and URLs after local testing. Extract this ZIP and commit the single **phumelela/** folder alongside the existing RezFlow homepage in the Pages publishing source. If the repo publishes from docs/, copy the folder inside docs/. The directory index files handle the following routes.

| Cover page | Student questionnaire | Management dashboard |
| --- | --- | --- |
| /phumelela/ | /phumelela/students/ | /phumelela/admin/ |

Open the student and admin pages over HTTPS on the custom domain. The admin portal provides a **Refresh** button. The staff key and resident results are held in memory for the current page. The student tab stores only a digest and random retry reference for a pending submission.

## How the counts work

- **Returning** counts residents whose latest response says they plan to return. **Not returning** counts the other group. Each uses the latest questionnaire per lowercased, trimmed email in this intake.
- **Applied** and **Yet to apply** partition the returning group. These figures reflect the resident’s answer about submitting an application. A confirmed room booking is a separate status managed by NSFAS or residence staff.
- The response log keeps distinct questionnaires and labels earlier submissions for the same email. Staff can search by name, email, phone or room. Different email addresses produce different resident records, so use the current room and contact details to reconcile discrepancies against the residence register.
- The sheet is an append-only receipt log. If two deliveries with the same submission ID reach the sheet, the oldest accepted copy supplies that response. A late retry cannot supersede a newer questionnaire. Use the dashboard counts when checking totals.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| HTTP 404 on a production URL | Confirm the workflow is published on the correct n8n instance, the webhook path matches config.js and the request uses the correct HTTP method. |
| HTTP 200 but the student sees a retry message | Confirm the Webhook uses the Respond to Webhook node and the receipt includes a Boolean ok and the matching submissionId. A generic workflow-started response is insufficient. |
| Works in PowerShell but fails in a browser | Check the exact origin and the browser Network panel. A reverse proxy must pass OPTIONS through, or answer the preflight with the permitted origin and method. Allow Content-Type on POST and X-Phumelela-Key on GET. Keep the actual GET authenticated. Proxy responses and the GET feed should bypass shared caches. |
| HTTP 401 or 403 for staff | Verify the credential is attached to Staff GET, the header name matches config.js, and the entered value matches the credential. |
| HTTP 503 | Check the spreadsheet ID, tab name, sharing and node mappings. A malformed manually edited row can invalidate the feed. Verify the 14 headers, the timestamp and the allowed branch values. |
| Logs appear twice in the sheet | Compare submissionId. Equal IDs are retry receipts; the dashboard counts them once. Distinct IDs are separate questionnaires. |

## Official references

[n8n workflow import](https://docs.n8n.io/workflows/export-import/) · [Webhook URLs and authentication](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) · [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/) · [Google Sheets operations](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/sheet-operations/) · [Phumelela on NSFAS](https://profprod.nsfas.org.za/accommodation/display/c955dde3-cf47-4717-a89d-3b566df90c7f)
