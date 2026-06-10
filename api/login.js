// Vercel serverless function: validate Name + Code against the Notion "Users" database,
// with DEVICE-LOCK — a code binds to the first device that uses it.
//
// Requires env var NOTION_TOKEN (a Notion internal integration secret with READ + UPDATE
// content access to the Hippo page). Optional NOTION_DB_ID (defaults to the Users DB).
//
// To move a child to a new device: clear the "Device" cell in their Notion row.

const NOTION_DB_ID = process.env.NOTION_DB_ID || "37b5bc947e198011a3c5e3553b795f52";
const NOTION_VERSION = "2022-06-28";

function normName(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}
function readRichText(prop) {
  const arr = (prop && prop.rich_text) || [];
  return arr.map((t) => t.plain_text).join("").trim();
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
    const boundDevice = readRichText((page.properties || {}).Device);

    // ---- device-lock ----
    if (!device) {
      // client sent no device id (old client) — allow without locking
      res.status(200).json({ ok: true, name: matchedName });
      return;
    }
    if (boundDevice && boundDevice !== device) {
      res.status(200).json({ ok: false, reason: "otherdevice" });
      return;
    }
    if (!boundDevice) {
      // claim this device for the code (best-effort; needs "Update content" capability)
      try {
        const up = await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
          method: "PATCH",
          headers: H,
          body: JSON.stringify({
            properties: { Device: { rich_text: [{ type: "text", text: { content: device } }] } },
          }),
        });
        if (!up.ok) console.error("Notion device-claim failed", up.status, await up.text().catch(() => ""));
      } catch (e) {
        console.error("device-claim error", e);
      }
    }
    res.status(200).json({ ok: true, name: matchedName });
  } catch (err) {
    console.error("login handler error", err);
    res.status(200).json({ ok: false, reason: "server" });
  }
};
