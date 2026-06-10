#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build practice.html — a printable worksheet pack that mirrors the app content:
 - 10 crosswords (same grids as the app)
 - 10 Use-of-English sheets (30 open-ended write-in questions each)
 - Full answer keys at the back
Run:  python3 build_print.py
"""
import random, os
import build_data as bd   # reuse crossword builder, THEMES, load_uoe

HERE = os.path.dirname(os.path.abspath(__file__))


def render_grid(cw, answers=False):
    out = ['<table class="cw">']
    for r in range(cw["rows"]):
        out.append("<tr>")
        for c in range(cw["cols"]):
            cell = cw["cells"][r][c]
            if cell is None:
                out.append('<td class="block"></td>')
            else:
                num = cell.get("num")
                numhtml = f'<span class="num">{num}</span>' if num else ""
                letter = cell["l"] if answers else ""
                out.append(f'<td class="cell"><div class="cb">{numhtml}<span class="lt">{letter}</span></div></td>')
        out.append("</tr>")
    out.append("</table>")
    return "".join(out)


def render_clues(cw, answers=False):
    def col(entries, title):
        items = ""
        for e in entries:
            tail = f' <b class="ans">{e["answer"]}</b>' if answers else ""
            items += f'<li><b>{e["num"]}.</b> {e["clue"]}{tail}</li>'
        return f'<div class="ccol"><h4>{title}</h4><ol>{items}</ol></div>'
    return col(cw["across"], "Across &rarr;") + col(cw["down"], "Down &darr;")


def render_uoe_sheet(items):
    out = ['<ol class="uoe">']
    for it in items:
        parts = it["q"].split("____")
        before = parts[0]
        after = parts[1] if len(parts) > 1 else ""
        out.append(f'<li><span>{before}</span><span class="blank"></span><span>{after}</span></li>')
    out.append("</ol>")
    return "".join(out)


def render_uoe_key(items):
    cells = "".join(f'<span class="kc"><b>{i+1}.</b> {it["answers"][0]}</span>' for i, it in enumerate(items))
    return f'<div class="keyrow">{cells}</div>'


CSS = """
*{box-sizing:border-box}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2C2825;margin:0}
.page{padding:30px 38px;page-break-after:always}
.page:last-child{page-break-after:auto}
h1{font-size:25px;margin:0 0 4px}
h2{font-size:20px;margin:0 0 2px;color:#1f6f5c}
h3{font-size:17px;margin:16px 0 8px;color:#1f6f5c}
h4{font-size:13px;margin:8px 0 4px}
.sub{color:#7a726a;font-size:13px;margin:0 0 12px}
.kicker{color:#C4987A;font-weight:700;letter-spacing:1px;font-size:11px;text-transform:uppercase}
.cover{text-align:center;padding-top:120px}
.cover .big{font-size:60px;margin:8px 0}
.badge{display:inline-block;background:#1f6f5c;color:#fff;padding:5px 13px;border-radius:18px;font-size:13px;margin:5px}
.howto{max-width:560px;margin:24px auto;text-align:left;font-size:14px;line-height:1.6;background:#F2EDE6;padding:16px 20px;border-radius:12px}
table.cw{border-collapse:collapse}
table.cw td.cell{width:30px;height:30px;border:1.5px solid #2C2825;padding:0;position:relative;background:#fff}
table.cw td.block{width:30px;height:30px;border:none}
.cb{position:relative;width:100%;height:100%}
.num{position:absolute;top:0;left:1px;font-size:9px;color:#555;line-height:1}
.lt{display:flex;align-items:center;justify-content:center;height:30px;font-size:16px;font-weight:700;text-transform:uppercase}
.cwwrap{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
.cluebox{display:flex;gap:22px;flex:1;min-width:280px}
.ccol{flex:1}
.ccol ol{margin:4px 0;padding-left:20px;font-size:12.5px;line-height:1.5}
.ccol li{margin-bottom:3px}
.ans{color:#1f6f5c}
.wordbank{margin-top:12px;font-size:12.5px;background:#F2EDE6;padding:8px 12px;border-radius:8px}
.wordbank b{color:#1f6f5c}
ol.uoe{font-size:14.5px;line-height:2.1;padding-left:24px}
ol.uoe li{margin-bottom:6px}
.blank{display:inline-block;width:120px;border-bottom:1.5px solid #2C2825;margin:0 4px;vertical-align:middle}
.keyrow{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;margin-bottom:10px}
.kc{min-width:90px}
hr{border:none;border-top:1px solid #D9CBBA;margin:16px 0}
@media print{.page{padding:18px 22px}}
"""


def main():
    random.seed(42)  # reproduce the SAME grids the app uses
    crosswords = [bd.build_crossword(theme, words) for theme, words in bd.THEMES]
    uoe = bd.load_uoe()

    P = ['<!doctype html><html><head><meta charset="utf-8"><title>Hippo Practice Pack</title>'
         f'<style>{CSS}</style></head><body>']

    # cover
    P.append('<div class="page cover">'
             '<div class="kicker">Little Hippo &middot; Continental Round</div>'
             '<h1>Printable Practice Pack</h1><div class="big">\U0001F99B</div>'
             '<div><span class="badge">10 Crosswords</span>'
             '<span class="badge">10 Use-of-English Sheets</span>'
             '<span class="badge">Answer Keys</span></div>'
             '<div class="howto"><b>For the parent</b><br>This paper pack matches the online exam at '
             '<b>hippomock.urstory.studio</b>: each exam is one crossword plus 30 open-ended '
             '"Use of English" questions, at Little Hippo (CEFR Pre-A1/A1) level. Read each clue and '
             'write the word. A word in (brackets) is a hint. Answers are at the back.</div></div>')

    # crosswords
    P.append('<div class="page"><div class="kicker">Part 1</div><h1>Crosswords</h1>'
             '<p class="sub">Read each clue. Write the word, one letter per square. '
             'Across goes &rarr;, Down goes &darr;.</p></div>')
    for i, cw in enumerate(crosswords, 1):
        words = sorted({e["answer"] for e in cw["across"]} | {e["answer"] for e in cw["down"]})
        bank = "  &middot;  ".join(words)
        P.append('<div class="page">'
                 f'<div class="kicker">Crossword {i} of 10</div><h2>{cw["theme"]}</h2>'
                 f'<div class="cwwrap">{render_grid(cw)}<div class="cluebox">{render_clues(cw)}</div></div>'
                 f'<div class="wordbank"><b>Word bank:</b> {bank}</div></div>')

    # use of english
    P.append('<div class="page"><div class="kicker">Part 2</div><h1>Use of English</h1>'
             '<p class="sub">Write the one missing word on each line. A word in (brackets) is a clue. '
             '10 sheets, 30 questions each.</p></div>')
    for i, items in enumerate(uoe, 1):
        P.append('<div class="page">'
                 f'<div class="kicker">Use of English {i} of 10</div><h2>Sheet {i}</h2>'
                 f'{render_uoe_sheet(items)}</div>')

    # answer keys
    P.append('<div class="page"><div class="kicker">Answer Keys</div><h1>Answers</h1>'
             '<p class="sub">Keep this part away until the sheets are finished!</p></div>')
    for i, cw in enumerate(crosswords, 1):
        P.append('<div class="page">'
                 f'<div class="kicker">Crossword {i} answer</div><h2>{cw["theme"]}</h2>'
                 f'<div class="cwwrap">{render_grid(cw, answers=True)}'
                 f'<div class="cluebox">{render_clues(cw, answers=True)}</div></div></div>')
    P.append('<div class="page"><div class="kicker">Use of English</div>'
             '<h1>Use of English &mdash; answers</h1>')
    for i, items in enumerate(uoe, 1):
        P.append(f'<h4>Sheet {i}</h4>{render_uoe_key(items)}')
    P.append('</div>')

    P.append('</body></html>')
    html = "\n".join(P)
    with open(os.path.join(HERE, "practice.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"WROTE practice.html  ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main()
