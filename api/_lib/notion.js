// Shared Notion helpers for the Results table (score history) + db ids.
const VERSION = "2022-06-28";
const USERS_DB_ID = process.env.NOTION_DB_ID || "37b5bc947e198011a3c5e3553b795f52";
const RESULTS_DB_ID = process.env.NOTION_RESULTS_DB_ID || "2d4ade52d75d448cb242a52772e952c0";

function hasToken() { return !!process.env.NOTION_TOKEN; }
function headers() {
  return { "Authorization": "Bearer " + process.env.NOTION_TOKEN, "Notion-Version": VERSION, "Content-Type": "application/json" };
}

// row: { name, exam, crossword, uoe, overall, passed }
async function createResult(row) {
  var props = {
    "Name": { title: [{ type: "text", text: { content: String(row.name || "") } }] },
    "Exam": { number: row.exam },
    "Crossword": { number: row.crossword },
    "Use of English": { number: row.uoe },
    "Overall": { number: row.overall },
    "Result": { select: { name: row.passed ? "Pass" : "Fail" } },
  };
  if (row.category) props["Category"] = { select: { name: row.category } };
  var r = await fetch("https://api.notion.com/v1/pages", {
    method: "POST", headers: headers(),
    body: JSON.stringify({ parent: { database_id: RESULTS_DB_ID }, properties: props }),
  });
  if (!r.ok) throw new Error("createResult " + r.status + " " + await r.text().catch(function () { return ""; }));
  return true;
}

async function queryResults(name) {
  var r = await fetch("https://api.notion.com/v1/databases/" + RESULTS_DB_ID + "/query", {
    method: "POST", headers: headers(),
    body: JSON.stringify({ filter: { property: "Name", title: { equals: name } }, sorts: [{ property: "Date", direction: "descending" }], page_size: 100 }),
  });
  if (!r.ok) throw new Error("queryResults " + r.status);
  var data = await r.json();
  return (data.results || []).map(function (p) {
    var pr = p.properties || {};
    function num(x) { return pr[x] && typeof pr[x].number === "number" ? pr[x].number : null; }
    return {
      exam: num("Exam"), crossword: num("Crossword"), uoe: num("Use of English"), overall: num("Overall"),
      result: (pr.Result && pr.Result.select && pr.Result.select.name) || null,
      date: (pr.Date && pr.Date.created_time) || null,
    };
  });
}

module.exports = { USERS_DB_ID, RESULTS_DB_ID, hasToken, headers, createResult, queryResults };
