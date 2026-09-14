/* Shared login session across the library pages (/, /hippo, /math).
   The hub logs in once and both apps read the result, so a child does not
   type the passcode again per subject.

   sessionStorage, not localStorage, on purpose: the session dies when the tab
   closes, so it is one login per sitting rather than a login remembered for days.
   The server token is valid for 4h, and we expire our copy on the same clock. */
(function (w) {
  "use strict";
  var KEY = "mlt_session", DEVKEY = "hippo_device", RKEY = "mlt_remember", TTL = 4 * 3600 * 1000;

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

    // "Remember on this device": the name and passcode are kept in localStorage so a
    // child only has to tap Log in. Logging out forgets them again. This is a small
    // plaintext credential on a family device, which is the trade for a daily habit:
    // anyone holding the device can open the apps until someone taps Log out.
    remembered: function () {
      try {
        var r = JSON.parse(localStorage.getItem(RKEY));
        if (r && r.name && r.code) return r;
      } catch (e) {}
      return null;
    },
    remember: function (name, code) {
      try { localStorage.setItem(RKEY, JSON.stringify({ name: name, code: code })); } catch (e) {}
    },
    forget: function () { try { localStorage.removeItem(RKEY); } catch (e) {} },

    // Prefill a login form from what this device remembers. Returns true if it filled in.
    prefill: function (nameEl, codeEl) {
      var r = this.remembered();
      if (!r || !nameEl || !codeEl) return false;
      nameEl.value = r.name; codeEl.value = r.code;
      return true;
    },
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
