# yukti.com

Marketing site for Yukti, served by GitHub Pages from `main` at
<https://udit2405.github.io/yukti.com/>.

- `index.html` — the whole site (single file, inline CSS/JS, hash router)
- `assets/` — background video loops and their poster frames
- `lead-capture.gs` — Google Apps Script that writes form submissions
  into the Yukti Leads spreadsheet

## Lead capture

Three forms send data to a Google Sheet: the free-audit request
(`#audit`), the strategy-call booking (`#book`), and the newsletter
signup (`#resources`). Each writes to its own tab — Audit Requests,
Call Bookings, Newsletter — created automatically on first submission,
along with a "Came from" column recording `utm_source` or the referring
site.

Connecting it is a one-time setup that has to happen inside the Google
account that owns the sheet:

1. Open the spreadsheet → **Extensions → Apps Script**.
2. Replace the placeholder code with `lead-capture.gs` and save.
3. **Deploy → New deployment → Web app**, with
   *Execute as* **Me** and *Who has access* **Anyone**.
4. Authorize when prompted (**Advanced → Go to project → Allow**).
   The "unverified app" warning is expected for your own script.
5. Copy the **Web app URL** (ends in `/exec`) and paste it into
   `CONFIG.SHEET_WEBHOOK_URL` near the top of the `<script>` block in
   `index.html`, then commit.

Opening the `/exec` URL in a browser prints "Yukti lead capture is
live." — check that before wiring it into the site. Running the
`testWrite` function from the Apps Script editor creates the tabs and
writes one dummy row.

Until a real URL is pasted in, forms still confirm to the visitor but
nothing is transmitted anywhere.

**Re-deploying:** after editing the script, use *Deploy → Manage
deployments → edit → Version: New version*. Creating a brand-new
deployment issues a different `/exec` URL, which would need updating in
`index.html` too.
