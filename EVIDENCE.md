# How Perspective works — reverse-engineering notes

Target: `https://app.perspective.co/` (Perspective Software GmbH, funnel builder).

## Method

- **Direct fetch was blocked.** The sandbox's network policy refuses `app.perspective.co`
  (`CONNECT tunnel failed, response 403`; WebFetch: `ENOTFOUND`). I could not download the
  SPA's JS bundles.
- **Instead I used Perspective's own authenticated API** (the Perspective MCP connector on
  this account, read-only calls only). It returns the real objects the app
  works with: workspaces, funnels, the published funnel HTML, CRM schema, contacts,
  sequences, analytics. Everything below comes from those responses. Contact PII is redacted.

## 1. Object model

```
Company (5d775fc05530b4001d0d8fea)
 └─ Workspace            list_workspaces → {id, name}         (10 on this account)
     └─ Funnel/"campaign" list_funnels → {id, name, status: draft|live|offline,
     │                                    isArchived, isHtmlFunnel}
     ├─ Pages            (named, ordered; analytics keys each page by id)
     ├─ Contacts (CRM)   one schema per funnel = form fields + answers + system fields
     └─ Sequences        automations: status trigger → filter → delay → email/whatsapp
Brand                    design tokens + AI "context" (brand profile text)
```

All IDs are 24-char hex **MongoDB ObjectIds** (e.g. `6a87fe0f4d55f9ed22576a7d`). Newer
sequence step IDs are UUIDs (`f69c1dec-cd0b-…`), older ones ObjectIds, so the step editor
was rewritten at some point.

**Two funnel generations** coexist (`isHtmlFunnel`):
- *Classic* funnels: block-based visual editor (most of the Marquardt funnels).
- *AI/HTML* funnels: an LLM writes one whole HTML document from a brief + brand.
  Edits are further natural-language passes (`create_funnel` / `update_funnel` return a
  `jobId` you poll).

## 2. A published funnel is one HTML file plus a tracking SDK

From `get_funnel_html` on "Profilcheck+ DeepDive V2" (846 lines, 113 KB):

**Head**
```html
<head data-pf-tw-contract="2">
<style id="perspective-tailwind-base">… tailwindcss v3.4.19 …</style>
<script async src="https://data.perspective.co/core.js" id="perspective-sdk-loader"></script>
<script id="perspective-sdk-queue-stub">window.perspective = window.perspective || {
    _q: [],
    on:         function () { this._q.push(['on'].concat([].slice.call(arguments))); },
    pageView:   …, click: …, formSubmit: …,
    submitForm: function (form) { this._q.push(['submitForm', form]); return Promise.resolve(); },
    answer: …, cookiesAccepted: …, track: …, goToPage: …,
    getAnswers: function () { return {}; }, getPages: …, getCurrentPage: …
};</script>
<script id="perspective-metadata" type="application/json">{"funnelId":"6a87…","versionId":"6a87…",
 "companyId":"5d77…","draftId":"6a91…","integrations":{"Perspective":{"apiUrl":"https://api.perspective.co"}},
 "fonts":{"font":{"type":"Google","name":"inter"}}}</script>
```
- Tailwind is compiled **at publish time** and only the used classes are inlined
  (`<style id="perspective-tailwind">`): no Tailwind runtime ships.
- The SDK uses the usual analytics **queue-stub pattern** (like GA / Segment): calls are
  buffered in `_q` until `core.js` loads and replays them.
- Events go to `https://api.perspective.co`. Fonts are self-hosted at `/ps-fonts/google/inter/inter.css`.

**Consent config**: storage keys the SDK uses:
`perspective_consent_v1`, `perspective_user_id` (localStorage, unique-visitor counting
"für die Abrechnung", i.e. billing), `perspective_outbox_v1` (offline event buffer "until delivered"),
`perspective_campaign_session_<campaignId>`, `perspective_visitor_properties_<sessionId>`
(sessionStorage). So it's an **offline-first outbox** that flushes to the API.

**Body: pages are `<section>`s, wired by data attributes**
```html
<section data-page-name="Start" data-page-role="home">
<fieldset data-ps-question="status_quo_anfragen" data-ps-title="Status Quo: …">
  <button data-answer-option data-ps-btn="1" data-page-target="Frage 1">Ja, regelmäßig</button>
<button data-page-target="Start">            ← navigation
<form …> <… data-page-target-on-submit="…">   ← where to go after lead capture
```
Every element gets a stable `id="ps-el-<12 hex>"` so the editor can address it and run
click-to-edit.

**Runtime logic in the page's own script**
```js
window.perspective.click({ trackingId: btn.dataset.psBtn });
window.perspective.answer({ questionId: group.getAttribute('data-ps-question'), value });
window.perspective.goToPage(target);
window.perspective.submitForm(form).then(() => window.perspective.goToPage(b.dataset.pageTargetOnSubmit));
window.perspective.on('page:navigate', p => { if (p.to === 'Ergebnis') computeResult(); });
window.perspective.answer({ questionId: 'klarheits_score', value: total });   // computed values too
```
Quiz scoring is plain client JS (`data-points` / `data-area` per option, thresholds
≥8 high / ≥5 mid / else low).

## 3. CRM: the schema is derived from the funnel

`get_crm_properties` returns the form fields and questions as typed columns, plus system fields:
```
ps_converted_at(date) status(select) ps_source(select) ps_user_edited_at(date)
status_quo_anfragen(select) frage_identitaet(select) … name(text) email(email)
phone(phone) datenschutz_einwilligung(boolean)
```
Every `data-ps-question` id becomes a CRM property. The same names are used as email
personalization tokens `{{fieldName|default}}`.

A contact record (`list_contacts`, values redacted):
```json
{ "id": "6ae0…", "email": "…", "phone": "…", "firstName": "…", "status": "New (RESULTZ)",
  "utmParams": {"utm_source":"meta","utm_medium":"Instagram_Feed","utm_campaign":"…","utm_content":"…"},
  "properties": {"question_txnc2g":"Moderner Stil","question_zam6no":"8.000 bis 12.000 €", "fbclid":"…"},
  "meta": {"ps_first_seen_at":"…19:06:55","ps_converted_at":"…19:09:21","ps_completed_at":"…19:10:07",
           "ps_source":"funnel","ps_start_page":"Start","ps_result_page":"Weitere Schritte","ps_embed":false},
  "messages": [{"type":"email","subject":"✅ Anfrage erhalten, vielen Dank!"}] }
```
In classic funnels question ids are generated (`question_<6 chars>`, `input_<6 chars>`).
UTM parameters and click ids are captured from the landing URL automatically.

## 4. Automations ("Sequences")

`list_sequences` shows a fixed **step pipeline**: `status → filter → delay → message`.
```json
{"type":"status","status":"WA Bestätigung"}
{"type":"filter","filter":{"type":"group","operator":"AND","conditions":[
   {"type":"condition","fieldName":"email","fieldType":"email","operator":"HAS_VALUE"}]}}
{"type":"delay","delay":{"days":0,"hours":0,"minutes":0,"seconds":0}}
{"type":"not-supported","originalType":"whatsapp" | "email"}
```
- The trigger is **a contact entering a CRM status** (e.g. `New (RESULTZ)`, `FU (nicht erreicht)`,
  `Qualifizierter Interessent`). A sales team moves leads through statuses and each move fires
  a follow-up.
- Filters are a recursive AND/OR condition tree over CRM fields.
- Sequences are versioned (`version`, `published`, `hasUnpublishedChanges`).
- Message lifecycle events: `scheduled, sent, delivered, opened, failed, canceled`.

## 5. Analytics

`list_available_metrics`: KPIs `completion_rate, conversion_rate, new_contacts, total_sessions,
average_time_on_page, time_to_completion, messages_sent/delivery_rate/open_rate`; charts
`page_to_page_conversion_rate` (with A/B filter), `activity_by_daytime`, `contacts_over_time`,
`visitor_devices`, `top_utm_sources`, `time_on_page`, `button_clicks`.

Real page-to-page data (Marquardt Emleben, last 30 days):
```
Start 1004 (12%) → Stil 125 (90%) → Geräte 112 (94%) → Wichtigkeit 105 (95%) → Zeit 100 (99%)
→ Budget 99 (88%) → Anfrage-Email 87 (23%) → Anfrage-Telefon 20 (55%) → Erfolgreich 11 …
kpi_conversion_rate = {"value": 1.77, "count": 18}
```
`value` = unique sessions that viewed the page; `relativeValue` = % that reached the next page.
All of these come from aggregating the SDK's `pageView` / `click` / `answer` / `submit` events.
`button_clicks` is keyed by the `data-ps-btn` tracking ids.

## 6. Brands

A brand is a token set the AI generator injects: `fontColor, backgroundColor,
buttonBackgroundColor, formFieldBackgroundColor, primaryHover, primaryText, accent, secondary,
surface, mutedText, border, typography, headingFontFamily, bodyWeight, headingWeight,
baseTextSize, letterSpacing, lineHeight, borderRadius, shadow, borderWidth, blockGap,
paddingX/Y, contentAlign, transition, pageTransition, blockEntrance, logoUrl, faviconUrl`,
plus `context.content`: a long AI-researched "BRAND PROFILE" (company basics, mission, USP…)
generated from the website domain.

## Architecture summary

```
Editor SPA (app.perspective.co)
  ├─ builds funnel doc (pages + blocks / or AI-written HTML)  ── publish ──► static HTML + inlined Tailwind
  ├─ CRM view  ◄── contacts ──┐                                            │
  ├─ Sequences (status-triggered automations)                              ▼
  └─ Analytics ◄── aggregates ── api.perspective.co ◄── core.js SDK events (outbox, offline-first)
```

The clone in `/app` copies this design end to end, at small scale.
