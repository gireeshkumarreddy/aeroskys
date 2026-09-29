# AeroSkys — working travel-booking prototype

A clickable, end-to-end prototype of **aeroskys.com** (operated by Jackpot Travels Private Limited) rebuilt in the AeroSkys editorial design: navy and lagoon blue, Manrope with Georgia-italic accents, the layered Maldives hero, and the signature logo-and-aircraft opening.

The **business flows, labels, rules and content come from the live site** (imported 28 Sep 2026). **Inventory, payments, OTP, email and SMS are simulated** so every journey can be demonstrated without a backend.

## Run it

```bash
npm start            # http://localhost:3000  (uses $PORT when set)
npm run check        # health check: routes, icons, engines, Careers assets and roles, no inline handlers
```

Node 18+ and nothing to install. `public/` is a static site: any static host works, because routing is hash-based (`#/flights/search?...`).

## What works

| Area | Flow |
|---|---|
| **Flights** | One way / round trip, 150 airports, travellers & class (max 9; more goes to Group Booking), Regular / Student (extra baggage) / Senior Citizen (discount) fares. Results show a 31-day fare strip, the live filters (stops, price histogram, popular ranges, departure/arrival time, airlines, fare type), sorting, and **Flight Details** (Overview / Fare Summary & Rules / Baggage). **More Fare** offers the live fare families: Exclusive, Online, Flexi, Zero Cancellation, Upfront and Stretch, or Saver/Value/Flex/Business for full-service airlines. The Exclusive Deal notice and a 5-step booking follow: Traveller Information (with GST, promo codes and OTP login) → Seat & Meal (seat maps, meals, excess baggage) → Payment → Booking Confirmed. |
| **Hotels** | 48 cities (about 2,250 generated properties). City search, rooms & guests with child ages, star category, nationality. Results use the live filters (hotel name, location/area, price range, star category, property type) and sorts. Details page has a gallery, amenities, room types with meal-plan chips (Room Only / Breakfast / Half Board / Full Board), and refundable/non-refundable rates. Hotel Review has a login gate, lead guest per room, special requests, optional GST, promo code and a price break-up with GST slabs. Then payment → voucher → cancellation with free-cancellation rules. |
| **Holidays** | All 44 live packages across the live categories and 35 destinations. Each has the real itinerary, inclusions/exclusions, payment and cancellation policy, T&Cs, a printable itinerary and the live enquiry form. |
| **Bus** | City search with boarding/dropping points. Results use the live filters and sorts, then a seat layout (lower/upper deck, ladies seats), boarding/dropping selection, passenger details, payment and ticket. |
| **Enquiries** | Visa, Group Booking, Cab and Train forms with the live fields, plus a 31-airline Web Check-in directory and Flight Tracking. |
| **Account** | OTP login/sign-up, My Trips, **Find Booking** (reference + first name), cancellation with a refund quote from the fare/room/bus rules, saved travellers, enquiries, and an INR / CAD / GBP display currency. |
| **Content** | Offers & coupons, blog, About, Terms, Payment Security, Privacy, Cancellation and Refund policies, Contact/appointment form. |

### Prototype conventions
- Search results are generated deterministically, so the same route and date always show the same flights and prices, and saved bookings stay consistent.
- The OTP appears in an on-screen notification. Any UPI ID in `name@bank` format works. Test card: `4111 1111 1111 1111`, any future expiry, any CVV. Never enter real card details.
- Payment has a "simulate a failed payment" switch for demos.
- Exclusive fares show "confirmation in progress", then confirm after about a minute (the live site says 30–45 minutes).
- Bookings, enquiries and reviews are stored in the browser (`localStorage`) on the device where they were made.
- Package images, offer banners and airline logos load from the live site's content CDN, with local fallback photos. Hotel photos are Unsplash images.

## 5-minute demo script
1. **Home**: watch the opening (first visit), then search **Mumbai → Delhi**. Switch **Round Trip** to see the calendar with fare hints.
2. **Results**: tap a date in the fare strip, filter by **Direct** + **Morning**, open **Flight Details** → *Fare Summary & Rules*, then **More Fare** to compare fare families.
3. **Book Now** on an *Exclusive Fare* → accept the notice → traveller details → **Continue** → log in with any email (the OTP appears on screen) → pay with UPI `demo@okhdfcbank` → "confirmation in progress" → confirmed about a minute later.
4. Book an *Online/Flexi* fare to see **Seat & Meal** (seat map, meals, +5 Kg baggage) → pay with test card `4111 1111 1111 1111`.
5. **Find Booking** with the reference and first name → **Cancel booking** to see the refund quote.
6. **Hotels**: Goa → filter **4 Star** → pick a hotel → choose a *Breakfast · Refundable* rate → Hotel Review → apply `TEST00001KA` → pay → open the voucher and **Cancel booking** (full refund inside the free-cancellation window).
7. **Bus**: Delhi → Jaipur → View Seats → pick seats plus boarding/dropping points → passenger details → pay.
8. **Holidays**: open *Goa* or *Maldives* → itinerary, inclusions, policies → send an enquiry. Also try the **Visa / Group / Cab / Train** enquiry forms.
9. Switch currency **INR → CAD/GBP**, and try it all on a phone (bottom tab bar, full-screen pickers and filter sheets).

## Project layout
See `ARCHITECTURE.md` for the module map, view contract, helpers and CSS conventions.
- `public/js/engines/` — the swap points for real APIs: `flights.js` (e.g. a GDS/aggregator), `hotels.js`, `buses.js`, `bookings.js` (orders, payments, cancellations, enquiries).
- `public/js/data/` — live-site content (`content.js`, `packages.js`, `pages.js`) and reference data (airports, airlines, cities, promos).
- `public/careers.html` and `public/careers/` — the Careers page (see below). Submitted applications go to `data/careers/`.

## Content to confirm before launch
These items were imported as they appear on aeroskys.com and need a business decision:
1. **Coupon TRAVO200** is displayed with an expiry of 31 Jan 2025 (already past). The prototype accepts it (flat ₹200 off flights).
2. **Coupon TEST00001KA** (Radisson offer) looks like a test code. The prototype treats it as 10% off hotels (max ₹1,000), a placeholder rule.
3. The policy pages contain template placeholders ("[My Company]", "company@gmail.com", "…customer service team at ."). The prototype replaces them with customercare@aeroskys.com.
4. The Handpicked tabs file **Krabi Phuket** under Domestic and **Tirupati Balaji** under International. The prototype files them by actual region.
5. Top-search links use airport codes **WTC** ("New York") and **CIR** ("Cairo"), which are wrong (WTC is not a New York airport; CIR is Cairo, Illinois). The prototype uses JFK and CAI.
6. Footer route labels on the live site are reversed relative to their links (e.g. "Dehra Dun to DELHI" searches DEL→DED).
7. The WhatsApp button uses the main support number (9526956609). Confirm the WhatsApp Business number.
8. The FAQ on the live Holidays page is empty. The prototype's FAQs are written from the published policies.
9. Currency conversion rates (₹61.2 per CAD, ₹112.6 per GBP) are indicative placeholders.

Assumptions made in the prototype where the live site gave no answer:

10. **Hotel inventory** (names, photos, room types, prices) is generated. The live site's hotel results come from its supplier feed. Hotel GST follows the current slabs: 5% up to ₹7,500 per night, 18% above. Stays abroad show 10% "taxes & fees".
11. **BUS10** is a prototype-only code modelled on the live "up to 10% instant discount on bus" offer.
12. **Cab** seating is Mini 4, Prime Sedan 4 and Prime SUV 6. **Group booking** departure time defaults to "Any time".
13. The **Visa** destination list is authored and shows no fees. Confirm the countries and fees you want to advertise.
14. Hotel and bus **cancellation charges** are prototype rules. Hotels: free until the rate's deadline, then 25%. Buses: 10% / 25% / 50% charge by time to departure (48+ h / 24–48 h / 6–24 h), no refund within 6 hours. Replace them with the supplier rules.

## Careers page (added 29 Sep 2026)
A dedicated page, rebuilt from the 14 screens in the *Aeroskys Client Design Reference* document, for three roles: **AeroForce TAG Manager**, **TASA – Travel Sales Associate** and **HR & Recruitment Specialist**.

- **Open it:** `http://localhost:3000/careers` with `npm start`, or `public/careers.html` on any static host.
- **From the main site:** "Careers" in the top navigation (with a "Hiring" badge on wide screens), in the phone menu, and in the footer.
- **Back to the main site:** "← Back to Aeroskys.com" above the header, the logo, and the footer links.
- **Sections:** header, landing, role introduction, Building the Direction, What the Job Actually Is, Performance Pay (with a pay calculator and the six-month ladder), Candidate Profile (a tick-list self-check), HR & Recruitment Specialist, How We Hire (four steps), then the application (About You → the role's questions → final details and CV).

**Applications**
- **Endpoint:** the form posts to `POST /api/careers/applications` (in `server.mjs`).
- **Server checks:** it re-validates every field. The CV must be a real PDF, DOC or DOCX (the file content is checked, not only the name) and 10 MB at most.
- **Duplicates:** a retried submission returns the original reference instead of creating a duplicate.
- **Storage:** each application is saved to `data/careers/applications/<reference>.json`, and the CV to `data/careers/cv/`. That folder is outside `public/` and is never served.
- **Success message:** the "Application received" screen appears only when the server returns a reference.
- **When it fails:** the page says so and offers **Try again**, **Download my answers** and **Email us instead**. On a static host with no endpoint, it says online submission isn't available.
- **Drafts:** answers are saved on the applicant's device as they type (not the CV file). The browser's Back and Forward buttons move between form steps.
- **Integration point:** to use an ATS or HR system, replace the endpoint. The request and response format is in `ARCHITECTURE.md`.

**Images**
- Every image comes from the reference document's own screens, cropped at their original resolution.
- Where the design had a card or caption drawn over a photo, that patch was retouched so the live card can sit on top.
- No stock or generated photos are used.
- `tools/careers_images.py` rebuilds all 27 files from the unzipped document (optional; needs Python with Pillow and OpenCV).
- **Resolution limit:** the reference screens are only 1,023–1,536 px wide, so the photos are 1× images. For example, the landing photo is 1,294 px wide. They look soft on high-density (Retina) screens.
- **To sharpen them:** send the original photographs. Replace the files in `public/careers/img/`, keeping the same names and crops, and raise the `?v=` number on their URLs in `careers.html` (currently `?v=4`) so browsers fetch the new versions.

**Careers content to confirm before launch**
1. **TASA and HR questions.** The reference shows only the TAG Manager questions (used word for word). The TASA (7) and HR (9) questions were written for the prototype and need approval.
2. **TASA career ladder.** It is marked "indicative" on the page; confirm the milestones.
3. **Replaced statistics.** The reference showed figures we could not verify: 15,000+, 300+ and 50+ on the landing screen, "98% Partner Satisfaction" and "40% Cost Savings", and "AI matched 98%". They were replaced with facts from the role brief (pay, four hiring steps, the four travel services). Send real figures if you want them shown.
4. **"Roughly two weeks"** from application to offer: confirm it holds for all three roles. The page says the four steps apply to the TAG Manager role.
5. **Pay:**
   - TAG Manager: ₹42,000 fixed base, plus a monthly bonus from ₹0 (below 70% of benchmark) to ₹1,00,000 (above 130%).
   - HR: ₹15,000 a month plus a quarterly bonus.
   - Confirm these can be published. The bonus is described as variable and not guaranteed.
6. **Contact email.** customercare@aeroskys.com is used for questions and emailed applications. Send a careers address if you have one.
7. **Replaced reference elements:**
   - "Watch Story" and "Watch Overview" became "Read our story" and "View role details", because there is no video.
   - The unrelated logo strip (Airbnb and others) became an "Also hiring" strip.
   - The HR photo carousel is captioned with hiring stages (Sourcing, Screening and so on), not staff names.
8. **Language menu** offers English only.
9. **Data handling.** Applications are plain files on the server. Decide who can read them, how long they are kept, and add that to the privacy policy.

## Quality checks (29 Sep 2026)
Audited in Chrome with Lighthouse 13, axe-core (WCAG 2.2 AA) and html-validate. The audit scripts ran outside the project, so nothing is installed here.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Careers, desktop | 100 | 100 | 100 | 100 |
| Careers, phone | 92 | 100 | 100 | 100 |
| Home, desktop | 88 | 100 | 100 | 100 |
| Home, phone | 72 | 100 | 100 | 100 |

- **Accessibility:** no axe violations on the 33 main-site routes at desktop and phone widths. That includes the pickers, the login dialog and the filter sheets. The Careers page is also clean in every state: menus, story dialog, form errors, failed and successful submission.
- **Layout:** no sideways scrolling and no covered or undersized controls (24px minimum) from 320px to 1920px wide.
- **Markup:** the page sources and the pages as rendered by the scripts are valid HTML.
- **Keyboard:** every control is reachable with a visible focus ring, dialogs and menus trap and return focus, and reduced-motion settings switch the animation off.

**Changes made to the main site during the audit**
- **Contrast:** text colours were darkened by the smallest step that meets WCAG AA: `--blue`, `--muted`, `--faint`, `--green`, `--amber`, and a few badges. Primary buttons are a slightly deeper blue.
- **Login dialog:** it had no styles at all. It now has a navy benefits panel beside the form and six OTP boxes, and it becomes a bottom sheet on phones.
- **Phone menu:** the menu drawer is inert while closed, so keyboard focus can't enter it. Buttons now declare their type, and the ARIA on the fare and cabin radios, star ratings and pill toggles was corrected.
- **Inline handlers:** image fallbacks and "Back to top" no longer use inline handlers. The new security policy blocks those, and `npm run check` now fails if one comes back.
- **Header:** to make room for the Careers link it trims itself in steps as the window narrows, in this order: the "Hiring" badge, then link spacing, then the phone-number text, then menu icons.
- **Photos:** the 25 local photos were re-encoded, from 7.5 MB to 4.4 MB. Destination photos are capped at 1,200px because they only appear in cards.
- **Layout shift:** the page area reserves a full screen while a view loads, so the footer no longer jumps (layout shift went from 0.3 to 0).

**Server (`server.mjs`)**
- Brotli/gzip compression.
- Security headers, plus a Content-Security-Policy that allows the pages' inline scripts by hash.
- A real 404 for missing files.
- One-year caching for fonts and versioned assets; everything else is revalidated.
- `robots.txt` allows indexing. Change it to `Disallow: /` if you host a staging copy.

**Known limits**
- **Home page speed on phones** is held back by two things:
  - the brand intro, which hides content on a first visit (by design);
  - the offer banners, which come from the live site's CDN as 400–540 KB PNGs. Serve resized banners from the CDN in production.
- **Browsers:** tested in Chrome and Edge (Chromium). Safari and Firefox weren't available on this machine. The CSS uses container queries, `:has()` and `@property`, which current versions of both support.

## Website copy (rewritten 29 Sep 2026)
At the client's request, the marketing copy was rewritten in plain, benefit-first language. Booking rules, offers, policies, package details and FAQ answers were not changed.
- **Where the wording changed:**
  - The four hero banners (Home, Hotels, Holidays, Bus).
  - Every section heading and intro line on those pages.
  - The "What's new" tickers.
  - The home coupon card.
  - The "Why book with us" cards.
  - The destination carousel.
  - The reviews and FAQ headings.
  - The footer call to action.
  - The login pop-up benefits.
  - The page banners for Offers, Web Check-in, Cab, Visa, Blog and Contact.
- **Where to edit it:** hero text is in `public/js/ui/hero.js`. Shared content (ticker, coupon card, "Why book with us") is in `public/js/data/content.js`. Section headings sit in each page's view file under `public/js/views/`.
- **Headline length:** keep each hero headline line under about 16 characters, so it stays on two lines on a 320px phone.
- **Please approve:** the ticker now states the TRAVO200 code, free cancellation on many hotel rooms, student and senior fares, group fares and the 24/7 number. Confirm these are the messages you want to promote.
