/* Times Tables / Үржихүйн хүрд · My Little Test
   A daily 5-minute loop: skip-count warm-up -> 10 quick-fire questions -> mastery grid.
   Facts are stored commutatively (3x4 and 4x3 are one fact) and scheduled with a
   Leitner box system, so only the facts he actually misses come back often.
   All progress lives in localStorage on the device. No login, no network.
   Bilingual: Mongolian by default, English via the toggle. */
(function () {
  "use strict";

  var KEY = "mlt_math_v1", LKEY = "mlt_math_lang";
  var ORDER = [2, 5, 10, 1, 4, 3, 6, 9, 8, 7];   // easiest-first mastery ladder
  var BOX_MS = [0, 10 * 6e4, 864e5, 3 * 864e5, 7 * 864e5, 21 * 864e5];
  var STRONG = 3, TOP = 5, FAST_MS = 5000, QN = 10, NEW_PER_SESSION = 4;
  var TOTAL_FACTS = 55;                           // 1..10 x 1..10, commutative

  // Mongolian case endings for digits. A digit written as a numeral still takes the
  // suffix of the word it is read as, so these cannot be generated, only listed.
  // Genitive: 2 -> хоёрын -> 2-ын.  Instrumental: 2 -> хоёроор -> 2-оор.
  var GEN = { 1: "1-ийн", 2: "2-ын", 3: "3-ын", 4: "4-ийн", 5: "5-ын",
              6: "6-гийн", 7: "7-гийн", 8: "8-ын", 9: "9-ийн", 10: "10-ын" };
  var INS = { 1: "1-ээр", 2: "2-оор", 3: "3-аар", 4: "4-өөр", 5: "5-аар",
              6: "6-гаар", 7: "7-гоор", 8: "8-аар", 9: "9-өөр", 10: "10-аар" };

  var I18N = {
    mn: {
      docTitle: "Үржихүйн хүрд · My Little Test",
      appTitle: "Үржихүйн хүрд",
      tagline: "Өдөрт хэдхэн минут. Тэгээд л болоо.",
      taglineStreak: "{0} өдөр дараалан хичээллэлээ. Ингээд үргэлжлүүлээрэй!",
      lblStreak: "өдөр дараалан", lblMastered: "цээжилсэн", lblTotal: "нийт жишээ",
      learningNow: "Одоо сурч байгаа",
      tableName: "{0} хүрд",              // {0} = genitive digit, e.g. 2-ын
      learned: "Сурсан: {0}/{1}",
      allTables: "🏆 Бүх хүрд!",
      allTablesTip: "Одоо хурдан болтол нь давтаарай.",
      btnStart: "Дасгалаа эхлэх",
      btnProgress: "Ахицаа харах",
      backSite: "← My Little Test руу буцах",
      chipWarm: "Бэлтгэл",
      countBy: "{0} тоол",                // {0} = instrumental digit, e.g. 2-оор
      warmHint: "Дутуу тоог нөхөөрэй.",
      btnHint: "Үзүүлээч 👀",
      okFast: "Зөв! ⚡", okSlow: "Зөв байна! ✅",
      wrong: "{0} × {1} = {2}. Хамтдаа тоолъё.",
      doneOk: "Сайн байна!", donePerfect: "Алдаагүй!",
      doneLine: "✅ Шууд зөв: {0}/{1}",
      doneRetry: "🔁 Дахиж давтах: {0}",
      doneStreak: "🔥 {0} өдөр дараалан",
      unlock: "🎊 {0} хүрдийг дуусгалаа! Дараагийнх нь {1} хүрд.",
      tipTricky: "Дасгал хэрэгтэй: {0}. Маргааш дахиад тааралдана.",
      tipClean: "Өнөөдрийн жишээгээ сайн цээжиллээ. Маргааш бас ирээрэй!",
      btnAgain: "Дахиад хийх", btnDoneToday: "Өнөөдөрт болоо",
      progTitle: "Миний ахиц",
      legNew: "шинэ", legLearning: "сурч байна", legStrong: "сайн", legMastered: "цээжилсэн",
      trickyTitle: "Одоо хэцүү байгаа нь",
      noneTricky: "Хэцүү жишээ алга. 🎈",
      btnBack: "← Буцах", btnReset: "Бүх ахицыг устгах",
      confirmReset: "Энэ төхөөрөмж дээрх бүх ахицыг устгах уу?",
      other: "EN"
    },
    en: {
      docTitle: "Times Tables · My Little Test",
      appTitle: "Times Tables",
      tagline: "A few minutes a day. That is all it takes.",
      taglineStreak: "You have practised {0} days in a row. Keep it going!",
      lblStreak: "day streak", lblMastered: "mastered", lblTotal: "facts in all",
      learningNow: "Learning now",
      tableName: "{0} × table",
      learned: "Learned: {0}/{1}",
      allTables: "🏆 All tables!",
      allTablesTip: "Keep practising to make them lightning fast.",
      btnStart: "Start today's practice",
      btnProgress: "See my progress grid",
      backSite: "← Back to My Little Test",
      chipWarm: "Warm up",
      countBy: "Count by {0}",
      warmHint: "Fill in the missing numbers.",
      btnHint: "Show me 👀",
      okFast: "Yes! ⚡", okSlow: "That's right! ✅",
      wrong: "{0} × {1} = {2}. Count them with me.",
      doneOk: "Nice work!", donePerfect: "Perfect round!",
      doneLine: "✅ First try: {0}/{1}",
      doneRetry: "🔁 To practise: {0}",
      doneStreak: "🔥 {0} day streak",
      unlock: "🎊 You finished the {0} × table! Next up: the {1} × table.",
      tipTricky: "Still tricky: {0}. They will come back tomorrow.",
      tipClean: "Everything you saw today is sticking. Come back tomorrow!",
      btnAgain: "Practise again", btnDoneToday: "Done for today",
      progTitle: "My progress",
      legNew: "new", legLearning: "learning", legStrong: "strong", legMastered: "mastered",
      trickyTitle: "Tricky ones right now",
      noneTricky: "Nothing tricky right now. 🎈",
      btnBack: "← Back", btnReset: "Reset all progress",
      confirmReset: "Erase all multiplication progress on this device?",
      other: "МН"
    }
  };

  var lang = "mn", S = null, sess = null, warm = null, padMode = "", buf = "";

  function t(k) {
    var s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k, i;
    for (i = 1; i < arguments.length; i++) s = s.replace("{" + (i - 1) + "}", arguments[i]);
    return s;
  }
  function tableLabel(n) { return t("tableName", lang === "mn" ? GEN[n] : n); }
  function countByLabel(n) { return t("countBy", lang === "mn" ? INS[n] : n); }

  function $(id) { return document.getElementById(id); }
  function show(id) {
    ["m-home", "m-warmup", "m-quiz", "m-done", "m-progress"].forEach(function (s) {
      $(s).classList.toggle("active", s === id);
    });
    window.scrollTo(0, 0);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t2 = a[i]; a[i] = a[j]; a[j] = t2; } return a; }
  function dayStr(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  // ================================================================= LANGUAGE
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t("docTitle");
    $("btn-lang").textContent = t("other");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LKEY, l); } catch (e) {}
    applyLang();
  }

  // ================================================================= STORE
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
    if (!S || !S.facts) S = { v: 1, facts: {}, tableIdx: 0, streak: 0, lastDay: "", sessions: 0 };
    syncTable();
    return S;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function fk(a, b) { return Math.min(a, b) + "x" + Math.max(a, b); }
  function fact(k) { return S.facts[k] || (S.facts[k] = { box: 0, due: 0, seen: 0, wrong: 0 }); }
  function box(k) { return S.facts[k] ? S.facts[k].box : 0; }
  function tableFacts(t2) { var o = [], b; for (b = 1; b <= 10; b++) o.push(fk(t2, b)); return o; }
  function tableDone(t2) { return tableFacts(t2).every(function (k) { return box(k) >= STRONG; }); }
  function curTable() { return ORDER[Math.min(S.tableIdx, ORDER.length - 1)]; }
  function allDone() { return ORDER.every(tableDone); }
  function syncTable() {
    while (S.tableIdx < ORDER.length - 1 && tableDone(ORDER[S.tableIdx])) S.tableIdx++;
  }
  function unlockedFacts() {
    var seen = {};
    ORDER.slice(0, S.tableIdx + 1).forEach(function (t2) { tableFacts(t2).forEach(function (k) { seen[k] = 1; }); });
    return Object.keys(seen);
  }
  function masteredCount() {
    return Object.keys(S.facts).filter(function (k) { return S.facts[k].box >= TOP; }).length;
  }
  function tableProgress(t2) {
    // "done" drives unlocking; the bar uses part-marks so a good session always moves it,
    // even though a fact needs spaced repeats across days to count as learned.
    var f = tableFacts(t2), n = 0, pts = 0;
    f.forEach(function (k) { var b = Math.min(box(k), STRONG); pts += b; if (b >= STRONG) n++; });
    return { done: n, total: f.length, pct: Math.round(pts / (f.length * STRONG) * 100) };
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

  // ================================================================= HOME
  function renderHome() {
    var t2 = curTable(), p = tableProgress(t2);
    $("stat-streak").textContent = S.streak;
    $("stat-mastered").textContent = masteredCount();
    $("stat-total").textContent = TOTAL_FACTS;
    if (allDone()) {
      $("home-table").textContent = t("allTables");
      $("home-tabletxt").textContent = t("allTablesTip");
      $("home-tablebar").style.width = "100%";
    } else {
      $("home-table").textContent = tableLabel(t2);
      $("home-tabletxt").textContent = t("learned", p.done, p.total);
      $("home-tablebar").style.width = p.pct + "%";
    }
    $("home-sub").textContent = S.streak > 0 ? t("taglineStreak", S.streak) : t("tagline");
    show("m-home");
  }

  // ================================================================= WARM UP
  function startWarmup() {
    var t2 = curTable(), seq = [], i;
    for (i = 1; i <= 10; i++) seq.push(t2 * i);
    var slots = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort(function (a, b) { return a - b; });
    warm = { t: t2, seq: seq, blanks: slots, at: 0 };
    $("warm-title").textContent = countByLabel(t2);
    buf = ""; padMode = "warm";
    renderLadder();
    show("m-warmup");
  }
  function renderLadder() {
    var h = "";
    warm.seq.forEach(function (n, i) {
      var bi = warm.blanks.indexOf(i);
      if (bi < 0) h += '<div class="rung">' + n + "</div>";
      else if (bi < warm.at) h += '<div class="rung filled">' + n + "</div>";
      else if (bi === warm.at) h += '<div class="rung blank on">' + (buf || "?") + "</div>";
      else h += '<div class="rung blank">?</div>';
    });
    $("warm-ladder").innerHTML = h;
    $("warm-display").textContent = buf || "?";
    $("warm-display").classList.toggle("empty", !buf);
  }
  function warmSubmit() {
    if (!buf) return;
    var want = warm.seq[warm.blanks[warm.at]];
    if (parseInt(buf, 10) === want) {
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
  function buildQueue() {
    var now = Date.now(), t2 = curTable(), keys = unlockedFacts(), q = [];
    var fresh = tableFacts(t2).filter(function (k) { return !S.facts[k] || S.facts[k].seen === 0; });
    fresh.slice(0, NEW_PER_SESSION).forEach(function (k) { q.push(k); });
    keys.filter(function (k) { var f = S.facts[k]; return f && f.seen > 0 && f.due <= now; })
      .sort(function (a, b) { return S.facts[a].due - S.facts[b].due; })
      .forEach(function (k) { if (q.length < QN && q.indexOf(k) < 0) q.push(k); });
    if (q.length < QN) {
      keys.filter(function (k) { return q.indexOf(k) < 0; })
        .sort(function (a, b) { return (box(a) - box(b)) || Math.random() - 0.5; })
        .forEach(function (k) { if (q.length < QN) q.push(k); });
    }
    return shuffle(q).map(mkQ);
  }
  function startQuiz() {
    sess = { q: buildQueue(), i: 0, total: QN, right: 0, firstRight: 0, wrong: 0, t0: 0 };
    padMode = "quiz"; buf = "";
    nextQ();
    show("m-quiz");
  }
  function renderDots() {
    var h = "", i, n = sess.total;
    for (i = 0; i < n; i++) h += "<i class='" + (i < sess.right ? "on" : (i === sess.right ? "cur" : "")) + "'></i>";
    $("quiz-dots").innerHTML = h;
  }
  function nextQ() {
    if (sess.i >= sess.q.length) { finish(); return; }
    var q = sess.q[sess.i];
    $("quiz-q").textContent = q.a + " × " + q.b;
    $("quiz-fb").textContent = ""; $("quiz-fb").className = "feedback";
    $("quiz-hint").classList.add("hidden");
    $("btn-hint").classList.remove("hidden");
    buf = ""; paint();
    renderDots();
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
  function quizSubmit() {
    if (!buf) return;
    var q = sess.q[sess.i], ms = Date.now() - sess.t0, ok = parseInt(buf, 10) === q.ans;
    if (ok) {
      if (!q.retry) { grade(q.k, true, ms); sess.firstRight++; }
      sess.right++;
      sndOk();
      $("quiz-fb").className = "feedback ok";
      $("quiz-fb").textContent = ms < FAST_MS ? t("okFast") : t("okSlow");
      save(); sess.i++;
      setTimeout(nextQ, 650);
    } else {
      if (!q.retry) { grade(q.k, false, ms); sess.wrong++; }
      sndNo();
      $("quiz-q").classList.add("shake");
      setTimeout(function () { $("quiz-q").classList.remove("shake"); }, 420);
      $("quiz-fb").className = "feedback err";
      $("quiz-fb").textContent = t("wrong", q.a, q.b, q.ans);
      drawArray(q.a, q.b);
      $("btn-hint").classList.add("hidden");
      if (!q.retry) {
        var again = mkQ(q.k); again.retry = true;
        sess.q.splice(Math.min(sess.i + 3, sess.q.length), 0, again);
      }
      buf = ""; paint();
      save(); sess.i++;
      setTimeout(nextQ, 2600);
    }
  }
  function grade(k, ok, ms) {
    var f = fact(k); f.seen++;
    if (ok) {
      f.box = ms < FAST_MS ? Math.min(f.box + 1, TOP) : Math.max(f.box, 1);
      f.due = Date.now() + BOX_MS[f.box];
    } else { f.wrong++; f.box = 0; f.due = Date.now(); }
  }

  // ================================================================= FINISH
  function touchDay() {
    var now = new Date(), today = dayStr(now), yday = dayStr(new Date(now.getTime() - 864e5));
    if (S.lastDay === today) return;
    S.streak = (S.lastDay === yday) ? S.streak + 1 : 1;
    S.lastDay = today;
  }
  function finish() {
    var before = curTable();
    touchDay(); S.sessions++;
    syncTable(); save();
    var unlocked = curTable() !== before;

    $("done-emoji").textContent = unlocked ? "🏅" : (sess.wrong === 0 ? "🌟" : "🎉");
    $("done-title").textContent = sess.wrong === 0 ? t("donePerfect") : t("doneOk");
    var parts = [t("doneLine", sess.firstRight, sess.total)];
    if (sess.wrong) parts.push(t("doneRetry", sess.wrong));
    parts.push(t("doneStreak", S.streak));
    $("done-line").textContent = parts.join("  ·  ");

    var ub = $("done-unlock");
    if (unlocked) {
      ub.textContent = lang === "mn"
        ? t("unlock", GEN[before], GEN[curTable()])
        : t("unlock", before, curTable());
      ub.classList.remove("hidden"); sndWin();
    } else ub.classList.add("hidden");

    drawGrid($("done-grid"));
    var weak = weakest(3);
    $("done-tip").textContent = weak.length ? t("tipTricky", weak.map(pretty).join(", ")) : t("tipClean");
    show("m-done");
  }
  function pretty(k) { var p = k.split("x"); return p[0] + "×" + p[1]; }
  function weakest(n) {
    return unlockedFacts()
      .filter(function (k) {
        var f = S.facts[k];
        return f && f.seen > 0 && f.box < 2 && (f.wrong > 0 || f.box === 0);
      })
      .sort(function (a, b) { return (box(a) - box(b)) || (S.facts[b].wrong - S.facts[a].wrong); })
      .slice(0, n);
  }

  // ================================================================= GRID
  function drawGrid(el) {
    var h = "<span class='hd'>×</span>", r, c;
    for (c = 1; c <= 10; c++) h += "<span class='hd'>" + c + "</span>";
    for (r = 1; r <= 10; r++) {
      h += "<span class='hd'>" + r + "</span>";
      for (c = 1; c <= 10; c++) h += "<span class='b" + box(fk(r, c)) + "'>" + (r * c) + "</span>";
    }
    el.innerHTML = h;
  }
  function renderProgress() {
    drawGrid($("prog-grid"));
    var w = weakest(12);
    $("prog-weak").innerHTML = w.length
      ? w.map(function (k) { return "<span>" + pretty(k) + "</span>"; }).join("")
      : "<span class='none'>" + t("noneTricky") + "</span>";
    show("m-progress");
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

  $("btn-lang").addEventListener("click", function () {
    setLang(lang === "mn" ? "en" : "mn");
    var active = document.querySelector(".screen.active").id;
    if (active === "m-home") renderHome();
    else if (active === "m-progress") renderProgress();
    else if (active === "m-warmup") { $("warm-title").textContent = countByLabel(warm.t); }
  });
  $("btn-start").addEventListener("click", startWarmup);
  $("btn-progress").addEventListener("click", renderProgress);
  $("btn-prog-back").addEventListener("click", renderHome);
  $("btn-again").addEventListener("click", startWarmup);
  $("btn-home").addEventListener("click", renderHome);
  $("btn-hint").addEventListener("click", function () {
    var q = sess.q[sess.i]; drawArray(q.a, q.b);
  });
  $("btn-reset").addEventListener("click", function () {
    if (!window.confirm(t("confirmReset"))) return;
    localStorage.removeItem(KEY); load(); renderHome();
  });

  try { lang = localStorage.getItem(LKEY) || "mn"; } catch (e) { lang = "mn"; }
  if (lang !== "en" && lang !== "mn") lang = "mn";
  applyLang();
  load();
  renderHome();
})();
