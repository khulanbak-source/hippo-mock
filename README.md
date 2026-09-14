# My Little Test 🎒

A small, growing library of practice apps for young learners.
Live at **mylittletest.urstory.studio**.

| Path | What it is | Unlocked by |
|---|---|---|
| `/` | The library: one login, then a tile per subject | any valid passcode |
| `/hippo` | Hippo English Olympiad mock exams | `Course` = `Hippo` |
| `/math` | Times tables / Үржихүйн хүрд | `Course` = `Multi` |

### Adding a subject
One entry in the `SUBJECTS` array at the top of `hub.js`: an emoji, a path, MN and EN
copy, and the `Course` option that unlocks it. Add that option to the `Course` property in
Notion, and the tile appears for anyone whose row carries it. Set `soon: true` instead of a
`course` to advertise something before it is built.

### One login for the whole library
`session.js` keeps the signed token in **`sessionStorage`** under `mlt_session`, so the hub
logs a child in once and both apps read it. sessionStorage, not localStorage, on purpose:
the session dies when the tab closes, so it is one login per sitting rather than a login
remembered for days. Deep-linking to `/hippo` or `/math` without a session still shows that
app's own login form, so bookmarks keep working. The device id lives in `MLT.device()` and is
shared, so a child using two subjects still costs only one of their two device slots.

`vercel.json` sets `cleanUrls`, which is what serves `hippo.html` at `/hippo`.

---

## Hippo Mock Exam 🦛

Interactive, timed practice exams for the **Hippo English Olympiad — Little Hippo, Continental Round**.

Each exam = **1 crossword + 30 open-ended "Use of English" questions**, matching the real
Continental round. 40-minute timer. Pass mark **75%** (average of the two sections, no negative
marking). 10 exams, shuffled; progress is saved on the device.

## How a kid uses it
1. Open the site → type **name + passcode** → Log in → tap the **Hippo** tile.
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

### Courses (who gets which app)
The Users DB has a **`Course`** multi-select with two options, **`Hippo`** and **`Multi`**.
Tick the courses a child is enrolled in:

- `Hippo` -> the English exams at `/`
- `Multi` -> the times tables at `/math.html`

Both clients send the course they need and `api/login.js` refuses with `nocourse` if the row
does not carry it. Two deliberate details:

- **An empty `Course` cell counts as `Hippo`**, so every existing user kept exam access when
  the column was added and nobody had to backfill it. Tick `Multi` to grant the maths app.
- **The course is checked before a device slot is claimed**, so a child who is not enrolled
  does not burn one of their two device slots on a login that was always going to fail.

After login the exams home screen only shows the times-tables link when the row has `Multi`.

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

---

## Times Tables / Үржихүйн хүрд

A second subject on the same site, at **/math.html**. Same name + passcode as the exams, and
the row needs `Multi` in its `Course` cell (see Courses above). Bilingual, Mongolian by
default, English via the toggle top right.

Progress is stored per child, under `mlt_math_v1:<name>`, so siblings sharing a tablet keep
separate grids. The login reuses the exam app's `hippo_device` id, so a child logging into
both apps uses one device slot, not two.

### The daily loop (about 5 minutes)
1. **Warm up** — skip-count the table being learned, fill three blanks.
2. **Quick fire** — 10 questions, mixing new facts with reviews that are due.
3. **Result** — streak, what is still tricky, and the 10x10 mastery grid.

### How it teaches
- **Facts are commutative.** 3x4 and 4x3 are one fact, so there are 55 to learn, not 100.
  The grid mirrors across the diagonal, which is how a child sees why.
- **Leitner spacing.** A miss resets the fact and it returns 3 questions later in the same
  session, then the next day. Right and fast three times over separate days retires it.
- **Wrong answers cost nothing.** No penalty: the dot array appears, plus the skip-count line,
  and the fact is asked again later in the session.
- **Tables unlock easiest-first:** 2, 5, 10, 1, 4, 3, 6, 9, 8, 7. Later tables go faster
  because they share facts already learned.
- A table takes about three days to unlock by design, because a fact has to be recalled
  correctly on separate days. The progress bar uses part-marks so every session still moves it.

### Notes for editing
- All copy lives in the `I18N` map at the top of `math.js`. Mongolian first, English second.
- `GEN` and `INS` hold the Mongolian case endings for digits (2 reads as хоёр, so it takes
  `2-ын` in the genitive and `2-оор` in the instrumental). These cannot be generated from the
  digit, so both tables are listed explicitly. Any new numeral needs a row in each.
- Fredoka has no Cyrillic, so every display stack falls back to Comfortaa, which does. The
  browser falls back per glyph, so digits stay in Fredoka and Cyrillic text picks up Comfortaa.
- Progress is `localStorage` under `mlt_math_v1:<name>`, language under `mlt_math_lang`.
