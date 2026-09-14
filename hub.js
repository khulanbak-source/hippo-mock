/* My Little Test · library hub.
   One login, then a tile per subject the child is enrolled in. Subjects the row
   does not carry are shown locked rather than hidden, so a parent can see what
   else exists. Adding a subject later is one entry in SUBJECTS. */
(function () {
  "use strict";

  // The whole library. `course` is the Notion Users -> Course option that unlocks it.
  // Set `soon: true` for something announced but not built yet; it needs no course.
  var SUBJECTS = [
    { id: "hippo", course: "Hippo", href: "/hippo", emoji: "🦛",
      mn: { title: "Hippo олимпиад", sub: "Англи хэлний шалгалт" },
      en: { title: "Hippo Olympiad", sub: "English practice exams" } },
    { id: "math", course: "Multi", href: "/math", emoji: "🧮",
      mn: { title: "Үржихүйн хүрд", sub: "Өдөрт хэдхэн минут" },
      en: { title: "Times Tables", sub: "A few minutes a day" } }
  ];

  var I18N = {
    mn: {
      loginSub: "Нэр, кодоо оруулаарай.",
      lblName: "Нэр", lblCode: "Код",
      phName: "Нэрээ бичнэ үү", phCode: "6 оронтой тоо",
      btnLogin: "Нэвтрэх", checking: "Шалгаж байна…",
      btnLogout: "Гарах",
      hiName: "Сайн уу, {0}! 👋",
      pickSub: "Юу сурахаа сонгоорой.",
      locked: "Нээгдээгүй",
      soon: "Удахгүй",
      lockedNote: "Түгжээтэй хичээлийг нээлгэхийг хүсвэл багштайгаа холбогдоорой.",
      errInput: "Нэр, кодоо бичээрэй.",
      errWrong: "Нэр эсвэл код буруу байна. Дахин оролдоорой.",
      errDevice: "Энэ кодыг хоёр төхөөрөмж дээр аль хэдийн ашигласан байна. Админд хандаарай.",
      errNet: "Интернэт алга. Холболтоо шалгаарай.",
      errSetup: "Нэвтрэх тохиргоо хийгдээгүй байна. Админд хандаарай.",
      disclaimer: "Бие даасан дасгалын материал. Аль ч албан ёсны шалгалт, түүнийг зохион байгуулагчтай хамааралгүй.",
      other: "EN"
    },
    en: {
      loginSub: "Type your name and passcode.",
      lblName: "Your name", lblCode: "Passcode",
      phName: "Type your name", phCode: "6 digits",
      btnLogin: "Log in", checking: "Checking…",
      btnLogout: "Log out",
      hiName: "Hi {0}! 👋",
      pickSub: "Pick what you want to practise.",
      locked: "Locked",
      soon: "Coming soon",
      lockedNote: "Ask your teacher to unlock a subject you do not have yet.",
      errInput: "Type your name and passcode.",
      errWrong: "Wrong name or passcode. Try again.",
      errDevice: "This code is already used on 2 devices. Ask the admin to reset it.",
      errNet: "No internet. Check your connection.",
      errSetup: "Login is not set up yet. Ask the admin to set it up.",
      disclaimer: "Independent practice material. Not affiliated with, endorsed by, or associated with any official exam or its organisers.",
      other: "МН"
    }
  };

  var LKEY = "mlt_lang", lang = "mn";
  function $(id) { return document.getElementById(id); }
  function t(k) {
    var s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k, i;
    for (i = 1; i < arguments.length; i++) s = s.replace("{" + (i - 1) + "}", arguments[i]);
    return s;
  }
  function show(id) {
    ["h-login", "h-library"].forEach(function (s) { $(s).classList.toggle("active", s === id); });
    window.scrollTo(0, 0);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $("btn-lang").textContent = t("other");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    $("h-name").placeholder = t("phName");
    $("h-code").placeholder = t("phCode");
  }

  function renderLibrary() {
    var s = window.MLT.get();
    if (!s) { show("h-login"); return; }
    $("h-hi").textContent = t("hiName", s.name);

    var courses = s.courses || [], anyLocked = false;
    $("h-tiles").innerHTML = SUBJECTS.map(function (sub) {
      var copy = sub[lang] || sub.en;
      if (sub.soon) {
        return '<div class="tile soon"><span class="tile-emoji">' + sub.emoji + '</span>' +
          '<span class="tile-title">' + esc(copy.title) + '</span>' +
          '<span class="tile-sub">' + esc(copy.sub) + '</span>' +
          '<span class="lock">' + t("soon") + "</span></div>";
      }
      var open = courses.indexOf(sub.course) >= 0;
      if (!open) anyLocked = true;
      var inner = '<span class="tile-emoji">' + sub.emoji + '</span>' +
        '<span class="tile-title">' + esc(copy.title) + '</span>' +
        '<span class="tile-sub">' + esc(copy.sub) + '</span>' +
        (open ? "" : '<span class="lock">🔒 ' + t("locked") + "</span>");
      return open
        ? '<a class="tile" href="' + sub.href + '">' + inner + "</a>"
        : '<div class="tile locked">' + inner + "</div>";
    }).join("");

    $("h-locked-note").textContent = anyLocked ? t("lockedNote") : "";
    show("h-library");
  }

  function loginErr(reason) {
    if (reason === "notconfigured") return t("errSetup");
    if (reason === "otherdevice") return t("errDevice");
    if (reason === "network") return t("errNet");
    return t("errWrong");
  }

  $("h-login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("h-name").value.trim(), code = $("h-code").value.trim(), msg = $("h-msg");
    if (!name || !code) { msg.className = "form-msg err"; msg.textContent = t("errInput"); return; }
    var btn = $("h-btn-login");
    btn.disabled = true; btn.textContent = t("checking");
    msg.className = "form-msg"; msg.textContent = "";
    // No course is requested here: the hub lets any valid user in, then the tiles
    // show what their row actually carries.
    window.MLT.login(name, code, "").then(function (res) {
      btn.disabled = false; btn.textContent = t("btnLogin");
      if (res && res.ok && res.token) {
        window.MLT.save(res, name);
        $("h-code").value = "";
        renderLibrary();
      } else {
        msg.className = "form-msg err";
        msg.textContent = loginErr(res && res.reason);
      }
    });
  });

  $("h-logout").addEventListener("click", function () {
    window.MLT.clear();
    $("h-code").value = ""; $("h-msg").textContent = "";
    show("h-login");
  });

  $("btn-lang").addEventListener("click", function () {
    lang = (lang === "mn") ? "en" : "mn";
    try { localStorage.setItem(LKEY, lang); } catch (e) {}
    applyLang();
    if ($("h-library").classList.contains("active")) renderLibrary();
  });

  try { lang = localStorage.getItem(LKEY) || localStorage.getItem("mlt_math_lang") || "mn"; } catch (e) {}
  if (lang !== "en" && lang !== "mn") lang = "mn";
  applyLang();
  if (window.MLT.get()) renderLibrary(); else show("h-login");
})();
