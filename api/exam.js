// Gated exam delivery. Returns exam content WITHOUT answers, only to a valid session token.
//   POST { token, meta:true }      -> { ok, config, exams:[{id,theme}] }
//   POST { token, id }             -> { ok, config, exam:{ id, crossword(noLetters), uoe(noAnswers) } }
const { verify } = require("./_lib/auth");
const DATA = require("./_lib/exams.json");

function publicCrossword(cw) {
  return {
    theme: cw.theme, rows: cw.rows, cols: cw.cols,
    cells: cw.cells.map(function (row) {
      return row.map(function (c) { return c === null ? null : (c.num ? { num: c.num } : {}); });
    }),
    across: cw.across.map(function (e) { return { num: e.num, clue: e.clue, row: e.row, col: e.col, len: e.len }; }),
    down: cw.down.map(function (e) { return { num: e.num, clue: e.clue, row: e.row, col: e.col, len: e.len }; }),
  };
}
function publicUoe(uoe) {
  return uoe.map(function (it) { return { q: it.q, skill: it.skill }; });
}

module.exports = async (req, res) => {
  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  var token = body.token || (req.query && req.query.token);
  var sess = verify(token);
  if (!sess) { res.status(401).json({ ok: false, reason: "unauthorized" }); return; }

  var unlocked = sess.b || 1;

  if (body.meta || (req.query && req.query.meta)) {
    res.status(200).json({
      ok: true, config: DATA.config, unlockedBatch: unlocked,
      exams: DATA.exams
        .filter(function (e) { return (e.batch || 1) <= unlocked; })
        .map(function (e) { return { id: e.id, theme: e.crossword.theme, batch: e.batch || 1 }; }),
    });
    return;
  }

  var id = body.id != null ? body.id : (req.query && req.query.id);
  var exam = DATA.exams.find(function (e) { return String(e.id) === String(id); });
  if (!exam) { res.status(404).json({ ok: false, reason: "noexam" }); return; }
  if ((exam.batch || 1) > unlocked) { res.status(403).json({ ok: false, reason: "locked" }); return; }

  res.status(200).json({
    ok: true, config: DATA.config,
    exam: { id: exam.id, crossword: publicCrossword(exam.crossword), uoe: publicUoe(exam.uoe) },
  });
};
