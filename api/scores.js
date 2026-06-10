// Returns the logged-in user's own results from the Notion Results table.
//   POST { token } -> { ok, results:[{exam,crossword,uoe,overall,result,date}, ...] }
const { verify } = require("./_lib/auth");
const notion = require("./_lib/notion");

module.exports = async (req, res) => {
  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  var sess = verify(body.token);
  if (!sess) { res.status(401).json({ ok: false, reason: "unauthorized" }); return; }
  if (!notion.hasToken()) { res.status(200).json({ ok: true, results: [] }); return; }
  try {
    var results = await notion.queryResults(sess.n);
    res.status(200).json({ ok: true, results: results });
  } catch (e) {
    console.error("scores error", e && e.message);
    res.status(200).json({ ok: true, results: [], reason: "error" });
  }
};
