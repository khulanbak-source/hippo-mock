// Vercel serverless function: validate Name + Code against the Notion "Users" database,
// with DEVICE-LOCK — a code may be used on up to TWO devices (Device + "Device 2" slots).
//
// Requires env var NOTION_TOKEN (a Notion internal integration secret with READ + UPDATE
// content access to the Hippo page). Optional NOTION_DB_ID (defaults to the Users DB).
//
// To free a slot / move a child to a new device: clear the "Device" or "Device 2" cell.

const { sign } = require("./_lib/auth");

const NOTION_DB_ID = process.env.NOTION_DB_ID || "37b5bc947e198011a3c5e3553b795f52";
const NOTION_VERSION = "2022-06-28";

function okToken(name, device, batch, category, courses) {
  return sign({ n: name, d: device || "", b: batch || 1, c: category || "Little Hippo",
                k: courses || ["Hippo"] }); // 4h token
}

function normName(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}
function readRichText(prop) {
  const arr = (prop && prop.rich_text) || [];
  return arr.map((t) => t.plain_text).join("").trim();
}
function readMultiSelect(prop) {
  const arr = (prop && prop.multi_select) || [];
  return arr.map((o) => o.name).filter(Boolean);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "method" });
    return;
  }
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    res.status(200).json({ ok: false, reason: "notconfigured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const name = (body && body.name ? body.name : "").toString().trim();
  const codeRaw = (body && body.code != null ? body.code : "").toString().trim();
  const device = (body && body.device ? body.device : "").toString().trim().slice(0, 60);
  // Which course the client is asking for ("Multi" from the times-tables app). The exam
  // client sends nothing, so it keeps its existing behaviour untouched.
  const wantCourse = (body && body.course ? body.course : "").toString().trim().slice(0, 20);
  const codeNum = Number(codeRaw.replace(/\D/g, ""));

  if (!name || !codeRaw || Number.isNaN(codeNum)) {
    res.status(200).json({ ok: false, reason: "input" });
    return;
  }

  const H = {
    "Authorization": `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ filter: { property: "Codes", number: { equals: codeNum } } }),
    });
    if (!r.ok) {
      console.error("Notion query error", r.status, await r.text().catch(() => ""));
      res.status(200).json({ ok: false, reason: "notion" });
      return;
    }

    const data = await r.json();
    const want = normName(name);
    let page = null;
    for (const p of data.results || []) {
      const titleArr = (((p.properties || {}).Name || {}).title) || [];
      if (normName(titleArr.map((t) => t.plain_text).join("")) === want) { page = p; break; }
    }
    if (!page) { res.status(200).json({ ok: false, reason: "nomatch" }); return; }

    const matchedName = (((page.properties || {}).Name || {}).title || []).map((t) => t.plain_text).join("");
    const device1 = readRichText((page.properties || {}).Device);
    const device2 = readRichText((page.properties || {})["Device 2"]);
    const unlockedBatch = ((((page.properties || {})["Batch 2"]) || {}).checkbox === true) ? 2 : 1;
    const category = ((((page.properties || {}).Category) || {}).select || {}).name || "Little Hippo";
    // A row with no Course set is treated as Hippo-only, so existing users keep exam
    // access without anyone having to backfill the column.
    const coursesRaw = readMultiSelect((page.properties || {}).Course);
    const courses = coursesRaw.length ? coursesRaw : ["Hippo"];

    // Refuse before claiming a device slot, so a kid who is not enrolled in the course
    // does not burn one of their two devices on a login that was going to fail anyway.
    if (wantCourse && courses.indexOf(wantCourse) < 0) {
      res.status(200).json({ ok: false, reason: "nocourse" });
      return;
    }

    async function claim(propName) {
      // best-effort write into a free device slot (needs "Update content" capability)
      try {
        const props = {};
        props[propName] = { rich_text: [{ type: "text", text: { content: device } }] };
        const up = await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
          method: "PATCH", headers: H, body: JSON.stringify({ properties: props }),
        });
        if (!up.ok) console.error("Notion device-claim failed", up.status, await up.text().catch(() => ""));
      } catch (e) { console.error("device-claim error", e); }
    }

    // ---- device-lock (max 2 devices per code) ----
    if (!device) {
      // client sent no device id (old client) — allow without locking
      res.status(200).json({ ok: true, name: matchedName, courses: courses,
        token: okToken(matchedName, "", unlockedBatch, category, courses) });
      return;
    }
    if (device !== device1 && device !== device2) {
      // new device: take a free slot, or refuse if both are already used
      if (!device1) { await claim("Device"); }
      else if (!device2) { await claim("Device 2"); }
      else { res.status(200).json({ ok: false, reason: "otherdevice" }); return; }
    }
    res.status(200).json({ ok: true, name: matchedName, courses: courses,
      token: okToken(matchedName, device, unlockedBatch, category, courses) });
  } catch (err) {
    console.error("login handler error", err);
    res.status(200).json({ ok: false, reason: "server" });
  }
};
