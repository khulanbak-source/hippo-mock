// Vercel serverless function: validate Name + Code against the Notion "Users" database.
// Requires env var NOTION_TOKEN (a Notion internal integration secret with access to the Hippo page).
// Optional env var NOTION_DB_ID (defaults to the known Users database id).

const NOTION_DB_ID = process.env.NOTION_DB_ID || "37b5bc947e198011a3c5e3553b795f52";
const NOTION_VERSION = "2022-06-28";

function normName(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
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
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const name = (body && body.name ? body.name : "").toString().trim();
  const codeRaw = (body && body.code != null ? body.code : "").toString().trim();
  const codeNum = Number(codeRaw.replace(/\D/g, ""));

  if (!name || !codeRaw || Number.isNaN(codeNum)) {
    res.status(200).json({ ok: false, reason: "input" });
    return;
  }

  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filter: { property: "Codes", number: { equals: codeNum } } }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("Notion error", r.status, txt);
      res.status(200).json({ ok: false, reason: "notion" });
      return;
    }

    const data = await r.json();
    const want = normName(name);
    let matched = null;
    for (const page of data.results || []) {
      const titleArr = (((page.properties || {}).Name || {}).title) || [];
      const pageName = titleArr.map((t) => t.plain_text).join("");
      if (normName(pageName) === want) { matched = pageName; break; }
    }

    if (matched) {
      res.status(200).json({ ok: true, name: matched });
    } else {
      res.status(200).json({ ok: false, reason: "nomatch" });
    }
  } catch (err) {
    console.error("login handler error", err);
    res.status(200).json({ ok: false, reason: "server" });
  }
};
