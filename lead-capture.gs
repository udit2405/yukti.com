/* Yukti — lead capture backend.

   Writes every form submission from index.html into the "Yukti Leads"
   spreadsheet. Each submission POSTs a JSON body with a `type` field
   ("audit_request" | "booking" | "newsletter") and is appended to the
   matching tab; tabs and their header rows are created on first use.

   SETUP (about two minutes, must be done in your own Google account):
     1. Open the spreadsheet, then Extensions -> Apps Script.
     2. Replace the placeholder code with this file and save.
     3. Deploy -> New deployment -> type "Web app".
          Execute as:      Me
          Who has access:  Anyone
     4. Authorize when prompted (Advanced -> Go to project -> Allow).
     5. Copy the resulting Web app URL (it ends in /exec) and paste it
        into CONFIG.SHEET_WEBHOOK_URL at the top of the script block in
        index.html.

   Visiting the /exec URL in a browser should print "Yukti lead capture
   is live." — that confirms the deployment before you touch the site.
*/

/* Left blank on purpose. Created via Extensions -> Apps Script from
   inside the spreadsheet, this script is bound to it and finds it on
   its own — so the sheet's id never has to live in this public repo.
   Only fill this in if you deploy the script standalone instead. */
const SPREADSHEET_ID = '';

function getSpreadsheet() {
  const bound = SpreadsheetApp.getActiveSpreadsheet();
  if (bound) return bound;
  if (!SPREADSHEET_ID) {
    throw new Error('Script is not bound to a spreadsheet and SPREADSHEET_ID is empty.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

const SHEETS = {
  audit_request: {
    tab: 'Audit Requests',
    headers: ['Timestamp (IST)', 'Name', 'Email', 'WhatsApp', 'Company website', 'Audit requested', 'Their #1 goal this year', 'Came from', 'Page'],
    row: function (d) {
      return [d._ist, d.name, d.email, d.whatsapp, d.website, d.auditType, d.goal, d.source, d.page];
    }
  },
  booking: {
    tab: 'Call Bookings',
    headers: ['Timestamp (IST)', 'Name', 'Work email', 'Company', 'Wants to discuss', 'Preferred day & time', 'Came from', 'Page'],
    row: function (d) {
      return [d._ist, d.name, d.email, d.company, d.prepFor, d.preferredTime, d.source, d.page];
    }
  },
  newsletter: {
    tab: 'Newsletter',
    headers: ['Timestamp (IST)', 'Email', 'Came from', 'Page'],
    row: function (d) {
      return [d._ist, d.email, d.source, d.page];
    }
  }
};

function doPost(e) {
  try {
    if (!e || !e.postData) return reply('no payload');

    const data = JSON.parse(e.postData.contents);
    const config = SHEETS[data.type];
    if (!config) return reply('ignored: unknown type');

    // The site sends an ISO timestamp; show it in IST, which is what
    // anyone reading this sheet will actually be working in.
    data._ist = Utilities.formatDate(
      data.ts ? new Date(data.ts) : new Date(),
      'Asia/Kolkata',
      'yyyy-MM-dd HH:mm:ss'
    );

    const sheet = getTab(config);
    sheet.appendRow(config.row(data).map(function (v) {
      return v === undefined || v === null ? '' : v;
    }));

    return reply('ok');
  } catch (err) {
    return reply('error: ' + err.message);
  }
}

/* Health check. Open the /exec URL in a browser: it names the exact
   spreadsheet this script writes into and how many rows each tab holds,
   which is the quickest way to tell "nothing is being saved" apart from
   "it is saving somewhere you are not looking". */
function doGet() {
  try {
    const ss = getSpreadsheet();
    let out = 'Yukti lead capture is live.\n\n'
            + 'Writing into: ' + ss.getName() + '\n'
            + ss.getUrl() + '\n\nTabs:\n';
    Object.keys(SHEETS).forEach(function (k) {
      const name = SHEETS[k].tab;
      const sh = ss.getSheetByName(name);
      out += '  ' + name + ': '
           + (sh ? Math.max(0, sh.getLastRow() - 1) + ' row(s)' : 'not created yet')
           + '\n';
    });
    return reply(out);
  } catch (err) {
    return reply('Yukti lead capture is live, but cannot reach a spreadsheet: ' + err.message);
  }
}

function getTab(config) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(config.tab);
  if (!sheet) {
    sheet = ss.insertSheet(config.tab);
    sheet.appendRow(config.headers);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(msg) {
  return ContentService.createTextOutput(msg);
}

/* Run this once from the Apps Script editor to confirm the script can
   reach the spreadsheet and to create all three tabs up front. */
function testWrite() {
  doPost({ postData: { contents: JSON.stringify({
    type: 'audit_request', name: 'Test entry', email: 'test@example.com',
    whatsapp: '+91', website: 'https://example.com', auditType: 'Website Audit',
    goal: 'Delete this row', source: 'test', page: '#audit', ts: new Date().toISOString()
  }) } });
}
