# Funnelkit: a small Perspective-style funnel builder

- **`EVIDENCE.md`**: how Perspective (app.perspective.co) works, reverse-engineered from its live API responses and published funnel HTML.
- **`app/`**: a working clone as a dependency-free web app.

## Run

```bash
python3 -m http.server 8000   # from the repo root
# open http://localhost:8000/app/
```
No build step. All data lives in your browser's localStorage.

## What it does (mirrors Perspective's architecture)

| Perspective | Funnelkit |
|---|---|
| Funnel = HTML with `<section data-page-name>` pages | Same. `runtime.js` renders the funnel doc into one standalone HTML file |
| `window.perspective` SDK (`pageView/click/answer/goToPage/submitForm/on`) | Same API, inlined into every page (`PF_SDK`) |
| `data-ps-question`, `data-answer-option`, `data-page-target`, `data-ps-btn` | Same data-attribute contract |
| Events → `api.perspective.co` with an offline outbox | Events → editor via `postMessage`; exported pages use a localStorage outbox + optional `apiUrl` |
| CRM: questions become contact properties, UTM capture, statuses | Same |
| Sequences: status trigger → filter (AND/OR) → delay → email, `{{field\|default}}` tokens | Same. Emails go to a log instead of being sent |
| Analytics: sessions, conversion, completion, page-to-page, button clicks, devices, UTM | Same, computed from the event stream |
| Brands: design tokens injected at publish | Same token names |

## Editor

- Perspective-style layout: top bar (Funnel · Metriken · Kontakte · Automationen), left panel with **Übersicht** (pages, layers with drag & drop, element palette) and **AI Chat**, canvas with a bottom toolbar (select/preview, HTML, page navigation, mobile/desktop, add element, undo/redo), inspector on the right.
- Click an element in the canvas to select it; double-click to edit text in place. The floating toolbar does bold/italic, alignment, colour, move, duplicate, ask AI and delete.
- 16 element types: heading, text, badge, image, button, single choice (list or tiles, emoji, points), multi choice, input, contact form, list, features, FAQ, testimonial, quiz score, divider, spacer.
- **AI Chat** sends the funnel JSON plus the selected element to Claude through the artifact `sample` capability and applies the returned pages as one undoable step. It only works in the published artifact on claude.ai.
- `python3 app/build_artifact.py OUT.html` bundles everything into one file for publishing.

Not cloned: the AI generator, real email/WhatsApp delivery, multi-user/teams, custom domains, A/B tests.
