# AeroSkys prototype — architecture & conventions

Zero-dependency single-page app. `node server.mjs` serves `public/`. Hash routing (`#/path?query`) so any static host works.

## Server (`server.mjs`)
- **Pages and routes:** static files come from `public/`. Paths without an extension fall back to `index.html`, because the app's pages are hash routes. A missing file with an extension (`/nope.js`, `/favicon.ico`) is a 404. `/careers` serves `careers.html`.
- **Compression:** text files (HTML, CSS, JS, JSON, SVG) are kept in memory with Brotli and gzip copies, rebuilt when a file changes. Images and fonts stream from disk.
- **Headers on every response:** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` and `Cross-Origin-Opener-Policy`.
- **Content-Security-Policy (pages only):**
  - Scripts from the site itself, plus inline `<script>` blocks by their SHA-256 hash, computed from the file when it is served (edits need no manual update).
  - Images from anywhere over https (the live site's CDN).
  - Frames from OpenStreetMap only.
  - Inline event-handler attributes are blocked.
- **Caching:** fonts and `?v=` URLs are cached for a year; everything else is revalidated with an ETag.
- **Methods:** only GET and HEAD, plus `POST /api/careers/applications`.
- **Shared with Vercel:** the headers and the CSP builder live in `security.mjs`. `scripts/vercel-config.mjs` uses them to write `vercel.json`, which gives the static Vercel deployment the same routes, headers and caching. `npm run check` fails if `vercel.json` is stale.

## Folders
```
public/
  index.html            shell: icon sprite (<symbol id="i-NAME">), #site-header, #main, #site-footer, #tabbar, #overlay-root, #toast-root
  css/                  base (tokens, buttons, forms, badges) · layout (masthead, drawer, tab bar, footer, .page, .band)
                        components (search card, pickers, modal/sheet, calendar, tabs, accordion, steps, toast, price-lines…)
                        home · flights · checkout · hotels · bus · holidays · pages   (one file per area)
  js/core/              dom.js · router.js · store.js · format.js · rng.js
  js/data/              airports · airlines · cities · content (live home content) · packages (44 live holiday packages) · pages (policies + blog) · promos
  js/engines/           flights · bookings (drafts → payment → bookings/cancellation, enquiries, promo codes) · hotels · buses
  js/ui/                overlay (openModal/openPopover/confirmDialog) · toast · header · footer · hero · search · pickers · common · cards · auth · reviews · showcase · intro
  js/views/             one module per route (see js/main.js)
```

## View contract
```js
export default async function (el, ctx) {   // ctx = { path, params, query: URLSearchParams, raw }
  document.title = '… — AeroSkys';
  mount(el, html`…`);                       // el is <main id="main">
  // bind events with on(el, 'click', '[data-x]', (e, target) => …)
  return () => { /* cleanup timers/listeners on window/document */ };
}
```
Routes are registered in `js/main.js`. `{ flow: true }` routes hide the mobile tab bar (booking steps).

## Core helpers
- `html\`…\`` auto-escapes interpolations; nested `html` results and `raw(str)` are inserted as-is. Arrays are joined.
- `icon('name', cls?)` → `<svg class="i"><use href="#i-name"/></svg>` (see `index.html` for names: plane, bed, bus, palm, passport, users, user, calendar, pin, swap, check, check-circle, info, alert, clock, luggage, bag, meal, seat, wifi, snow, coffee, gym, pool, parking, star, heart, phone, mail, chat, headset, tag, percent, gift, shield, lock, card, wallet, bank, mobile, qr, download, printer, filter, sort, globe, leaf, compass, sparkles, ticket, receipt, logout, edit, trash, plus, minus, copy, external, home, grid, help, map, radar, sunrise, sun, sunset, moon, baby, grad, senior, refresh, eye, building, tv, plug, drop, more, login, mountain, steering, flame, zap, thumb, file, binoculars, ship, flag, arrow-right, arrow-left, arrow-up-right, chevron-*, x, menu, search, takeoff, landing, train, car, sort).
- `img(src, { alt, fallback: 'kerala' })` → lazy `<img data-fallback>` that falls back to `assets/img/<fallback>.webp` (an empty fallback hides the image and tints its frame). A capture-phase `error` listener in `dom.js` does the swap, and `data-remove-on-error` drops an image instead. Never use inline `onerror`/`onclick` attributes: the Content-Security-Policy blocks them (`npm run check` fails on them).
- `on(root, type, selector, handler)` delegated events. `$`, `$$`. `debounce`. `reveal(root)` animates `.reveal` elements (add `style="--d:.1s"` to stagger).
- Router: `go(path, { query, replace })`, `href(path, query)` → `'#/path?…'`, `setQuery(patch)` (updates URL without re-render; returns the new hash).
  - Phone sheets own one history entry each (`history.state.ovl`), so the hardware Back button closes them.
  - `setQuery` called while a sheet is open is held (`window.__aeroskysDeferredHash`) and applied once the sheet closes. Live filters and sorts in sheets therefore survive both "Show results" and Back.
  - `go()` and in-app links close open sheets first (`setSheetCloser`, registered by `overlay.js`) and wait for that history step (`window.__aeroskysPendingBack`) before pushing the new page, so Back never lands on a stale sheet entry.
  - Read `location.hash` right after `setQuery` only via its return value.
- Store (localStorage, this device only): `store.get(key)`, `store.set(patch)`, `store.update(draft => …)`, `store.subscribe(fn)`; `pushRecent(service, entry)`.
- Format: `money(inr)` (respects the INR/CAD/GBP switch), `inr(n)`, `fmtDate(iso, 'ddd, d MMM')`, `today()`, `addDays(iso, n)`, `diffDays(a, b)`, `hm(mins)`, `hm12(mins)`, `dur(mins)`, `plural(n, 'night')`.
- Seeded randomness: `rng(seedString)` → `r()`, `r.int(a,b)`, `r.pick(arr)`, `r.chance(p)`, `r.shuffle(arr)`; `hash(str)`, `code(len, r)`.
- Overlays: `openModal({ title, body, foot, size: 'wide'|'full', fullscreen, onOpen(el, api), onClose })` — centered on desktop, bottom sheet on phones (back button closes). `openPopover(anchor, { title, content, width, onOpen })` — anchored on desktop, full-screen sheet on phones. `confirmDialog({ title, message, confirm, danger })` → Promise<boolean>. `toast(msg, { type: 'success'|'error'|'info', title })`.
- Pickers (`ui/pickers.js`): `pickAirport`, `pickFromList(anchor, { title, items:[{value,label,sub,tag,icon}], onSelect })`, `pickDate(anchor, { mode: 'single'|'range', start, end, focus, labels, minNights, maxNights, priceFor, onSelect({start,end}) })`, `pickPax`, `pickRooms`, `pickOption(anchor, { title, options:[{value,label,sub}], value, onSelect })`.
- Search card (`ui/search.js`): `searchCard({ service, tabs })` + `bindSearchCard(form, { state, onSearch(service, query) })`; query codecs `parseHotelQuery`, `hotelQuery`, `parseBusQuery`, `busQuery`, `parseFlightQuery`, `flightQuery`, `roomsToParam`, `paramToRooms`.
- Hero (`ui/hero.js`): `hero('flights'|'hotels'|'holidays'|'bus')` + `bindHero(el)` → `{ api, cleanup }`.
- Common (`ui/common.js`): `SERVICES`, `airlineMark(code)`, `stars(n)`, `ratingBadge(r)`, `sectionHead({ eyebrow, title (may contain <em>), aside, action })`, `steps(labels, currentIndex)`, `priceLines(lines, total)`, `emptyState({ iconName, title, text, action })`, `crumbs(items, light)`, `protoNote()`, `field({ name, label, type, value, required, options, hint })`, `validateForm(form, rules)` + validators `V.name`, `V.email`, `V.mobile`, `V.required(label)`, `initials`.
- Cards (`ui/cards.js`): `offerCard(o)` + `openOffer(o)`, `pkgCard(p)`, `postCard(p)`.
- Auth (`ui/auth.js`): `requireLogin(reason)` → Promise<user|null> (OTP login modal), `currentUser()`.
- Bookings (`engines/bookings.js`): `createDraft(draft)` → id, then `go('/checkout', { query: { d: id } })`. `applyPromo(code, 'flight'|'hotel'|'bus', amount)` → `{ code, amount, label }` or `{ error }`. `saveEnquiry(kind, data)` → `{ ref, … }`. `getBooking`, `findBooking(ref, firstName)`, `refundQuote`, `cancelBooking`.

## Draft / booking shapes (used by payment, confirmation, Find Booking, My Trips)
```js
{ type: 'flight'|'hotel'|'bus', title, subtitle, returnTo: '#/…',
  item: {…service snapshot…},
  travellers: [{ title, first, last, type, … }],     // `first` is used by Find Booking
  contact: { name, email, phone, countryCode },
  gst: null | { number, company, email, phone, address },
  promo: null | { code, amount },
  pricing: { lines: [{ label, amount, neg }], total, addons } }   // INR
```
Hotel `item`: `{ hotelId, name, city, area, address, stars, type, rating, image, checkin, checkout, nights, rooms:[{adults,children,ages}], room:{ name, meal, refundable, freeCancelUntil, beds }, checkinTime, checkoutTime, guests:[{ room, title, first, last }], specialRequest }`.
Hotels engine (`engines/hotels.js`, no DOM, imports in Node):
- `searchHotels({ city, checkin, checkout, rooms, star, nat })` returns an array that also carries `.all`, `.nights`, `.roomCount`, `.guests` and `.error = 'city'`.
- `getHotel(id, query)` returns room types × meal plans (RO/BB/HB/FB), refundable and non-refundable. Rate ids look like `r1-BB-r`.
- Also exported: `findRate`, `cityMeta` (with aliases), `cancellationText`, `taxPct`.
- Taxes: GST 5% up to ₹7,500 per room-night, 18% above that, and 10% "taxes & fees" abroad.
- Results filters live in the URL (`fname`, `floc`, `farea`, `fstar`, `ftype`, `pmin`, `pmax`, `sort`, `n`). The chosen room is stored as `rate`.
Bus `item`: `{ busId, operator, busType, ac, sleeper, from, to, date, dep, arr, dayOffset, duration, boarding:{time,name,landmark}, dropping:{time,name,landmark}, seats:[{ no, deck, type, price }], passengers:[{ seat, name, age, gender }] }`.
Flight `item`: `{ trip, journeys:[{ from, to, date, itinerary, fare }], pax:{adt,chd,inf}, cabin, special, exclusive, addons }`.

## Careers page
A separate static page, not part of the hash-routed app. The main site links to it with a normal link (`careers.html`), so the router ignores it. `server.mjs` also serves it at `/careers` (and redirects `/careers/` there).
```
public/careers.html        the page: header, landing, open positions, life at Aeroskys, the role pages,
                           how we hire, application host, membership band, footer, "Our story" dialog
public/careers/careers.css one stylesheet (Inter, self-hosted in assets/fonts); prefix cr-
public/careers/icons.svg   its own icon sprite; icon('name') in careers/js/ui.js points here
public/careers/img/        WebP crops of the reference screens (rebuilt by tools/careers_images.py); hero-desktop
                           is the landing photo with its lettering lifted off, hero-script that lettering
public/careers/js/shell.js page shell: sticky header, dropdowns, phone menu, reveals
public/careers/js/app.js   the two views (landing / one designation), role pages for positions 02 and 04–15,
                           position bar, section navigators, pay calculator, ladder tabs, fit check, HR carousel,
                           hiring steps; starts the application
public/careers/js/apply.js the application: four steps on one panel, validation, drafts, progress, CV, submission
public/careers/js/roles.js the 15 designations: summary, pay, tiers, questions and role-page details (shared with
                           server.mjs); generated from the client's handoff file; nationalDigits(cc, phone)
data/careers/              applications/<ref>.json, cv/<ref>.<ext>, index.json (clientId → ref); never served
```
- **Two views, one page.** `/careers` is the landing (hero, the 15 open positions grouped Operational / Growth / Executive, life at Aeroskys, how we hire). `/careers?position=<key>` is one designation: the position bar (breadcrumb, previous / next), the role page, how we hire and the application. The keys are the client's: `tag`, `tasa`, `hr`, `membership-growth`, `customer-support`, `tour-planner`, `accounts-executive`, `sales-director`, `rewards-director`, `cfo`, `group-executive`, `legal-counsel`, `investor-relations`, `ceo-acquisitions`, `airline-alliances`.
  - Elements carry `data-show="home|role|tag|hr|generic"`; `app.js` hides what the current view does not use. An inline script in `<head>` adds `cr-role-view` when the URL has `?position=`, so the landing never flashes before a role page.
  - Positions 01 (TAG Manager) and 03 (HR & Recruitment) keep their designed sections (`#roles`, `#the-role`, `#pay`, `#profile`; `#hr-role`). Every other designation is drawn into `#role` from `roles.js`: header and compensation card, then the details (`#role-details`).
  - Choosing a position pushes `?position=<key>`; Back returns to the list with focus on the position just viewed (its scroll position is kept in `history.state.crScroll`). A link to a section of the other view switches view first. Old links from the one-role page (`#pay`, `#profile`, `#hr-role` …) open the designation they belong to; `#apply` on its own lands on the positions list.
- **Stages.** Sections copied from a reference screen use `.cr-stage` with `--W/--H` (the screen's size). Children use `.cr-abs` with `--x/--y/--w/--h` (the reference's own pixels) and `.cr-fs` with `--fs` (font size in reference pixels), so the composition scales with the page. Stage text stays at 11px or larger; only small uppercase labels, and the role-intro cards on phones, go down to 9px.
  - Below 1200px the stages switch to stacked layouts designed per section.
  - The role-introduction composition is the exception: it keeps its layout at every width.
- **Page edge.** `--edge` is the inset shared by the header, the landing and `.cr-wrap`: 6.5% of the width (the reference screens' margin), with content no wider than `--wrap` (1600px). Below 1024px it is the gutter. Stages scale with the page up to 1920px.
- **Landing.** Full width at every size. From 1024px wide on landscape screens it is `100svh` minus the utility bar, and the photo takes the height the headline leaves.
  - `--hero-top` lifts the photo so the two faces sit between the header and the wave.
  - `--wave-h` flattens the wave as the crop tightens, so it never reaches a chin. Both are in `careers.css`, in hero-photo pixels / 1294.
  - The script and the "A Great Place to Grow" card stack upwards from the wave in `.cr-hero-left`. That element is a size container, and the script hides when there isn't room for it.
  - Below 1024px the photo returns to the flow at its own proportions, with its lettering baked in.
- **Motion.**
  - `[data-reveal]` elements animate in once, at about 85% of the viewport (`data-reveal="left|right|scale|fade"`, stagger with `--d`).
  - `.cr-draw` paths draw in, and floating cards use the `translate` property, so they never fight the reveal transform.
  - `prefers-reduced-motion` switches all of it off.
- **Role pages show each pay line once.** The compensation card (`roleHead`) carries the headline figure and its terms; the details carry the tables (bonus tiers, CTC structure, commission). Step 01 of the application only confirms the designation, so nothing is repeated below the role page.
- **Application.** The same four steps for every designation, on one scrollable panel: 01 designation (number, title, question count), 02 About you, 03 the role's questions, 04 CV, review, declaration and submit. A progress card (a sticky bar on phones) follows the step in view.
  - Question kinds: `text`, `pair` (two short answers, both needed when required) and `table` (the HR KPI table: a row of KPI / Lean / Over-target / Time to lean / Time to over-target per entry, plus a note; one complete row needed). One question per designation is the primary evaluation (`core`).
- **Drafts.** `localStorage` key `aeroskys:careers:application:v2`: About you (shared by every designation) and the answers per designation. A v1 draft from the three-role form is carried over (About you and the TAG Manager answers). `aeroskys:careers:submitted:v1` keeps the last reference. A draft is written only after a real change.
- **Endpoint contract** (`POST /api/careers/applications`, `Content-Type: application/json`, max 16 MB):
  ```js
  // request
  { clientId,                       // uuid made per application; a repeat returns the same reference
    role: 'tag' | 'tasa' | … ,      // one of the 15 keys in roles.js
    roleTitle,
    about: { name, email, cc: '+91', phone /* national digits */, location, cvLink, notice },
    answers: { q1: '…', q1b: '…', … }, // every answer field of the role (answerFields() in roles.js)
    confirm: true, submittedAt,
    cv: null | { name, type, size, data /* base64 */ } }
  // responses
  201 { ok: true, reference: 'ASC-YYMMDD-XXXXXX', receivedAt }
  200 { ok: true, reference, duplicate: true }
  400 { ok: false, error, fields: { name|email|…|q7|cv|confirm: 'message' } }    // shown next to each field
  405 / 413 / 415 / 500 { ok: false, error }
  ```
- **Caching.** Fonts and versioned URLs (`?v=…`) are cached for a year as immutable; everything else is sent `no-cache` with an ETag, so edits show up at once. Careers images, the icon sprite and the logo carry `?v=4` (`?v=5` for the two desktop landing files): raise it whenever one of them changes.

## Membership page
A separate static page like Careers, served at `/membership` (`/member-id`, the address of the earlier Member ID generator, redirects there). It is built on the Careers design system: it loads `careers/careers.css` and imports `careers/js/shell.js` (header, phone menu, reveals, footer year), and uses the same components (`cr-header`, `cr-btn`, `cr-field`, `cr-astep-head`, `cr-dialog`, `cr-footer` …). Membership-only pieces are prefixed `ms-` and add the coral / crimson accent. The content and logic are the client's *Membership – Developer Handoff* file, rewritten as plain DOM code.
```
public/membership.html             the page: header, landing, plans, benefits, status, join, footer,
                                   test-mode checkout <dialog>
public/membership/membership.css   membership-only styles on top of careers.css; coral / crimson tokens; prefix ms-
public/membership/membership.js    plans, GST breakdown, validation, fingerprint, Member IDs, checkout,
                                   header highlight of the section in view
public/membership/img/plane.webp   the airliner from the client's design reference (careers/img/dir-plane.webp),
                                   with the flight-path mark trimmed off its top edge
```
- **Colour.** `--crimson #c8102e` (5.9:1 on white) is the accent for text; `--coral #f0525a` (3.5:1) is for decoration and large figures only; on navy, text uses `--coral-on-dark #ff9ea2` (8.4:1). Blue stays the action colour (buttons, selected plan, focus).
- **Member ID.** `SHA-256('AEROSKYS-MEMBER-V1|' + nationality + '|' + passport)` identifies the passport, so one passport holds one ID; only the fingerprint and the last four characters are kept, in memory for the visit. IDs are `ASK-G<years>-XXX-XXXX-XXXX`: a per-plan serial scrambled by a fixed bijection mod 10¹⁰ plus a Luhn check digit (`aeroskys-member-seq-<plan>` in `localStorage`). An active passport gets its existing card back; an expired one renews under the same ID.
- **GST.** 18% on top of the plan price; billing state Delhi (the supplier state) splits it CGST 9% + SGST 9%, any other state or "Outside India" is IGST 18%. The rate, supplier state and inclusive pricing are the `data-gst-rate`, `data-supplier-state` and `data-gst-inclusive` attributes on `#join`. Invoices are numbered `ASK/<FY>/000001` (`aeroskys-invoice-seq`).
- **No register on the page (client, 14 Oct 2026, GDPR).** The public page neither shows nor stores issued Member IDs: no table, search, revoke or CSV export. IDs issued during a visit are kept in memory only, so a passport is not issued twice in that visit, and the register earlier versions kept in `localStorage` (`aeroskys-member-register`) is deleted on load. Only the serial and invoice counters, which hold no personal data, stay in `localStorage`. In production the register, serials and invoices belong on a server, behind the back office's login, and payment goes to a licensed gateway; the checkout here is test mode.

## CSS conventions
- Tokens in `css/base.css` (`--navy`, `--blue`, `--ink`, `--muted`, `--line`, `--wash`, `--r`, `--r-lg`, `--shadow-*`, `--serif`, `--ease`).
- Reuse: `.wrap`, `.page`, `.band`, `.page-hero`, `.card`, `.card-pad`, `.btn btn-primary|btn-dark|btn-light|btn-outline btn-sm|btn-lg btn-block`, `.chip`, `.pill`, `.badge badge-green|red|amber|blue`, `.field/.input/.select/.textarea`, `.form-grid`, `.check`, `.note`, `.acc`, `.tabs/.tab`, `.seg`, `.counter`, `.range` + `.histo`, `.price-lines`, `.kv`, `.empty`, `.skeleton`, `.mobile-cta` (+ add `has-mobile-cta` to body while shown), `.reveal`.
- Headings: `.display`, `.h2`, `.h3`, `.h4`, `.eyebrow`; editorial emphasis with `<em>` (serif italic).
- Breakpoints: 959px (tablet/phone nav: tab bar appears), 759px (phone: sheets, stacked forms). Mobile-first quality matters: 44px touch targets, 16px inputs, sticky CTAs, bottom sheets for filters.
- Area prefixes: flights `fl-`, checkout `co-`, hotels `ht-`, bus `bs-`, holidays `hd-`, pages/enquiries `pg-`.
