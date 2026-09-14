/* Times Tables / Үржихүйн хүрд · My Little Test
   Built like the Hippo exams: a library of levels, one per table. Pass a level
   and the next one opens straight away, replay any level any time, and every
   attempt is kept in a scores list.

   Facts are still stored commutatively (3x4 and 4x3 are one fact) and every
   answer updates the mastery grid, but nothing is gated on a calendar any more:
   a child who wants three levels in one sitting should get three levels.
   Progress is per child in localStorage. */
(function () {
  "use strict";

  var KEY = "mlt_math_v1", LKEY = "mlt_lang";
  var FAST_MS = 5000, PASS_PCT = 80, TOP = 5, STRONG = 3;
  var BOX_MS = [0, 10 * 6e4, 864e5, 3 * 864e5, 7 * 864e5, 21 * 864e5];
  var TOTAL_FACTS = 55;                            // 1..10 x 1..10, commutative

  // The level library. Easiest table first; the last one mixes everything passed.
  var LEVELS = [
    { table: 2 }, { table: 5 }, { table: 10 }, { table: 1 }, { table: 4 },
    { table: 3 }, { table: 6 }, { table: 9 }, { table: 8 }, { table: 7 },
    { table: 0, mixed: true, n: 12 }
  ];

  // Mongolian case endings for digits: a numeral takes the suffix of the word it
  // is read as, so these cannot be generated. Genitive 2 -> хоёрын -> 2-ын;
  // instrumental 2 -> хоёроор -> 2-оор.
  var GEN = { 1: "1-ийн", 2: "2-ын", 3: "3-ын", 4: "4-ийн", 5: "5-ын",
              6: "6-гийн", 7: "7-гийн", 8: "8-ын", 9: "9-ийн", 10: "10-ын" };
  var INS = { 1: "1-ээр", 2: "2-оор", 3: "3-аар", 4: "4-өөр", 5: "5-аар",
              6: "6-гаар", 7: "7-гоор", 8: "8-аар", 9: "9-өөр", 10: "10-аар" };

  var I18N = {
    mn: {
      docTitle: "Үржихүйн хүрд · My Little Test",
      appTitle: "Үржихүйн хүрд",
      hiName: "Сайн уу, {0}! 👋",
      summary: "⭐ Тэнцсэн: {0} / {1} түвшин",
      allPassed: "🏆 Бүх түвшнийг давлаа! Одоо хурдан болтол нь давтаарай.",
      lvlName: "{0} хүрд", lvlMixed: "Холимог давтлага",
      lvlNum: "Түвшин {0}",
      notStarted: "Эхлээгүй", locked: "Түгжээтэй",
      bestIs: "Хамгийн сайн: {0}/{1}",
      tries: "{0} удаа оролдсон",
      btnStart: "Эхлэх", btnRetry: "Дахиад", btnRedo: "Давтах",
      btnProgress: "Оноо ба ахиц", btnLogout: "Гарах",
      backSite: "← Бүх хичээл",
      chipWarm: "Бэлтгэл",
      countBy: "{0} тоол",
      warmHint: "Дутуу тоог нөхөөрэй.",
      btnHint: "Үзүүлээч 👀",
      okFast: "Зөв! ⚡", okSlow: "Зөв байна! ✅",
      wrong: "{0} × {1} = {2}. Хамтдаа тоолъё.",
      donePass: "Тэнцлээ!", doneFail: "Дахиад оролдоё",
      doneLine: "Шууд зөв: {0}/{1}",
      unlockNext: "🎊 {0} нээгдлээ!",
      unlockAll: "🏆 Бүх түвшнийг давлаа!",
      needPass: "Тэнцэхийн тулд {0} зөв хариулт хэрэгтэй. Чи чадна!",
      tipTricky: "Хэцүү байсан нь: {0}",
      tipClean: "Нэг ч алдаагүй. Гоё!",
      btnNext: "Дараагийн түвшин →",
      btnAgain: "Энэ түвшнийг дахиад",
      btnBackList: "← Түвшнүүд рүү",
      progTitle: "Оноо ба ахиц",
      scoresTitle: "Миний оноо",
      legNew: "шинэ", legLearning: "сурч байна", legStrong: "сайн", legMastered: "цээжилсэн",
      trickyTitle: "Одоо хэцүү байгаа нь",
      noneTricky: "Хэцүү жишээ алга. 🎈",
      btnBack: "← Буцах", btnReset: "Бүх ахицыг устгах",
      confirmReset: "Энэ төхөөрөмж дээрх бүх ахицыг устгах уу?",
      loginSub: "Нэр, кодоо оруулаарай.",
      lblName: "Нэр", lblCode: "Код",
      phName: "Нэрээ бичнэ үү", phCode: "6 оронтой тоо",
      btnLogin: "Нэвтрэх", checking: "Шалгаж байна…",
      errInput: "Нэр, кодоо бичээрэй.",
      errWrong: "Нэр эсвэл код буруу байна. Дахин оролдоорой.",
      errCourse: "Энэ кодоор үржихүйн хичээл нээгдээгүй байна.",
      errDevice: "Энэ кодыг хоёр төхөөрөмж дээр аль хэдийн ашигласан байна. Админд хандаарай.",
      errNet: "Интернэт алга. Холболтоо шалгаарай.",
      errSetup: "Нэвтрэх тохиргоо хийгдээгүй байна. Админд хандаарай.",
      other: "EN"
    },
    en: {
      docTitle: "Times Tables · My Little Test",
      appTitle: "Times Tables",
      hiName: "Hi {0}! 👋",
      summary: "⭐ Passed: {0} / {1} levels",
      allPassed: "🏆 Every level passed! Keep replaying to get lightning fast.",
      lvlName: "{0} × table", lvlMixed: "Mixed review",
      lvlNum: "Level {0}",
      notStarted: "Not started", locked: "Locked",
      bestIs: "Best: {0}/{1}",
      tries: "{0} tries",
      btnStart: "Start", btnRetry: "Try again", btnRedo: "Replay",
      btnProgress: "Scores and progress", btnLogout: "Log out",
      backSite: "← All subjects",
      chipWarm: "Warm up",
      countBy: "Count by {0}",
      warmHint: "Fill in the missing numbers.",
      btnHint: "Show me 👀",
      okFast: "Yes! ⚡", okSlow: "That's right! ✅",
      wrong: "{0} × {1} = {2}. Count them with me.",
      donePass: "Passed!", doneFail: "Nearly there",
      doneLine: "First try: {0}/{1}",
      unlockNext: "🎊 {0} is open!",
      unlockAll: "🏆 Every level passed!",
      needPass: "You need {0} right to pass. You can do it!",
      tipTricky: "Tricky ones: {0}",
      tipClean: "Not a single mistake. Brilliant!",
      btnNext: "Next level →",
      btnAgain: "Replay this level",
      btnBackList: "← Back to levels",
      progTitle: "Scores and progress",
      scoresTitle: "My scores",
      legNew: "new", legLearning: "learning", legStrong: "strong", legMastered: "mastered",
      trickyTitle: "Tricky ones right now",
      noneTricky: "Nothing tricky right now. 🎈",
      btnBack: "← Back", btnReset: "Reset all progress",
      confirmReset: "Erase all multiplication progress on this device?",
      loginSub: "Type your name and passcode.",
      lblName: "Your name", lblCode: "Passcode",
      phName: "Type your name", phCode: "6 digits",
      btnLogin: "Log in", checking: "Checking…",
      errInput: "Type your name and passcode.",
      errWrong: "Wrong name or passcode. Try again.",
      errCourse: "This passcode does not include the multiplication course.",
      errDevice: "This code is already used on 2 devices. Ask the admin to reset it.",
      errNet: "No internet. Check your connection.",
      errSetup: "Login is not set up yet. Ask the admin to set it up.",
      other: "МН"
    }
  };

  var lang = "mn", S = null, sess = null, warm = null, padMode = "", buf = "";
  var user = "", userName = "", token = "";

  function t(k) {
    var s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k, i;
    for (i = 1; i < arguments.length; i++) s = s.replace("{" + (i - 1) + "}", arguments[i]);
    return s;
  }
  function $(id) { return document.getElementById(id); }
  function show(id) {
    ["m-login", "m-home", "m-warmup", "m-quiz", "m-done", "m-progress"].forEach(function (s) {
      $(s).classList.toggle("active", s === id);
    });
    window.scrollTo(0, 0);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function dayStr(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function normName(x) { return (x || "").toString().trim().toLowerCase().replace(/\s+/g, " "); }

  // ================================================================= LEVELS
  function levelName(i) {
    var L = LEVELS[i];
    if (L.mixed) return t("lvlMixed");
    return t("lvlName", lang === "mn" ? GEN[L.table] : L.table);
  }
  function levelSize(i) { return LEVELS[i].n || 10; }
  function passMark(i) { return Math.ceil(levelSize(i) * PASS_PCT / 100); }
  function levelRec(i) { return S.levels[i] || (S.levels[i] = { best: 0, stars: 0, tries: 0, passed: false }); }
  function isPassed(i) { return !!(S.levels[i] && S.levels[i].passed); }
  // Level 0 is always open; after that, passing the one before opens the next.
  function isOpen(i) { return i === 0 || isPassed(i - 1); }
  function passedCount() { var n = 0, i; for (i = 0; i < LEVELS.length; i++) if (isPassed(i)) n++; return n; }
  function starsFor(i, right) {
    var pct = right / levelSize(i) * 100;
    if (pct >= 100) return 3;
    if (pct >= 90) return 2;
    if (pct >= PASS_PCT) return 1;
    return 0;
  }
  function starStr(n) { return "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n); }

  // ================================================================= STORE
  function progKey() { return user ? KEY + ":" + user : KEY; }
  function load() {
    try { S = JSON.parse(localStorage.getItem(progKey())); } catch (e) { S = null; }
    if ((!S || !S.facts) && user && !localStorage.getItem(KEY + ":claimed")) {
      try {
        var legacy = JSON.parse(localStorage.getItem(KEY));
        if (legacy && legacy.facts) { S = legacy; localStorage.setItem(KEY + ":claimed", user); }
      } catch (e2) {}
    }
    if (!S || !S.facts) S = { v: 2, facts: {}, levels: {}, streak: 0, lastDay: "", sessions: 0 };
    if (!S.levels) S.levels = {};      // upgrade from the daily-practice version
    return S;
  }
  function save() { try { localStorage.setItem(progKey(), JSON.stringify(S)); } catch (e) {} }

  function fk(a, b) { return Math.min(a, b) + "x" + Math.max(a, b); }
  function fact(k) { return S.facts[k] || (S.facts[k] = { box: 0, due: 0, seen: 0, wrong: 0 }); }
  function box(k) { return S.facts[k] ? S.facts[k].box : 0; }
  function tableFacts(tb) { var o = [], b; for (b = 1; b <= 10; b++) o.push(fk(tb, b)); return o; }
  function masteredCount() {
    return Object.keys(S.facts).filter(function (k) { return S.facts[k].box >= TOP; }).length;
  }

  // ================================================================= SOUND
  var actx = null;
  function beep(freqs, dur) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * dur;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
      });
    } catch (e) {}
  }
  function sndOk() { beep([660, 880], 0.12); }
  function sndNo() { beep([200], 0.22); }
  function sndWin() { beep([523, 659, 784, 1047], 0.13); }

  // ================================================================= LIBRARY
  function renderHome() {
    $("home-hi").textContent = t("hiName", userName);
    var n = passedCount(), total = LEVELS.length;
    $("home-sub").textContent = n === total ? t("allPassed") : t("summary", n, total);

    $("level-list").innerHTML = LEVELS.map(function (L, i) {
      var open = isOpen(i), rec = S.levels[i], size = levelSize(i);
      var meta = !open ? t("locked")
        : (rec && rec.tries
            ? starStr(rec.stars) + "  ·  " + t("bestIs", rec.best, size) + "  ·  " + t("tries", rec.tries)
            : t("notStarted"));
      var action = !open ? "🔒"
        : (isPassed(i) ? t("btnRedo") : (rec && rec.tries ? t("btnRetry") : t("btnStart")));
      return '<button class="lvl' + (open ? "" : " locked") + (isPassed(i) ? " passed" : "") + '"' +
        (open ? '' : ' disabled') + ' data-i="' + i + '">' +
        '<span class="lvl-num">' + (i + 1) + '</span>' +
        '<span class="lvl-body"><span class="lvl-name">' + levelName(i) + '</span>' +
        '<span class="lvl-meta">' + meta + '</span></span>' +
        '<span class="lvl-go">' + action + '</span></button>';
    }).join("");

    Array.prototype.forEach.call($("level-list").querySelectorAll(".lvl:not(.locked)"), function (b) {
      b.addEventListener("click", function () { startLevel(parseInt(b.getAttribute("data-i"), 10)); });
    });
    show("m-home");
  }

  // ================================================================= WARM UP
  function startLevel(i) {
    sess = { lvl: i, q: buildQueue(i), idx: 0, size: levelSize(i), right: 0, firstRight: 0, wrong: 0, t0: 0, missed: [] };
    if (LEVELS[i].mixed) { startQuiz(); return; }      // no skip-count for the mixed level
    var tb = LEVELS[i].table, seq = [], j;
    for (j = 1; j <= 10; j++) seq.push(tb * j);
    warm = { t: tb, seq: seq, blanks: shuffle([1,2,3,4,5,6,7,8,9]).slice(0, 3).sort(function (a, b) { return a - b; }), at: 0 };
    $("warm-title").textContent = countByLabel(tb);
    buf = ""; padMode = "warm";
    renderLadder();
    show("m-warmup");
  }
  function countByLabel(n) { return t("countBy", lang === "mn" ? INS[n] : n); }
  function renderLadder() {
    $("warm-ladder").innerHTML = warm.seq.map(function (n, i) {
      var bi = warm.blanks.indexOf(i);
      if (bi < 0) return '<div class="rung">' + n + "</div>";
      if (bi < warm.at) return '<div class="rung filled">' + n + "</div>";
      if (bi === warm.at) return '<div class="rung blank on">' + (buf || "?") + "</div>";
      return '<div class="rung blank">?</div>';
    }).join("");
    $("warm-display").textContent = buf || "?";
    $("warm-display").classList.toggle("empty", !buf);
  }
  function warmSubmit() {
    if (!buf) return;
    if (parseInt(buf, 10) === warm.seq[warm.blanks[warm.at]]) {
      sndOk(); warm.at++; buf = "";
      if (warm.at >= warm.blanks.length) { renderLadder(); setTimeout(startQuiz, 500); return; }
    } else { sndNo(); buf = ""; }
    renderLadder();
  }

  // ================================================================= QUIZ
  function mkQ(k) {
    var p = k.split("x"), a = +p[0], b = +p[1];
    if (Math.random() < 0.5) { var s = a; a = b; b = s; }
    return { k: k, a: a, b: b, ans: a * b, retry: false };
  }
  function buildQueue(i) {
    var L = LEVELS[i], keys;
    if (!L.mixed) {
      keys = tableFacts(L.table);                       // all ten facts of the table
    } else {
      // Everything from the levels already passed, weakest first, then a random slice.
      var seen = {};
      LEVELS.forEach(function (lv, j) {
        if (!lv.mixed && isPassed(j)) tableFacts(lv.table).forEach(function (k) { seen[k] = 1; });
      });
      keys = Object.keys(seen);
      if (!keys.length) keys = tableFacts(2);
      keys.sort(function (a, b) { return (box(a) - box(b)) || Math.random() - 0.5; });
      keys = keys.slice(0, levelSize(i));
    }
    return shuffle(keys.slice()).map(mkQ);
  }
  function startQuiz() {
    padMode = "quiz"; buf = "";
    nextQ(); show("m-quiz");
  }
  function renderDots() {
    var h = "", i;
    for (i = 0; i < sess.size; i++) h += "<i class='" + (i < sess.right ? "on" : (i === sess.right ? "cur" : "")) + "'></i>";
    $("quiz-dots").innerHTML = h;
  }
  function nextQ() {
    if (sess.idx >= sess.q.length) { finish(); return; }
    var q = sess.q[sess.idx];
    $("quiz-q").textContent = q.a + " × " + q.b;
    $("quiz-fb").textContent = ""; $("quiz-fb").className = "feedback";
    $("quiz-hint").classList.add("hidden");
    $("btn-hint").classList.remove("hidden");
    buf = ""; paint(); renderDots();
    sess.t0 = Date.now();
  }
  function paint() {
    $("quiz-display").textContent = buf || "?";
    $("quiz-display").classList.toggle("empty", !buf);
  }
  function drawArray(a, b) {
    var h = "", i;
    for (i = 0; i < a * b; i++) h += "<i class='lit'></i>";
    var g = $("quiz-array");
    g.style.gridTemplateColumns = "repeat(" + b + ", 14px)";
    g.innerHTML = h;
    var line = [], s = 0;
    for (i = 0; i < a; i++) { s += b; line.push(s); }
    $("quiz-skipline").textContent = countByLabel(b) + ": " + line.join(", ");
    $("quiz-hint").classList.remove("hidden");
  }
  function grade(k, ok, ms) {
    var f = fact(k); f.seen++;
    if (ok) {
      f.box = ms < FAST_MS ? Math.min(f.box + 1, TOP) : Math.max(f.box, 1);
      f.due = Date.now() + BOX_MS[f.box];
    } else { f.wrong++; f.box = 0; f.due = Date.now(); }
  }
  function quizSubmit() {
    if (!buf) return;
    var q = sess.q[sess.idx], ms = Date.now() - sess.t0, ok = parseInt(buf, 10) === q.ans;
    if (ok) {
      if (!q.retry) { grade(q.k, true, ms); sess.firstRight++; }
      sess.right++; sndOk();
      $("quiz-fb").className = "feedback ok";
      $("quiz-fb").textContent = ms < FAST_MS ? t("okFast") : t("okSlow");
      save(); sess.idx++;
      setTimeout(nextQ, 650);
    } else {
      if (!q.retry) { grade(q.k, false, ms); sess.wrong++; sess.missed.push(q.k); }
      sndNo();
      $("quiz-q").classList.add("shake");
      setTimeout(function () { $("quiz-q").classList.remove("shake"); }, 420);
      $("quiz-fb").className = "feedback err";
      $("quiz-fb").textContent = t("wrong", q.a, q.b, q.ans);
      drawArray(q.a, q.b);
      $("btn-hint").classList.add("hidden");
      if (!q.retry) {
        var again = mkQ(q.k); again.retry = true;
        sess.q.splice(Math.min(sess.idx + 3, sess.q.length), 0, again);
      }
      buf = ""; paint(); save(); sess.idx++;
      setTimeout(nextQ, 2600);
    }
  }

  // ================================================================= FINISH
  function touchDay() {
    var now = new Date(), today = dayStr(now), yday = dayStr(new Date(now.getTime() - 864e5));
    if (S.lastDay === today) return;
    S.streak = (S.lastDay === yday) ? S.streak + 1 : 1;
    S.lastDay = today;
  }
  function pretty(k) { var p = k.split("x"); return p[0] + "×" + p[1]; }
  function finish() {
    var i = sess.lvl, size = sess.size, right = sess.firstRight;
    var passed = right >= passMark(i), rec = levelRec(i), wasPassed = rec.passed;
    var stars = starsFor(i, right);

    rec.tries++;
    if (right > rec.best) rec.best = right;
    if (stars > rec.stars) rec.stars = stars;
    if (passed) rec.passed = true;
    touchDay(); S.sessions++; save();

    $("done-emoji").textContent = passed ? (stars === 3 ? "🌟" : "🏅") : "💪";
    $("done-title").textContent = passed ? t("donePass") : t("doneFail");
    $("done-stars").textContent = passed ? starStr(stars) : "";
    $("done-line").textContent = t("doneLine", right, size);

    var ub = $("done-unlock"), next = i + 1;
    if (passed && !wasPassed && next < LEVELS.length) {
      ub.textContent = t("unlockNext", levelName(next));
      ub.classList.remove("hidden"); sndWin();
    } else if (passed && next >= LEVELS.length) {
      ub.textContent = t("unlockAll");
      ub.classList.remove("hidden"); sndWin();
    } else { ub.classList.add("hidden"); }

    $("done-tip").textContent = sess.missed.length
      ? t("tipTricky", sess.missed.slice(0, 4).map(pretty).join(", "))
      : (passed ? t("tipClean") : t("needPass", passMark(i)));

    // Next level only when it exists and is actually open now.
    var canNext = next < LEVELS.length && isOpen(next);
    $("btn-next").classList.toggle("hidden", !canNext);
    sess.next = canNext ? next : -1;
    show("m-done");
  }

  // ================================================================= PROGRESS
  function drawGrid(el) {
    var h = "<span class='hd'>×</span>", r, c;
    for (c = 1; c <= 10; c++) h += "<span class='hd'>" + c + "</span>";
    for (r = 1; r <= 10; r++) {
      h += "<span class='hd'>" + r + "</span>";
      for (c = 1; c <= 10; c++) h += "<span class='b" + box(fk(r, c)) + "'>" + (r * c) + "</span>";
    }
    el.innerHTML = h;
  }
  function weakest(n) {
    var seen = {};
    LEVELS.forEach(function (L, j) {
      if (!L.mixed && (isOpen(j) || isPassed(j))) tableFacts(L.table).forEach(function (k) { seen[k] = 1; });
    });
    return Object.keys(seen)
      .filter(function (k) { var f = S.facts[k]; return f && f.seen > 0 && f.box < 2 && (f.wrong > 0 || f.box === 0); })
      .sort(function (a, b) { return (box(a) - box(b)) || (S.facts[b].wrong - S.facts[a].wrong); })
      .slice(0, n);
  }
  function renderProgress() {
    drawGrid($("prog-grid"));
    $("prog-scores").innerHTML = LEVELS.map(function (L, i) {
      var rec = S.levels[i], size = levelSize(i);
      var right = rec && rec.tries
        ? starStr(rec.stars) + " " + rec.best + "/" + size
        : (isOpen(i) ? t("notStarted") : "🔒");
      return '<div class="score-row"><span class="sr-name">' + (i + 1) + ". " + levelName(i) + "</span>" +
        '<span class="sr-val">' + right + "</span></div>";
    }).join("");
    var w = weakest(12);
    $("prog-weak").innerHTML = w.length
      ? w.map(function (k) { return "<span>" + pretty(k) + "</span>"; }).join("")
      : "<span class='none'>" + t("noneTricky") + "</span>";
    show("m-progress");
  }

  // ================================================================= LANGUAGE
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t("docTitle");
    $("btn-lang").textContent = t("other");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    $("m-in-name").placeholder = t("phName");
    $("m-in-code").placeholder = t("phCode");
  }

  // ================================================================= INPUT
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".pad button") : null;
    if (!b) return;
    var k = b.getAttribute("data-k");
    if (k === "ok") { padMode === "warm" ? warmSubmit() : quizSubmit(); return; }
    if (k === "del") buf = buf.slice(0, -1);
    else if (buf.length < 3) buf += k;
    padMode === "warm" ? renderLadder() : paint();
  });
  document.addEventListener("keydown", function (e) {
    if (!/^m-(warmup|quiz)$/.test(document.querySelector(".screen.active").id)) return;
    if (e.key >= "0" && e.key <= "9") { if (buf.length < 3) buf += e.key; }
    else if (e.key === "Backspace") buf = buf.slice(0, -1);
    else if (e.key === "Enter") { padMode === "warm" ? warmSubmit() : quizSubmit(); return; }
    else return;
    e.preventDefault();
    padMode === "warm" ? renderLadder() : paint();
  });

  function loginErr(reason) {
    if (reason === "notconfigured") return t("errSetup");
    if (reason === "nocourse") return t("errCourse");
    if (reason === "otherdevice") return t("errDevice");
    if (reason === "network") return t("errNet");
    return t("errWrong");
  }
  function enter(name, tok) {
    token = tok || ""; userName = name; user = normName(name);
    $("m-in-code").value = "";
    load(); renderHome();
  }
  $("m-login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("m-in-name").value.trim(), code = $("m-in-code").value.trim(), msg = $("m-login-msg");
    if (!name || !code) { msg.className = "form-msg err"; msg.textContent = t("errInput"); return; }
    var btn = $("m-btn-login");
    btn.disabled = true; btn.textContent = t("checking");
    msg.className = "form-msg"; msg.textContent = "";
    window.MLT.login(name, code, "Multi").then(function (res) {
      btn.disabled = false; btn.textContent = t("btnLogin");
      if (res && res.ok && res.token) {
        window.MLT.save(res, name);
        window.MLT.remember(name, code);
        enter(res.name || name, res.token);
      } else {
        msg.className = "form-msg err";
        msg.textContent = loginErr(res && res.reason);
      }
    });
  });

  $("btn-logout").addEventListener("click", function () {
    window.MLT.clear(); window.MLT.forget(); window.location.href = "/";
  });
  $("btn-progress").addEventListener("click", renderProgress);
  $("btn-prog-back").addEventListener("click", renderHome);
  $("btn-home").addEventListener("click", renderHome);
  $("btn-again").addEventListener("click", function () { startLevel(sess.lvl); });
  $("btn-next").addEventListener("click", function () { if (sess.next >= 0) startLevel(sess.next); });
  $("btn-hint").addEventListener("click", function () { drawArray(sess.q[sess.idx].a, sess.q[sess.idx].b); });
  $("btn-reset").addEventListener("click", function () {
    if (!window.confirm(t("confirmReset"))) return;
    localStorage.removeItem(progKey()); S = null; load(); renderHome();
  });
  $("btn-lang").addEventListener("click", function () {
    lang = (lang === "mn") ? "en" : "mn";
    try { localStorage.setItem(LKEY, lang); } catch (e) {}
    applyLang();
    var active = document.querySelector(".screen.active").id;
    if (active === "m-home") renderHome();
    else if (active === "m-progress") renderProgress();
    else if (active === "m-warmup") $("warm-title").textContent = countByLabel(warm.t);
  });

  try { lang = localStorage.getItem(LKEY) || "mn"; } catch (e) { lang = "mn"; }
  if (lang !== "en" && lang !== "mn") lang = "mn";
  applyLang();
  (function boot() {
    var s = window.MLT && window.MLT.get();
    if (s && (s.courses || []).indexOf("Multi") >= 0) { enter(s.name, s.token); return; }
    window.MLT.prefill($("m-in-name"), $("m-in-code"));
    show("m-login");
  })();
})();
