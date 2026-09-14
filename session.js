/* Shared login session across the library pages (/, /hippo, /math).
   The hub logs in once and both apps read the result, so a child does not
   type the passcode again per subject.

   sessionStorage, not localStorage, on purpose: the session dies when the tab
   closes, so it is one login per sitting rather than a login remembered for days.
   The server token is valid for 4h, and we expire our copy on the same clock. */
(function (w) {
  "use strict";
  var KEY = "mlt_session", DEVKEY = "hippo_device", TTL = 4 * 3600 * 1000;

  function read() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY));
      if (s && s.token && s.exp > Date.now()) return s;
    } catch (e) {}
    return null;
  }

  w.MLT = {
    get: read,
    save: function (res, fallbackName) {
      var s = {
        token: res.token,
        name: res.name || fallbackName || "",
        courses: res.courses || [],
        exp: Date.now() + TTL
      };
      try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      return s;
    },
    clear: function () { try { sessionStorage.removeItem(KEY); } catch (e) {} },
    has: function (course) {
      var s = read();
      return !!s && (s.courses || []).indexOf(course) >= 0;
    },
    // One device id for the whole library, so using two subjects costs one device slot.
    device: function () {
      var v = localStorage.getItem(DEVKEY);
      if (!v) {
        v = (w.crypto && w.crypto.randomUUID) ? w.crypto.randomUUID()
          : "d" + Date.now().toString(36) + Math.random().toString(36).slice(2);
        localStorage.setItem(DEVKEY, v);
      }
      return v;
    },
    login: function (name, code, course) {
      return fetch("/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, code: code, device: this.device(), course: course })
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, reason: "parse" }; }); })
        .catch(function () { return { ok: false, reason: "network" }; });
    }
  };
})(window);
