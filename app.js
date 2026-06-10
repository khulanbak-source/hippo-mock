/* Hippo Mock Exam — Little Hippo · Continental Round
   Content + grading are server-gated: the client never receives answer keys.
   Flow: login (-> token) -> ready -> exam (timed) -> /api/grade -> result (75% gate) */
(function () {
  "use strict";

  var TIME_LIMIT = 2400;   // set from server config after login
  var PASS = 75;

  var state = {
    name: "", token: "", config: {}, exams: [],   // exams = [{id,theme}]
    exam: null,            // current public exam (no answers)
    timeLeft: TIME_LIMIT, timer: null, submitted: false,
    cellInputs: [], acrossAt: [], downAt: [], active: null, _review: null
  };

  function $(id) { return document.getElementById(id); }
  function show(screenId) {
    ["screen-login", "screen-ready", "screen-exam", "screen-result"].forEach(function (s) {
      $(s).classList.toggle("active", s === screenId);
    });
    window.scrollTo(0, 0);
  }
  function norm(s) {
    return (s || "").toString().trim().toLowerCase().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ");
  }
  function passedKey() { return "hippo_passed::" + norm(state.name); }
  function getPassed() { try { return JSON.parse(localStorage.getItem(passedKey()) || "[]"); } catch (e) { return []; } }
  function addPassed(id) { var p = getPassed(); if (p.indexOf(id) === -1) { p.push(id); localStorage.setItem(passedKey(), JSON.stringify(p)); } }
  function fmtTime(s) { var m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
  function deviceId() {
    var k = "hippo_device", v = localStorage.getItem(k);
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "d" + Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(k, v);
    }
    return v;
  }
  function api(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, reason: "parse" }; }); })
      .catch(function () { return { ok: false, reason: "network" }; });
  }
  function sessionEnded() {
    state.token = ""; state.submitted = false;
    if (state.timer) clearInterval(state.timer);
    $("in-code").value = "";
    var msg = $("login-msg"); msg.className = "form-msg err";
    msg.textContent = "Your session ended. Please log in again.";
    show("screen-login");
  }

  // =================================================================== LOGIN
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("in-name").value.trim(), code = $("in-code").value.trim(), msg = $("login-msg");
    if (!name || !code) { msg.className = "form-msg err"; msg.textContent = "Type your name and passcode."; return; }
    var btn = $("btn-login"); btn.disabled = true; btn.textContent = "Checking…";
    msg.className = "form-msg"; msg.textContent = "";

    api("/api/login", { name: name, code: code, device: deviceId() }).then(function (res) {
      if (res && res.ok && res.token) {
        state.token = res.token;
        loadMetaThenReady(res.name || name, btn);
      } else {
        btn.disabled = false; btn.textContent = "Log in";
        msg.className = "form-msg err";
        if (res && res.reason === "notconfigured") msg.textContent = "Login is not set up yet. Ask the admin to set it up.";
        else if (res && res.reason === "otherdevice") msg.textContent = "This code is already used on another device. Ask the admin to reset it.";
        else if (res && res.reason === "network") msg.textContent = "No internet. Check your connection.";
        else msg.textContent = "Wrong name or passcode. Try again.";
      }
    });
  });

  function loadMetaThenReady(name, btn) {
    api("/api/exam", { token: state.token, meta: true }).then(function (m) {
      if (btn) { btn.disabled = false; btn.textContent = "Log in"; }
      if (!m || !m.ok) {
        var msg = $("login-msg"); msg.className = "form-msg err"; msg.textContent = "Could not load exams. Try again.";
        return;
      }
      state.config = m.config || {}; state.exams = m.exams || [];
      TIME_LIMIT = state.config.timeLimitSec || 2400; PASS = state.config.passPct || 75;
      enterReady(name);
    });
  }

  function enterReady(name) {
    state.name = name;
    $("ready-name").textContent = name;
    $("rule-time").textContent = Math.round(TIME_LIMIT / 60) + " minutes";
    $("rule-pass").textContent = PASS + "%";
    updateProgressLine();
    show("screen-ready");
  }
  function updateProgressLine() {
    var n = getPassed().length, total = state.exams.length;
    var line = $("progress-line");
    if (total && n >= total) line.textContent = "🏆 You passed all " + total + " exams! Ask the admin for 10 more.";
    else line.textContent = "⭐ Passed: " + n + " / " + total + " exams";
  }
  $("btn-logout").addEventListener("click", function () {
    state.name = ""; state.token = ""; $("in-code").value = ""; show("screen-login");
  });

  // =============================================================== START EXAM
  $("btn-start").addEventListener("click", startExam);
  $("btn-again").addEventListener("click", startExam);

  function pickExamId() {
    var passed = getPassed();
    var pool = state.exams.filter(function (e) { return passed.indexOf(e.id) === -1; });
    if (pool.length === 0) pool = state.exams.slice();
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  function startExam() {
    if (!state.token) { sessionEnded(); return; }
    var id = pickExamId();
    $("btn-start").disabled = true;
    api("/api/exam", { token: state.token, id: id }).then(function (res) {
      $("btn-start").disabled = false;
      if (!res || !res.ok) { if (res && res.reason === "unauthorized") sessionEnded(); return; }
      state.exam = res.exam; state.submitted = false; state.timeLeft = TIME_LIMIT;
      $("exam-num").textContent = state.exam.id;
      renderCrossword(state.exam.crossword);
      renderUoe(state.exam.uoe);
      $("review-box").classList.add("hidden");
      show("screen-exam");
      startTimer();
    });
  }

  // ---- timer ----
  function startTimer() {
    if (state.timer) clearInterval(state.timer);
    var t = $("timer");
    function tick() {
      t.textContent = fmtTime(state.timeLeft);
      t.className = "timer" + (state.timeLeft <= 60 ? " danger" : state.timeLeft <= 300 ? " warn" : "");
      if (state.timeLeft <= 0) { clearInterval(state.timer); submitExam(true); return; }
      state.timeLeft--;
    }
    tick();
    state.timer = setInterval(tick, 1000);
  }

  // ============================================================== CROSSWORD UI
  function renderCrossword(cw) {
    $("cw-theme").textContent = cw.theme;
    var grid = $("cw-grid"); grid.innerHTML = "";
    grid.style.gridTemplateColumns = "repeat(" + cw.cols + ", auto)";
    state.cellInputs = []; state.acrossAt = []; state.downAt = [];
    for (var r = 0; r < cw.rows; r++) {
      state.cellInputs[r] = []; state.acrossAt[r] = []; state.downAt[r] = [];
      for (var c = 0; c < cw.cols; c++) {
        var cell = cw.cells[r][c];
        var div = document.createElement("div");
        if (!cell) { div.className = "cw-cell block"; grid.appendChild(div); state.cellInputs[r][c] = null; continue; }
        div.className = "cw-cell";
        if (cell.num) { var nm = document.createElement("span"); nm.className = "cw-num"; nm.textContent = cell.num; div.appendChild(nm); }
        var inp = document.createElement("input");
        inp.type = "text"; inp.maxLength = 1; inp.setAttribute("inputmode", "text");
        inp.setAttribute("autocapitalize", "characters"); inp.autocomplete = "off";
        inp.setAttribute("autocorrect", "off"); inp.spellcheck = false;
        inp.dataset.r = r; inp.dataset.c = c;
        inp.addEventListener("focus", onCellFocus);
        inp.addEventListener("input", onCellInput);
        inp.addEventListener("keydown", onCellKey);
        inp.addEventListener("click", onCellClick);
        div.appendChild(inp); grid.appendChild(div);
        state.cellInputs[r][c] = inp;
      }
    }
    $("cw-across").innerHTML = ""; $("cw-down").innerHTML = "";
    buildEntries(cw, "across", state.acrossAt, $("cw-across"));
    buildEntries(cw, "down", state.downAt, $("cw-down"));
    state.active = null;
  }
  function buildEntries(cw, dir, map, listEl) {
    (cw[dir] || []).forEach(function (entry) {
      var li = document.createElement("li");
      li.textContent = entry.num + ". " + entry.clue;
      li.addEventListener("click", function () { activateEntry(entry, dir, true); });
      listEl.appendChild(li);
      entry._li = li;
      var dr = dir === "across" ? 0 : 1, dc = dir === "across" ? 1 : 0;
      entry.path = [];
      for (var i = 0; i < entry.len; i++) {
        var rr = entry.row + dr * i, cc = entry.col + dc * i;
        map[rr][cc] = entry; entry.path.push({ r: rr, c: cc });
      }
    });
  }
  function clearHighlights() {
    document.querySelectorAll(".cw-cell.active,.cw-cell.activeword").forEach(function (el) { el.classList.remove("active", "activeword"); });
    document.querySelectorAll(".clue-col li.active").forEach(function (el) { el.classList.remove("active"); });
  }
  function activateEntry(entry, dir, focusFirst) {
    state.active = { entry: entry, dir: dir };
    clearHighlights();
    entry.path.forEach(function (p) { var inp = state.cellInputs[p.r][p.c]; if (inp) inp.parentElement.classList.add("activeword"); });
    if (entry._li) entry._li.classList.add("active");
    if (focusFirst) {
      var target = entry.path.find(function (p) { return !state.cellInputs[p.r][p.c].value; }) || entry.path[0];
      var inp = state.cellInputs[target.r][target.c]; inp.focus(); inp.parentElement.classList.add("active");
    }
  }
  function onCellFocus(e) {
    var r = +e.target.dataset.r, c = +e.target.dataset.c;
    if (!state.active || (state.acrossAt[r][c] !== state.active.entry && state.downAt[r][c] !== state.active.entry)) {
      var entry = state.acrossAt[r][c] || state.downAt[r][c];
      if (entry) activateEntry(entry, state.acrossAt[r][c] ? "across" : "down", false);
    }
    document.querySelectorAll(".cw-cell.active").forEach(function (el) { el.classList.remove("active"); });
    e.target.parentElement.classList.add("active");
  }
  function onCellClick(e) {
    var r = +e.target.dataset.r, c = +e.target.dataset.c, a = state.acrossAt[r][c], d = state.downAt[r][c];
    if (a && d && state.active && state.active.entry === a) activateEntry(d, "down", false);
    else if (a) activateEntry(a, "across", false);
    else if (d) activateEntry(d, "down", false);
  }
  function onCellInput(e) {
    var v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    e.target.value = v.slice(-1);
    if (e.target.value) moveNext(+e.target.dataset.r, +e.target.dataset.c, 1);
  }
  function onCellKey(e) {
    var r = +e.target.dataset.r, c = +e.target.dataset.c;
    if (e.key === "Backspace" && !e.target.value) { e.preventDefault(); moveNext(r, c, -1, true); }
    else if (e.key === "ArrowRight") focusCell(r, c + 1);
    else if (e.key === "ArrowLeft") focusCell(r, c - 1);
    else if (e.key === "ArrowDown") focusCell(r + 1, c);
    else if (e.key === "ArrowUp") focusCell(r - 1, c);
  }
  function focusCell(r, c) { if (state.cellInputs[r] && state.cellInputs[r][c]) { state.cellInputs[r][c].focus(); return true; } return false; }
  function moveNext(r, c, sign, erase) {
    if (!state.active) return;
    var path = state.active.entry.path;
    var idx = path.findIndex(function (p) { return p.r === r && p.c === c; }), ni = idx + sign;
    if (ni >= 0 && ni < path.length) { var p = path[ni], inp = state.cellInputs[p.r][p.c]; inp.focus(); if (erase) inp.value = ""; }
  }

  // ============================================================ USE OF ENGLISH
  function renderUoe(items) {
    var ol = $("uoe-list"); ol.innerHTML = "";
    items.forEach(function (item, i) {
      var li = document.createElement("li"), q = document.createElement("div"); q.className = "uoe-q";
      var parts = item.q.split("____");
      var s1 = document.createElement("span"); s1.textContent = parts[0];
      var inp = document.createElement("input");
      inp.type = "text"; inp.className = "uoe-input"; inp.dataset.i = i;
      inp.autocomplete = "off"; inp.setAttribute("autocorrect", "off"); inp.spellcheck = false;
      inp.setAttribute("autocapitalize", "off"); inp.setAttribute("aria-label", "answer " + (i + 1));
      var s2 = document.createElement("span"); s2.textContent = parts[1] || "";
      q.appendChild(s1); q.appendChild(inp); q.appendChild(s2); li.appendChild(q); ol.appendChild(li);
    });
  }

  // ==================================================================== SUBMIT
  $("btn-submit").addEventListener("click", confirmSubmit);
  $("btn-submit-2").addEventListener("click", confirmSubmit);
  function confirmSubmit() { if (state.submitted) return; if (window.confirm("Finish the exam and see your score?")) submitExam(false); }

  function collectCrossword() {
    var cw = state.exam.crossword, out = [];
    for (var r = 0; r < cw.rows; r++) {
      var row = [];
      for (var c = 0; c < cw.cols; c++) { var inp = state.cellInputs[r][c]; row.push(inp ? inp.value : ""); }
      out.push(row);
    }
    return out;
  }
  function collectUoe() {
    return [].map.call(document.querySelectorAll(".uoe-input"), function (i) { return i.value; });
  }

  function submitExam(auto) {
    if (state.submitted) return;
    state.submitted = true;
    if (state.timer) clearInterval(state.timer);
    api("/api/grade", { token: state.token, id: state.exam.id, cw: collectCrossword(), uoe: collectUoe() })
      .then(function (res) {
        if (!res || !res.ok) {
          if (res && res.reason === "unauthorized") { sessionEnded(); return; }
          state.submitted = false; window.alert("Could not send your answers. Check your connection and tap Finish again."); return;
        }
        applyReview(res.review);
        if (res.passed) addPassed(state.exam.id);
        state._review = res.review;
        showResult(res, auto);
      });
  }

  function applyReview(review) {
    // colour crossword cells by word
    (review.cw || []).forEach(function (d) {
      var list = state.exam.crossword[d.dir] || [];
      var entry = list.filter(function (e) { return e.num === d.num; })[0];
      if (!entry || !entry.path) return;
      entry.path.forEach(function (p) { var inp = state.cellInputs[p.r][p.c]; if (inp) inp.parentElement.classList.add(d.ok ? "correct" : "wrong"); });
    });
    // colour uoe inputs
    var inputs = document.querySelectorAll(".uoe-input");
    (review.uoe || []).forEach(function (d, i) {
      var inp = inputs[i]; if (!inp) return;
      inp.classList.add(d.ok ? "correct" : "wrong"); inp.disabled = true;
      if (!d.ok) { var s = document.createElement("span"); s.className = "uoe-correct"; s.textContent = "✓ " + d.answer; inp.parentElement.appendChild(s); }
    });
  }

  // ==================================================================== RESULT
  function showResult(res, auto) {
    $("score-pct").textContent = res.overall;
    $("score-cw").textContent = res.cwPct + "%";
    $("score-uoe").textContent = res.uoePct + "%";
    $("score-overall").textContent = res.overall + "%";
    var card = document.querySelector(".result-card");
    card.classList.toggle("result-fail", !res.passed);
    var gate = $("pass-gate"), detail = $("score-detail");
    if (res.passed) {
      $("result-emoji").textContent = "🎉"; $("result-headline").textContent = "You passed!";
      $("result-note").textContent = "Brilliant work, " + state.name + "! 🌟";
      gate.classList.remove("hidden"); detail.classList.add("hidden");
    } else {
      $("result-emoji").textContent = "💪"; $("result-headline").textContent = auto ? "Time's up!" : "Not yet…";
      $("result-note").textContent = "You need " + PASS + "% to pass. Do it again — you can do it!";
      gate.classList.add("hidden"); detail.classList.remove("hidden");
    }
    $("btn-again").textContent = res.passed ? "Next exam ▶" : "Try again ▶";
    updateProgressLine();
    show("screen-result");
  }
  $("btn-see-result").addEventListener("click", function () {
    $("pass-gate").classList.add("hidden"); $("score-detail").classList.remove("hidden");
  });
  $("btn-review").addEventListener("click", function () {
    var box = $("review-box");
    if (!box.classList.contains("hidden")) { box.classList.add("hidden"); return; }
    if (!state._review) return;
    var html = "<h3>Crossword answers</h3>";
    state._review.cw.forEach(function (d) {
      html += '<div class="review-item"><span class="' + (d.ok ? "r-ok" : "r-no") + '">' + (d.ok ? "✓" : "✗") +
        "</span> <b>" + d.num + " " + d.dir + ".</b> " + esc(d.clue) + ' → <span class="rt">' + esc(d.answer) + "</span>" +
        (d.ok ? "" : " (you wrote: " + esc(d.got || "—") + ")") + "</div>";
    });
    html += "<h3>Use of English</h3>";
    state._review.uoe.forEach(function (d, i) {
      html += '<div class="review-item"><span class="' + (d.ok ? "r-ok" : "r-no") + '">' + (d.ok ? "✓" : "✗") +
        "</span> <b>" + (i + 1) + ".</b> " + esc(d.q.replace("____", "[ " + d.answer + " ]")) +
        (d.ok ? "" : " — you wrote: " + esc(d.got || "—")) + "</div>";
    });
    box.innerHTML = html; box.classList.remove("hidden"); box.scrollIntoView({ behavior: "smooth" });
  });
  function esc(s) { return (s || "").replace(/[&<>]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]; }); }

  // boot
  show("screen-login");
})();
