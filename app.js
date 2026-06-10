/* Hippo Mock Exam — Little Hippo · Continental Round
   Flow: login -> ready -> exam (timed) -> result (75% gate) */
(function () {
  "use strict";
  var DATA = window.EXAM_DATA || { config: {}, exams: [] };
  var CFG = DATA.config || {};
  var TIME_LIMIT = CFG.timeLimitSec || 2400;     // 40 min
  var PASS = CFG.passPct || 75;

  // ---- state ----
  var state = {
    name: "",
    exam: null,        // current exam object
    timeLeft: TIME_LIMIT,
    timer: null,
    submitted: false,
    cellInputs: [],    // [r][c] -> input | null
    acrossAt: [],      // [r][c] -> entry | null
    downAt: [],
    active: null       // {entry, dir}
  };

  // ---- helpers ----
  function $(id) { return document.getElementById(id); }
  function show(screenId) {
    ["screen-login", "screen-ready", "screen-exam", "screen-result"].forEach(function (s) {
      $(s).classList.toggle("active", s === screenId);
    });
    window.scrollTo(0, 0);
  }
  function norm(s) {
    return (s || "").toString().trim().toLowerCase()
      .replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ");
  }
  function passedKey() { return "hippo_passed::" + norm(state.name); }
  function getPassed() {
    try { return JSON.parse(localStorage.getItem(passedKey()) || "[]"); }
    catch (e) { return []; }
  }
  function addPassed(id) {
    var p = getPassed();
    if (p.indexOf(id) === -1) { p.push(id); localStorage.setItem(passedKey(), JSON.stringify(p)); }
  }
  function fmtTime(s) {
    var m = Math.floor(s / 60), ss = s % 60;
    return m + ":" + (ss < 10 ? "0" : "") + ss;
  }
  function deviceId() {
    var k = "hippo_device", v = localStorage.getItem(k);
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "d" + Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(k, v);
    }
    return v;
  }

  // =================================================================== LOGIN
  var loginForm = $("login-form");
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("in-name").value.trim();
    var code = $("in-code").value.trim();
    var msg = $("login-msg");
    if (!name || !code) { msg.className = "form-msg err"; msg.textContent = "Type your name and passcode."; return; }
    var btn = $("btn-login"); btn.disabled = true; btn.textContent = "Checking…";
    msg.className = "form-msg"; msg.textContent = "";

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, code: code, device: deviceId() })
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        btn.disabled = false; btn.textContent = "Log in";
        if (res && res.ok) { enterReady(res.name || name); }
        else if (res && res.reason === "notconfigured") {
          msg.className = "form-msg err";
          msg.textContent = "Login is not set up yet. (Ask Mum to add the Notion token.)";
        } else if (res && res.reason === "otherdevice") {
          msg.className = "form-msg err";
          msg.textContent = "This code is already used on another device. Ask Mum to reset it.";
        } else {
          msg.className = "form-msg err"; msg.textContent = "Wrong name or passcode. Try again.";
        }
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Log in";
        msg.className = "form-msg err"; msg.textContent = "No internet. Check your connection.";
      });
  });

  function enterReady(name) {
    state.name = name;
    $("ready-name").textContent = name;
    $("rule-time").textContent = Math.round(TIME_LIMIT / 60) + " minutes";
    $("rule-pass").textContent = PASS + "%";
    updateProgressLine();
    show("screen-ready");
  }
  function updateProgressLine() {
    var n = getPassed().length, total = DATA.exams.length;
    var line = $("progress-line");
    if (n >= total) { line.textContent = "🏆 You passed all " + total + " exams! Ask Mum for 10 more."; }
    else { line.textContent = "⭐ Passed: " + n + " / " + total + " exams"; }
  }

  $("btn-logout").addEventListener("click", function () {
    state.name = ""; $("in-code").value = ""; show("screen-login");
  });

  // =============================================================== START EXAM
  $("btn-start").addEventListener("click", startExam);
  $("btn-again").addEventListener("click", startExam);

  function pickExam() {
    var passed = getPassed();
    var pool = DATA.exams.filter(function (e) { return passed.indexOf(e.id) === -1; });
    if (pool.length === 0) pool = DATA.exams.slice();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startExam() {
    state.exam = pickExam();
    state.submitted = false;
    state.timeLeft = TIME_LIMIT;
    $("exam-num").textContent = state.exam.id;
    renderCrossword(state.exam.crossword);
    renderUoe(state.exam.uoe);
    $("review-box").classList.add("hidden");
    show("screen-exam");
    startTimer();
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
    var grid = $("cw-grid");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = "repeat(" + cw.cols + ", auto)";
    state.cellInputs = []; state.acrossAt = []; state.downAt = [];
    var r, c;
    for (r = 0; r < cw.rows; r++) {
      state.cellInputs[r] = []; state.acrossAt[r] = []; state.downAt[r] = [];
      for (c = 0; c < cw.cols; c++) {
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
        div.appendChild(inp);
        grid.appendChild(div);
        state.cellInputs[r][c] = inp;
      }
    }
    // entry maps + clue lists
    var across = $("cw-across"), down = $("cw-down");
    across.innerHTML = ""; down.innerHTML = "";
    buildEntries(cw, "across", state.acrossAt, across);
    buildEntries(cw, "down", state.downAt, down);
    state.active = null;
  }

  function buildEntries(cw, dir, map, listEl) {
    var entries = cw[dir] || [];
    entries.forEach(function (entry) {
      var li = document.createElement("li");
      li.textContent = entry.num + ". " + entry.clue;
      li.dataset.dir = dir; li.dataset.num = entry.num;
      li.addEventListener("click", function () { activateEntry(entry, dir, true); });
      listEl.appendChild(li);
      entry._li = li;
      var dr = dir === "across" ? 0 : 1, dc = dir === "across" ? 1 : 0;
      entry.path = [];
      for (var i = 0; i < entry.len; i++) {
        var rr = entry.row + dr * i, cc = entry.col + dc * i;
        map[rr][cc] = entry;
        entry.path.push({ r: rr, c: cc });
      }
    });
  }

  function clearHighlights() {
    document.querySelectorAll(".cw-cell.active,.cw-cell.activeword").forEach(function (el) {
      el.classList.remove("active", "activeword");
    });
    document.querySelectorAll(".clue-col li.active").forEach(function (el) { el.classList.remove("active"); });
  }
  function activateEntry(entry, dir, focusFirst) {
    state.active = { entry: entry, dir: dir };
    clearHighlights();
    entry.path.forEach(function (p) {
      var inp = state.cellInputs[p.r][p.c];
      if (inp) inp.parentElement.classList.add("activeword");
    });
    if (entry._li) entry._li.classList.add("active");
    if (focusFirst) {
      var target = entry.path.find(function (p) { return !state.cellInputs[p.r][p.c].value; }) || entry.path[0];
      var inp = state.cellInputs[target.r][target.c];
      inp.focus();
      inp.parentElement.classList.add("active");
    }
  }
  function onCellFocus(e) {
    var r = +e.target.dataset.r, c = +e.target.dataset.c;
    if (!state.active || (state.acrossAt[r][c] !== state.active.entry && state.downAt[r][c] !== state.active.entry)) {
      var entry = state.acrossAt[r][c] || state.downAt[r][c];
      var dir = state.acrossAt[r][c] ? "across" : "down";
      if (entry) activateEntry(entry, dir, false);
    }
    document.querySelectorAll(".cw-cell.active").forEach(function (el) { el.classList.remove("active"); });
    e.target.parentElement.classList.add("active");
  }
  function onCellClick(e) {
    var r = +e.target.dataset.r, c = +e.target.dataset.c;
    var a = state.acrossAt[r][c], d = state.downAt[r][c];
    if (a && d && state.active && state.active.entry === a) { activateEntry(d, "down", false); }
    else if (a) { activateEntry(a, "across", false); }
    else if (d) { activateEntry(d, "down", false); }
  }
  function onCellInput(e) {
    var v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    e.target.value = v.slice(-1);
    if (e.target.value) moveNext(+e.target.dataset.r, +e.target.dataset.c, 1);
  }
  function onCellKey(e) {
    var r = +e.target.dataset.r, c = +e.target.dataset.c;
    if (e.key === "Backspace" && !e.target.value) { e.preventDefault(); moveNext(r, c, -1, true); }
    else if (e.key === "ArrowRight") { focusCell(r, c + 1); }
    else if (e.key === "ArrowLeft") { focusCell(r, c - 1); }
    else if (e.key === "ArrowDown") { focusCell(r + 1, c); }
    else if (e.key === "ArrowUp") { focusCell(r - 1, c); }
  }
  function focusCell(r, c) {
    if (state.cellInputs[r] && state.cellInputs[r][c]) { state.cellInputs[r][c].focus(); return true; }
    return false;
  }
  function moveNext(r, c, dirSign, eraseOnBack) {
    if (!state.active) return;
    var path = state.active.entry.path;
    var idx = path.findIndex(function (p) { return p.r === r && p.c === c; });
    var ni = idx + dirSign;
    if (ni >= 0 && ni < path.length) {
      var p = path[ni];
      var inp = state.cellInputs[p.r][p.c];
      inp.focus();
      if (eraseOnBack) inp.value = "";
    }
  }

  // ============================================================ USE OF ENGLISH
  function renderUoe(items) {
    var ol = $("uoe-list"); ol.innerHTML = "";
    items.forEach(function (item, i) {
      var li = document.createElement("li");
      var q = document.createElement("div"); q.className = "uoe-q";
      var parts = item.q.split("____");
      var span1 = document.createElement("span"); span1.textContent = parts[0];
      var inp = document.createElement("input");
      inp.type = "text"; inp.className = "uoe-input"; inp.dataset.i = i;
      inp.autocomplete = "off"; inp.setAttribute("autocorrect", "off");
      inp.spellcheck = false; inp.setAttribute("autocapitalize", "off");
      inp.setAttribute("aria-label", "answer " + (i + 1));
      var span2 = document.createElement("span"); span2.textContent = parts[1] || "";
      q.appendChild(span1); q.appendChild(inp); q.appendChild(span2);
      li.appendChild(q);
      ol.appendChild(li);
    });
  }

  // ==================================================================== SUBMIT
  $("btn-submit").addEventListener("click", function () { confirmSubmit(); });
  $("btn-submit-2").addEventListener("click", function () { confirmSubmit(); });
  function confirmSubmit() {
    if (state.submitted) return;
    if (window.confirm("Finish the exam and see your score?")) submitExam(false);
  }

  function gradeCrossword(cw) {
    var total = 0, correct = 0, detail = [];
    ["across", "down"].forEach(function (dir) {
      (cw[dir] || []).forEach(function (entry) {
        total++;
        var got = entry.path.map(function (p) {
          var inp = state.cellInputs[p.r][p.c]; return (inp.value || "").toUpperCase();
        }).join("");
        var ok = got === entry.answer.toUpperCase();
        if (ok) correct++;
        entry.path.forEach(function (p) {
          state.cellInputs[p.r][p.c].parentElement.classList.add(ok ? "correct" : "wrong");
        });
        detail.push({ num: entry.num, dir: dir, clue: entry.clue, answer: entry.answer, got: got, ok: ok });
      });
    });
    return { total: total, correct: correct, pct: total ? Math.round(correct / total * 100) : 0, detail: detail };
  }

  function gradeUoe(items) {
    var total = items.length, correct = 0, detail = [];
    var inputs = document.querySelectorAll(".uoe-input");
    items.forEach(function (item, i) {
      var inp = inputs[i];
      var val = norm(inp.value);
      var accept = item.answers.map(norm);
      var ok = val !== "" && accept.indexOf(val) !== -1;
      if (ok) correct++;
      inp.classList.add(ok ? "correct" : "wrong");
      inp.disabled = true;
      if (!ok) {
        var s = document.createElement("span"); s.className = "uoe-correct";
        s.textContent = "✓ " + item.answers[0]; inp.parentElement.appendChild(s);
      }
      detail.push({ q: item.q, answer: item.answers[0], got: inp.value, ok: ok });
    });
    return { total: total, correct: correct, pct: total ? Math.round(correct / total * 100) : 0, detail: detail };
  }

  function submitExam(auto) {
    if (state.submitted) return;
    state.submitted = true;
    if (state.timer) clearInterval(state.timer);
    var cwRes = gradeCrossword(state.exam.crossword);
    var uoeRes = gradeUoe(state.exam.uoe);
    var overall = Math.round((cwRes.pct + uoeRes.pct) / 2);
    var passed = overall >= PASS;
    if (passed) addPassed(state.exam.id);
    showResult(overall, cwRes, uoeRes, passed, auto);
  }

  // ==================================================================== RESULT
  function showResult(overall, cwRes, uoeRes, passed, auto) {
    $("score-pct").textContent = overall;
    $("score-cw").textContent = cwRes.pct + "%";
    $("score-uoe").textContent = uoeRes.pct + "%";
    $("score-overall").textContent = overall + "%";

    var card = document.querySelector(".result-card");
    card.classList.toggle("result-fail", !passed);
    var gate = $("pass-gate"), detail = $("score-detail");

    if (passed) {
      $("result-emoji").textContent = "🎉";
      $("result-headline").textContent = "You passed!";
      $("result-note").textContent = "Brilliant work, " + state.name + "! 🌟";
      gate.classList.remove("hidden");
      detail.classList.add("hidden");
    } else {
      $("result-emoji").textContent = "💪";
      $("result-headline").textContent = auto ? "Time's up!" : "Not yet…";
      $("result-note").textContent = "You need " + PASS + "% to pass. Do it again — you can do it!";
      gate.classList.add("hidden");
      detail.classList.remove("hidden");
    }
    $("btn-again").textContent = passed ? "Next exam ▶" : "Try again ▶";

    // stash detail for review
    state._review = { cw: cwRes.detail, uoe: uoeRes.detail };
    updateProgressLine();
    show("screen-result");
  }

  $("btn-see-result").addEventListener("click", function () {
    $("pass-gate").classList.add("hidden");
    $("score-detail").classList.remove("hidden");
  });

  $("btn-review").addEventListener("click", function () {
    var box = $("review-box");
    if (!box.classList.contains("hidden")) { box.classList.add("hidden"); return; }
    var html = "<h3>Crossword answers</h3>";
    state._review.cw.forEach(function (d) {
      html += '<div class="review-item"><span class="' + (d.ok ? "r-ok" : "r-no") + '">' +
        (d.ok ? "✓" : "✗") + "</span> <b>" + d.num + " " + d.dir + ".</b> " + esc(d.clue) +
        ' → <span class="rt">' + esc(d.answer) + "</span>" +
        (d.ok ? "" : ' (you wrote: ' + esc(d.got || "—") + ")") + "</div>";
    });
    html += "<h3>Use of English</h3>";
    state._review.uoe.forEach(function (d, i) {
      html += '<div class="review-item"><span class="' + (d.ok ? "r-ok" : "r-no") + '">' +
        (d.ok ? "✓" : "✗") + "</span> <b>" + (i + 1) + ".</b> " +
        esc(d.q.replace("____", "[ " + d.answer + " ]")) +
        (d.ok ? "" : ' — you wrote: ' + esc(d.got || "—")) + "</div>";
    });
    box.innerHTML = html; box.classList.remove("hidden");
    box.scrollIntoView({ behavior: "smooth" });
  });
  function esc(s) { return (s || "").replace(/[&<>]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]; }); }

  // ============================================================= DEV (localhost)
  function isLocal() { return ["localhost", "127.0.0.1"].indexOf(location.hostname) !== -1; }

  // boot
  if (isLocal() && /[?&]dev=1/.test(location.search)) {
    enterReady("Tester");   // skip login for local UI testing only
  } else {
    show("screen-login");
  }
})();
