# Funnelkit: a small Perspective-style funnel builder

- **`EVIDENCE.md`**: how Perspective (app.perspective.co) works, reverse-engineered from its live API responses and published funnel HTML.
- **`app/`**: a working clone as a dependency-free web app.
- **`landing/`**: the RESULTZ landing page for kitchen studios (Triple-A-System). Its contact form, CTAs and potential calculator report through the Funnelkit SDK (`app/runtime.js`), so leads arrive as `submit` events like a funnel's.

## Run

```bash
python3 -m http.server 8000   # from the repo root
# open http://localhost:8000/app/       (funnel builder)
# open http://localhost:8000/landing/   (landing page)
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

Not cloned: the AI generator, real email/WhatsApp delivery, multi-user/teams, custom domains, A/B tests.
