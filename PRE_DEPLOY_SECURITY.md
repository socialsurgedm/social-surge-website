# Pre-Deploy Security Checklist — Social Surge Sites
> Run before every deploy of `website/` or `ops_portal/`. No deploy without a clean pass.
> Added: 2026-10-23 (Jack standing rule)

---

## Quick-run script

```bash
cd /Users/jackgoldsmith/.openclaw/workspace

echo "=== 1. Hardcoded creds ===" && \
  grep -rn --include="*.js" -E "(password|secret)\s*[:=]\s*['\"][^'\"]{8,}" website/functions/ 2>/dev/null | grep -v "env\." || echo "PASS"

echo "=== 2. innerHTML sinks ===" && \
  grep -n "innerHTML" ops_portal/src/index.js | \
  grep -v "= ''\|= \"\"\|escapeHtml\|<thead\|no job\|no recent\|Disabled\|Run</button\|\.length" || echo "PASS"

echo "=== 3. _headers count (must be 6) ===" && \
  grep -c "Content-Security-Policy\|Strict-Transport-Security\|X-Frame-Options\|X-Content-Type-Options\|Referrer-Policy\|Permissions-Policy" website/_headers

echo "=== 4. Open redirects ===" && \
  grep -rn "Response.redirect" website/functions/ 2>/dev/null | grep -v "\/portal\/\|\/thanks\/\|request\.url" || echo "PASS"

echo "=== 5. Backtick balance ===" && python3 - << 'EOF'
lines = open('ops_portal/src/index.js').read().split('\n')
depth = 0; count = 0
for i, line in enumerate(lines, 1):
    for j, c in enumerate(line):
        if c == '`' and (j == 0 or line[j-1] != '\\'): depth ^= 1; count += 1
print('balanced:', depth == 0, '| pairs:', count // 2)
EOF

echo "=== 6. .env in deploy dir ===" && \
  ls website/.env 2>/dev/null && echo "WARNING: remove before deploy" || echo "PASS"
```

**Expected results:**
| Check | Must show |
|---|---|
| 1. Hardcoded creds | PASS |
| 2. innerHTML sinks | PASS |
| 3. _headers count | `6` |
| 4. Open redirects | PASS |
| 5. Backtick balance | `balanced: True \| pairs: 2` |
| 6. .env | PASS |

---

## What each check catches

### 1 — Hardcoded credentials
All secrets must come from `context.env.VAR_NAME` (Pages functions) or `env.VAR_NAME` (Worker). Any plaintext password, API key, or secret in source → move to Cloudflare secrets before deploying.

### 2 — XSS: innerHTML with unescaped external data
Any `innerHTML` assignment concatenating or interpolating a variable from API/user data must wrap that value in `escapeHtml()`. Numbers and booleans are safe. Hardcoded strings are safe.

### 3 — Security headers intact
**Marketing site `_headers` — required in `/*` block:**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; ...` (must include `form-action 'self'`)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Ops portal `secHeaders()` — must still include:**
`Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Robots-Tag`

If adding a new external resource (script src, font, iframe, fetch), update the CSP directive too.

### 4 — Open redirects
`Response.redirect()` targets must be hardcoded paths or built with `new URL('/known-path', request.url)`. Never redirect to a query param or form field value directly.

### 5 — Ops portal backtick balance (after any SPA edit)
`balanced: True` with exactly 2 pairs (one for `buildSPA`, one for `buildLoginPage`). Extra pair = boundary backtick accidentally escaped → unescape before deploying. See `cloudflare-worker-spa` skill for full recovery detail.

### 6 — New API endpoints
Every new route in the Worker must be behind the `if (!session)` auth guard. POST routes must validate fields. Write routes must check `if (isClient) return forbidden()` where relevant.

### 7 — Form input validation (on any changed form handler)
- Strings: `.slice(0, N)` length limit on every field
- Enumerated fields: validated against a `Set` allowlist, not free-text
- Email: regex validated before use in headers/bodies
- No user input in email header fields (Subject, Reply-To) without stripping `\r\n`

---

## After a clean pass — deploy, then verify live

```bash
# Marketing site
wrangler pages deploy . --project-name social-surge-website --branch main

# Ops portal
cd ops_portal && wrangler deploy

# Verify headers live
curl -sI https://social-surge.co.uk | grep -i "content-security\|strict-transport\|x-frame"
curl -sI https://agents.social-surge.co.uk | grep -i "content-security\|strict-transport\|x-frame"
```

Both must return non-empty lines for all three headers.
