// Signed session tokens (HMAC-SHA256). Keeps exam content + answers server-side:
// only a client that logged in successfully gets a token, and only a valid token
// can fetch an exam or have answers graded.
//
// Secret: SESSION_SECRET if set, else reuse NOTION_TOKEN (already server-only).
const crypto = require("crypto");

function secret() {
  return process.env.SESSION_SECRET || process.env.NOTION_TOKEN || "insecure-dev-secret";
}
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToStr(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64").toString("utf8");
}

function sign(payload, ttlSeconds) {
  var body = Object.assign({}, payload, { exp: Math.floor(Date.now() / 1000) + (ttlSeconds || 14400) });
  var b = b64url(JSON.stringify(body));
  var sig = b64url(crypto.createHmac("sha256", secret()).update(b).digest());
  return b + "." + sig;
}

function verify(token) {
  if (!token || typeof token !== "string" || token.indexOf(".") < 0) return null;
  var parts = token.split(".");
  if (parts.length !== 2) return null;
  var expect = b64url(crypto.createHmac("sha256", secret()).update(parts[0]).digest());
  if (parts[1].length !== expect.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expect))) return null;
  } catch (e) { return null; }
  var payload;
  try { payload = JSON.parse(b64urlToStr(parts[0])); } catch (e) { return null; }
  if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

module.exports = { sign, verify };
