"""Bundle the app into one HTML file for publishing as a claude.ai artifact.

Usage: python3 app/build_artifact.py OUT.html
Inlines styles.css, runtime.js, app.js and EVIDENCE.md (converted to HTML).
"""
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    return s


def md_to_html(md):
    out, lines, i = [], md.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            buf, i = [], i + 1
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i += 1
            out.append("<pre><code>" + html.escape("\n".join(buf), quote=False) + "</code></pre>")
        elif m := re.match(r"(#{1,3}) (.*)", line):
            n = len(m.group(1))
            out.append(f"<h{n}>{inline(m.group(2))}</h{n}>")
        elif line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|[\s\-|]+\|$", lines[i]):
                    rows.append([c.strip() for c in lines[i].strip("|").split("|")])
                i += 1
            i -= 1
            head, body = rows[0], rows[1:]
            out.append('<div class="tbl"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>" +
                       "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>")
        elif re.match(r"^(\d+\.|-) ", line):
            tag = "ol" if line[0].isdigit() else "ul"
            items = []
            while i < len(lines) and re.match(r"^(\d+\.|-) |^  \S", lines[i]):
                if re.match(r"^(\d+\.|-) ", lines[i]):
                    items.append(re.sub(r"^(\d+\.|-) ", "", lines[i]))
                else:
                    items[-1] += " " + lines[i].strip()
                i += 1
            i -= 1
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
        elif line.strip():
            buf = [line]
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r"^(```|#|\||\d+\. |- )", lines[i + 1]):
                i += 1; buf.append(lines[i])
            out.append("<p>" + inline(" ".join(buf)) + "</p>")
        i += 1
    return "\n".join(out)


def main(out):
    css = (ROOT / "styles.css").read_text()
    evidence = md_to_html((ROOT.parent / "EVIDENCE.md").read_text())
    js = "window.EVIDENCE_HTML = " + json.dumps(evidence).replace("</", "<\\/") + ";\n"
    js += (ROOT / "runtime.js").read_text() + "\n" + (ROOT / "app.js").read_text()
    assert "</script" not in js.lower()
    page = f"""<title>Funnelkit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
{css}
</style>
<div id="app"></div>
<div id="toast" role="status" hidden></div>
<div id="modal" hidden></div>
<script>
{js}
</script>
"""
    pathlib.Path(out).write_text(page)
    print(f"wrote {out} ({len(page) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1])
