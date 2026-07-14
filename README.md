# Freshman Academy — Website Feedback

A single small web service. The team submits ideas/feedback on one page; an admin
sees them all on a shared dashboard and exports everything as one PDF for the designer.

- **`/`** — submit form + team dashboard (your editorial design).
- **`/api/entries`** — JSON feed the dashboard reads.
- **`/api/submit`** — saves a submission.
- **`/export.pdf`** — one PDF, grouped by page, high-priority first.

Submissions are stored in an append-only file (`feedback.jsonl`) on a Render
**persistent disk**, so they survive restarts and deploys. No database, no Google, no external services.

---

## Run locally
```bash
npm install
DATA_DIR=./data PORT=3999 npm start
```
Open **http://localhost:3999** — submit a few entries, switch to **Team dashboard**,
try **Copy summary** and **Download PDF**. Data is written to `./data/feedback.jsonl`.

---

## Deploy to Render (~5 min)
1. Put this folder in a GitHub repo and push.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml` and creates
   the web service **with a 1 GB disk mounted at `/var/data`** automatically.
   > Persistent disks require a paid instance (**Starter, ~$7/mo**). The free tier has no
   > disk, so submissions would be wiped on every redeploy.
3. Deploy → you get a URL like `https://freshman-feedback.onrender.com`.
4. **Share that URL with the team.** Anyone can submit and view the dashboard;
   click **Download PDF** whenever you want to hand the designer everything so far.

Optional: point a subdomain at it (e.g. `feedback.freshman.academy`) via Render → **Settings → Custom Domains**.

---

## Config (env vars)
| Var | Purpose | Default |
|-----|---------|---------|
| `DATA_DIR` | where the data file lives | `/var/data` on Render, `./data` locally |
| `ORG_NAME` | shown on the page + PDF | `Freshman Academy` |
| `PORT` | set automatically by Render | `3000` |

## Notes & options
- **Everything is currently public** to anyone with the link — fine for an internal
  tool. If you want the dashboard/PDF behind a password, say so and I'll add a simple
  admin login (it's ~15 lines).
- **Add/remove a form field:** edit `public/index.html` (the form + `submitFeedback()` +
  dashboard render), then mirror it in `server.js` (`/api/submit` and the PDF section).
- **Colors/branding:** the `:root { … }` block at the top of `public/index.html`.

## Files
```
public/index.html   the feedback app (form + dashboard)
server.js           backend: serves the app, API, PDF export, disk storage
package.json        deps: express + pdfkit
render.yaml         Render Blueprint (service + persistent disk)
```
