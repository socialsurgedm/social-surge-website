/**
 * /portal/martinco/* — signed-cookie session gate.
 * No valid session -> redirect to /portal/ (login). Everything noindexed, no-store.
 */
const SECRET = "ss-mc-portal-2026-8f3a1c9e7b2d4056a1e8c3f7d9b0e412";
const COOKIE = "ss_mc";

async function sign(payload) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequest(context) {
  const cookies = context.request.headers.get("Cookie") || "";
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  let ok = false;
  if (m) {
    const [b64, sig] = m[1].split(".");
    if (b64 && sig) {
      try {
        const payload = atob(b64);
        const expect = await sign(payload);
        const exp = parseInt(payload.split("|")[1], 10);
        ok = expect === sig && exp > Math.floor(Date.now() / 1000);
      } catch (e) { ok = false; }
    }
  }
  if (!ok) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL("/portal/", context.request.url).toString(),
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }
  const response = await context.next();
  const r = new Response(response.body, response);
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  r.headers.set("Cache-Control", "no-store");
  return r;
}
