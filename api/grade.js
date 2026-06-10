// Gated server-side grading. Answers live only here.
//   POST { token, id, cw:[[letter|"" ...]], uoe:["answer", ...] }
//   -> { ok, cwPct, uoePct, overall, passed, review:{ cw:[...], uoe:[...] } }
const { verify } = require("./_lib/auth");
const DATA = require("./_lib/exams.json");
const notion = require("./_lib/notion");

function norm(s) {
  return (s || "").toString().trim().toLowerCase().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  var sess = verify(body.token);
  if (!sess) { res.status(401).json({ ok: false, reason: "unauthorized" }); return; }

  var exam = DATA.exams.find(function (e) { return String(e.id) === String(body.id); });
  if (!exam) { res.status(404).json({ ok: false, reason: "noexam" }); return; }

  // ---- crossword (per word) ----
  var cw = exam.crossword;
  var grid = Array.isArray(body.cw) ? body.cw : [];
  function letterAt(r, c) {
    var row = grid[r] || [];
    return (row[c] || "").toString().toUpperCase().replace(/[^A-Z]/g, "");
  }
  var cwTotal = 0, cwCorrect = 0, cwReview = [];
  ["across", "down"].forEach(function (dir) {
    (cw[dir] || []).forEach(function (e) {
      cwTotal++;
      var dr = dir === "across" ? 0 : 1, dc = dir === "across" ? 1 : 0, got = "";
      for (var i = 0; i < e.len; i++) got += letterAt(e.row + dr * i, e.col + dc * i);
      var ok = got === e.answer.toUpperCase();
      if (ok) cwCorrect++;
      cwReview.push({ num: e.num, dir: dir, clue: e.clue, answer: e.answer, got: got, ok: ok });
    });
  });
  var cwPct = cwTotal ? Math.round(cwCorrect / cwTotal * 100) : 0;

  // ---- use of english ----
  var ua = Array.isArray(body.uoe) ? body.uoe : [];
  var uTotal = exam.uoe.length, uCorrect = 0, uReview = [];
  exam.uoe.forEach(function (item, i) {
    var got = (ua[i] || "").toString();
    var val = norm(got);
    var accept = item.answers.map(norm);
    var ok = val !== "" && accept.indexOf(val) !== -1;
    if (ok) uCorrect++;
    uReview.push({ q: item.q, answer: item.answers[0], got: got, ok: ok });
  });
  var uPct = uTotal ? Math.round(uCorrect / uTotal * 100) : 0;

  var overall = Math.round((cwPct + uPct) / 2);
  var passed = overall >= (DATA.config.passPct || 75);

  // record the attempt in Notion (don't fail grading if it errors)
  if (notion.hasToken()) {
    try {
      await notion.createResult({ name: sess.n, exam: exam.id, crossword: cwPct, uoe: uPct, overall: overall, passed: passed });
    } catch (e) { console.error("result write failed", e && e.message); }
  }

  res.status(200).json({
    ok: true, cwPct: cwPct, uoePct: uPct, overall: overall, passed: passed,
    review: { cw: cwReview, uoe: uReview },
  });
};
