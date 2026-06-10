# Hippo Mock Exam 🦛

Interactive, timed practice exams for the **Hippo English Olympiad — Little Hippo, Continental Round**.
Live at **hippomock.urstory.studio**.

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

## Editing the questions / adding 10 more exams
All content is generated into `data.js` by `build_data.py`:
- **Crosswords**: edit the `THEMES` list in `build_data.py` (word + clue).
- **Use of English**: edit `content/uoe_1_5.json` and `content/uoe_6_10.json`
  (10 tests × 30 items; each item `{ "q": "...____...", "answers": ["..."], "skill": "..." }`).
  Put a `(clue)` in brackets at the end of `q` to force a single answer. `answers` accepts every
  correct variant (no negative marking).

Then rebuild and deploy:
```bash
python3 build_data.py     # regenerates data.js (validates 10×30 + crosswords)
git add -A && git commit -m "content: refresh exams" && git push
```
Vercel auto-deploys on push.

## Local dev
```bash
python3 build_data.py
python3 -m http.server 8000      # then open http://localhost:8000/?dev=1  (skips login for UI testing)
# For real login testing: `vercel dev` with NOTION_TOKEN in .env.local
```

## Files
| Path | What |
|------|------|
| `index.html` / `styles.css` / `app.js` | the app (no build step) |
| `data.js` | generated exam content (do not hand-edit) |
| `build_data.py` | crossword generator + content assembler |
| `content/uoe_*.json` | the 10 Use-of-English tests (source of truth) |
| `api/login.js` | Notion name+passcode check |
| `docs/SPEC.md` | design + exam-format notes |
