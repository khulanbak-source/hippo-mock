/* My Little Test · library hub.
   The homepage is PUBLIC: anyone can see every subject on offer, which is what
   makes it a shop window. Tapping a tile takes you to that subject, which asks
   for the passcode itself. Signing in first would hide the catalogue behind a
   login and lose the chance to show a visitor what else exists.

   Once a child is signed in, the same page greets them and marks the subjects
   their passcode does not carry, so a parent can see what to ask for.
   Adding a subject later is one entry in SUBJECTS. */
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
      tagline: "Хүүхдэд зориулсан дасгалын цуглуулга. Юу сурахаа сонгоорой.",
      hiName: "Сайн уу, {0}! 👋 Юу сурахаа сонгоорой.",
      btnLogout: "Гарах",
      locked: "Нээгдээгүй",
      soon: "Удахгүй",
      noteGuest: "Хичээлээ сонгоод кодоороо нэвтэрнэ үү.",
      noteLocked: "Түгжээтэй хичээлийг нээлгэхийг хүсвэл багштайгаа холбогдоорой.",
      disclaimer: "Бие даасан дасгалын материал. Аль ч албан ёсны шалгалт, түүнийг зохион байгуулагчтай хамааралгүй.",
      other: "EN"
    },
    en: {
      tagline: "A little library of practice for young learners. Pick what to work on.",
      hiName: "Hi {0}! 👋 Pick what you want to practise.",
      btnLogout: "Log out",
      locked: "Locked",
      soon: "Coming soon",
      noteGuest: "Pick a subject, then sign in with your passcode.",
      noteLocked: "Ask your teacher to unlock a subject you do not have yet.",
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
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function tileInner(sub, copy, badge) {
    return '<span class="tile-emoji">' + sub.emoji + '</span>' +
      '<span class="tile-title">' + esc(copy.title) + '</span>' +
      '<span class="tile-sub">' + esc(copy.sub) + '</span>' +
      (badge ? '<span class="lock">' + badge + "</span>" : "");
  }

  function render() {
    var s = window.MLT.get();                 // null when nobody is signed in
    var courses = s ? (s.courses || []) : null;
    var anyLocked = false;

    $("h-tagline").textContent = s ? t("hiName", s.name) : t("tagline");
    $("h-logout").classList.toggle("hidden", !s);

    $("h-tiles").innerHTML = SUBJECTS.map(function (sub) {
      var copy = sub[lang] || sub.en;
      if (sub.soon) return '<div class="tile soon">' + tileInner(sub, copy, t("soon")) + "</div>";

      // Signed out, every subject is browsable and leads to its own login.
      if (!courses) return '<a class="tile" href="' + sub.href + '">' + tileInner(sub, copy, "") + "</a>";

      var open = courses.indexOf(sub.course) >= 0;
      if (!open) anyLocked = true;
      return open
        ? '<a class="tile" href="' + sub.href + '">' + tileInner(sub, copy, "") + "</a>"
        : '<div class="tile locked">' + tileInner(sub, copy, "🔒 " + t("locked")) + "</div>";
    }).join("");

    $("h-note").textContent = !s ? t("noteGuest") : (anyLocked ? t("noteLocked") : "");
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $("btn-lang").textContent = t("other");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    render();
  }

  $("h-logout").addEventListener("click", function () { window.MLT.clear(); render(); });
  $("btn-lang").addEventListener("click", function () {
    lang = (lang === "mn") ? "en" : "mn";
    try { localStorage.setItem(LKEY, lang); } catch (e) {}
    applyLang();
  });

  try { lang = localStorage.getItem(LKEY) || localStorage.getItem("mlt_math_lang") || "mn"; } catch (e) {}
  if (lang !== "en" && lang !== "mn") lang = "mn";
  applyLang();
})();
