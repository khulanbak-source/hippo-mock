# Hippo Mock Exam 🦛

Interactive, timed practice exams for the **Hippo English Olympiad — Little Hippo, Continental Round**.
Live at **mylittletest.urstory.studio**.

Each exam = **1 crossword + 30 open-ended "Use of English" questions**, matching the real
Continental round. 40-minute timer. Pass mark **75%** (average of the two sections, no negative
marking). 10 exams, shuffled; progress is saved on the device.

## How a kid uses it
1. Open the site → type **name + passcode** → Log in.
2. Tap **Start exam** → the 40-minute timer begins.
3. Do the crossword (tap a clue, type the letters) and the 30 fill-in questions.
4. Tap **Finish** (or let the timer run out).
5. **75%+** → a **See result** button appears. Below 75% → score shows with **Try again**.

## How login works
Names + passcodes live in the Notion **"Users"** database (page: *Hippo*). The serverless
function `api/login.js` checks them live, so you manage kids entirely in Notion — add a row,
they can log in. No redeploy needed.

### One-time setup (do this once)
1. **Create a Notion integration** → https://www.notion.so/my-integrations → *New integration*
   (internal). Copy its secret.
2. **Share the Hippo page with it**: open the *Hippo* page in Notion → **•••** → *Connections* →
   add your integration. (This grants the token access to the Users database.)
3. **Add the token to Vercel**: Project → Settings → Environment Variables →
   `NOTION_TOKEN = <the secret>` (Production + Preview). Redeploy.
4. Done. The Users DB already has the columns **Name** (title) and **Codes** (number).

Until `NOTION_TOKEN` is set, login shows *"Login is not set up yet."*

### Device-lock (one code = up to two devices)
Each passcode may be used on **up to 2 devices**. The first two devices to log in are recorded in
the `Device` and `Device 2` columns of the Users DB; a third, different device is refused with
*"This code is already used on 2 devices."* This stops a code being shared around a class while
still letting a kid use, say, an iPad and a phone.

- **Free a slot / move a child to a new device:** open their row in the Notion Users DB and
  **clear the `Device` or `Device 2` cell**. The next device to log in takes the freed slot.
- The integration needs **"Update content"** capability for the slots to be written (Notion →
  *My integrations* → your integration → Capabilities). Without it, login still works but the
  lock is not enforced.

## Editing the questions / adding 10 more exams
All content is generated into `data.js` by `build_data.py`:
- **Crosswords**: edit the `THEMES` list in `build_data.py` (word + clue).
- **Use of English**: edit `content/uoe_1_5.json` and `content/uoe_6_10.json`
  (10 tests × 30 items; each item `{ "q": "...____...", "answers": ["..."], "skill": "..." }`).
  Put a `(clue)` in brackets at the end of `q` to force a single answer. `answers` accepts every
  correct variant (no negative marking).

Then rebuild and deploy:
```bash
python3 build_data.py     # regenerates api/_lib/exams.json (validates 10×30 + crosswords)
git add -A && git commit -m "content: refresh exams" && git push
```
Vercel auto-deploys on push.

## Content is gated (important for selling)
Exam questions and answers are **not** shipped to the browser. They live in
`api/_lib/exams.json`, which is bundled only inside the serverless functions (the `_lib`
folder is never a route and never statically served). On login the user gets a signed,
4-hour session token; only that token can:
- `POST /api/exam` → fetch one exam **with answers stripped out**, and
- `POST /api/grade` → have answers checked **server-side** (the answer key never leaves the server).

`.vercelignore` also keeps `*.py`, `content/`, and `docs/` out of the deployment, so the
source files (which contain answers) are never downloadable.

## Local dev
```bash
python3 build_data.py            # regenerates api/_lib/exams.json
vercel dev                       # runs the static app + /api functions locally
# needs NOTION_TOKEN (and optionally SESSION_SECRET) in .env.local
```

## Files
| Path | What |
|------|------|
| `index.html` / `styles.css` / `app.js` | the app (no build step); fetches exams + grading from the API |
| `api/login.js` | Notion name+passcode check, device-lock, issues session token |
| `api/exam.js` | gated exam delivery (answers stripped) |
| `api/grade.js` | gated server-side grading |
| `api/_lib/auth.js` | session-token sign/verify |
| `api/_lib/exams.json` | generated exam content **with** answers (function-only, never served) |
| `build_data.py` | crossword generator + content assembler |
| `content/uoe_*.json` | the 10 Use-of-English tests (source of truth, not deployed) |
| `docs/SPEC.md` | design + exam-format notes |
