# Social Surge — Lead Form Field Requirements
_Spec written 16 Sep 2026. Covers every public form that posts to `/api/lead` (Cloudflare Pages Function → Gmail API → jack@social-surge.co.uk). Portal login (`/portal/`) is auth, not a lead form — listed at the end for completeness._

---

## 1. Forms In Scope

| # | Page | `form_type` value | Email label generated |
|---|---|---|---|
| 1 | `/contact/` | `contact` | Contact Enquiry |
| 2 | `/audit/` | `audit` | Free Audit Request |
| 3 | `/lp/ecommerce/` | `lp-ecomm` | LP Audit Request (ecomm) |
| 4 | `/lp/cycling/` | `lp-cycling` | LP Audit Request (cycling) |
| 5 | `/lp/fishing/` | `lp-fishing` | LP Audit Request (fishing) |
| 6 | `/lp/outdoor-hobbyist/` | `lp-hobbyist` | LP Audit Request (hobbyist) |
| 7 | `/lp/attribution-audit/` | `lp-attribution` | LP Audit Request (attribution) |

All post `application/x-www-form-urlencoded` via `POST /api/lead`. Success → 302 redirect to `/thanks/?src=<form_type>`. LPs are nav-free and unlinked (paid/outreach traffic only).

---

## 2. Field Requirements — Master Definition

### 2.1 `name` — Full name
- Type: `text`, autocomplete `name`
- **Required: YES (all forms)** — client `required` attr + server 422 if empty
- Server: trimmed, max 200 chars
- Used in email subject and Reply-To header (CR/LF/quotes stripped server-side — header injection protection)

### 2.2 `email` — Email address
- Type: `email`, autocomplete `email`
- **Required: YES (all forms)** — client + server
- Server: trimmed, max 200 chars, must match `^[^@\s]+@[^@\s]+\.[^@\s]+$` else 422
- Used as Reply-To so Jack can reply directly from the notification email

### 2.3 `website` — Business website URL
- Type: `url`, placeholder `https://`, autocomplete `url`
- **Required: YES on audit + all 5 LPs. Optional on /contact/** (deliberate — contact page accepts pre-launch/general enquiries)
- Client: browser URL validation (must include scheme)
- Server: trimmed, max 300 chars, no format validation (accepted as-is, rendered escaped)

### 2.4 `monthly_ad_spend` — Monthly ad spend band
- Type: `select`, single choice
- **Required: NO (all forms)** — deliberate: qualification signal, not a gate; forcing it costs conversions
- Server: trimmed, max 50 chars
- Allowed values (must stay in sync across all 7 forms):
  - `""` (unselected / "Select…")
  - `not-yet-advertising`
  - `under-2500`
  - `2500-10000`
  - `10000-50000`
  - `over-50000`
- Any change to bands must be applied to `build_lp.py` + contact + audit simultaneously

### 2.5 `message` — Free-text brief
- Type: `textarea`, 8 rows
- **Present on /contact/ and /audit/ only. NOT on LPs** (LP forms are intentionally 4-field low-friction)
- Required: YES on /contact/ (client-side only), NO on /audit/
- Server: trimmed, max 5,000 chars, no server-side required check (server treats it as optional on all forms)
- Rendered `white-space:pre-wrap`, HTML-escaped

### 2.6 `form_type` — Source identifier (hidden)
- Type: `hidden`, one of the 7 values in §1
- Server: max 20 chars, defaults to `contact` if missing
- Drives: email subject label, `/thanks/?src=` param, GA4 `form_type` custom dimension on the `generate_lead` key event (GA4 property 515525938)
- **New LPs MUST use an `lp-` prefix** to inherit the "LP Audit Request (x)" labelling automatically

### 2.7 `company_hp` — Honeypot (hidden anti-spam)
- Type: `text`, `tabindex="-1"`, `autocomplete="off"`, visually hidden with label
- Required: must be EMPTY. If filled, server silently redirects to `/thanks/` without sending (bot swallowed, no signal given)
- Must be present on every lead form, including future ones

---

## 3. Per-Form Field Matrix

| Field | /contact/ | /audit/ | All 5 LPs |
|---|---|---|---|
| name | ✅ required | ✅ required | ✅ required |
| email | ✅ required | ✅ required | ✅ required |
| website | ⬜ optional | ✅ required | ✅ required |
| monthly_ad_spend | ⬜ optional | ⬜ optional | ⬜ optional |
| message | ✅ required | ⬜ optional | ➖ not present |
| form_type (hidden) | ✅ | ✅ | ✅ |
| company_hp (honeypot) | ✅ | ✅ | ✅ |

---

## 4. Server-Side Contract (`functions/api/lead.js`)

1. Non-parseable body → **400**
2. Honeypot filled → **302 to /thanks/** (silent drop)
3. Missing `name`, or missing/invalid `email` → **422 "Missing or invalid fields"**
4. All string inputs trimmed + length-capped (name 200 / email 200 / website 300 / spend 50 / message 5000 / form_type 20)
5. All values HTML-escaped before rendering into the notification email
6. Reply-To name sanitised against header injection (`\r \n "` stripped)
7. Gmail send failure → **500** with fallback copy pointing to hello@social-surge.co.uk
8. Success → 302 `/thanks/?src=<form_type>`
9. Notification email: From hello@social-surge.co.uk → To jack@social-surge.co.uk, subject `🔥 New lead — <label> — <name>`

---

## 5. Tracking Requirements

- Every successful submit must land on `/thanks/` where GA4 fires `generate_lead` (key event) with `form_type` custom dimension
- Consent Mode v2 banner (`assets/js/consent.js`, localStorage `ss_consent`) governs GA4 collection — leads still send via `/api/lead` regardless of consent state (email is first-party server-side, not analytics)
- Any new form: add hidden `form_type`, keep `lp-` prefix convention, verify the value shows in GA4 within 24h of launch

---

## 6. Known Gaps / Backlog (not currently enforced)

1. **Server doesn't enforce `website` on audit/LP forms** — client-only. A curl bypass can submit without it. Low risk (honeypot + email regex still apply).
2. **Server doesn't enforce `message` on /contact/** — client-only, same reasoning.
3. **No rate limiting** on `/api/lead` — honeypot is the only bot defence. If spam volume rises: add Cloudflare Turnstile (invisible) or a per-IP rate rule in CF dashboard.
4. **No URL format validation server-side** for `website`.
5. **No email deliverability check** (MX lookup) — regex only. Acceptable at current volume.

Decision rule: leave gaps 1–5 alone until lead spam or junk-lead volume becomes a real cost. Every added gate costs conversion rate.

---

## 7. Rules for Adding a New Lead Form

1. Generate LPs via `website-scripts/build_lp.py` — do not hand-roll
2. Must include: name (req) + email (req) + website (req) + monthly_ad_spend (opt) + hidden `form_type` (`lp-` prefix) + `company_hp` honeypot
3. Spend bands must match §2.4 exactly
4. Post to `/api/lead`, method POST, form-encoded
5. No em/en dashes in any copy (standing rule #8)
6. Verify: submit test lead → email arrives at jack@ → `/thanks/?src=` correct → GA4 `generate_lead` fires with correct `form_type`

---

## 8. Portal Login (out of scope for lead spec)

`/portal/` — `email` (required, autocomplete `username`) + `password` (required, autocomplete `current-password`) → `POST /api/portal-login`. Auth form, not a lead form; no honeypot needed.
