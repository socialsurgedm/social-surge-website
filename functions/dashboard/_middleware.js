/**
 * /dashboard/* — HTTP Basic Auth gate (internal Social Surge client dashboard).
 * Runs after the root middleware. Everything under /dashboard/ (including
 * /dashboard/data/*.json) requires credentials.
 */
const REALM = "Social Surge Dashboard";

// timing-safe-ish comparison (constant work over the longer string)
function safeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function onRequest(context) {
  const AUTH_USER = "jack@social-surge.co.uk";
  const AUTH_PASS = "Willow2024.";

  const header = context.request.headers.get("Authorization") || "";
  let ok = false;
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      ok = safeEqual(user, AUTH_USER) && safeEqual(pass, AUTH_PASS);
    } catch (e) {
      ok = false;
    }
  }

  if (!ok) {
    return new Response("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const response = await context.next();
  const r = new Response(response.body, response);
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  r.headers.set("Cache-Control", "no-store");
  return r;
}
