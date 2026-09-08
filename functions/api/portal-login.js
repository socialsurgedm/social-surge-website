/**
 * POST /api/portal-login — Martin & Co portal login.
 * Verifies email+password, sets signed HttpOnly session cookie (30 days).
 * Not linked anywhere public; portal pages are noindexed.
 */
const USERS = {
  "jack@social-surge.co.uk": "MC-Exeter!7364-Portal",
};
const SECRET = "ss-mc-portal-2026-8f3a1c9e7b2d4056a1e8c3f7d9b0e412";
const COOKIE = "ss_mc";
const MAX_AGE = 60 * 60 * 24 * 30;

function safeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function sign(payload) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  let email = "", pass = "";
  try {
    const form = await context.request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    pass = String(form.get("password") || "");
  } catch (e) { /* fall through */ }

  const expected = USERS[email];
  if (!expected || !safeEqual(pass, expected)) {
    return Response.redirect(new URL("/portal/?err=1", context.request.url).toString(), 302);
  }

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${email}|${exp}`;
  const sig = await sign(payload);
  const token = btoa(payload) + "." + sig;

  const headers = new Headers();
  headers.set("Set-Cookie",
    `${COOKIE}=${token}; Path=/portal; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  headers.set("Location", new URL("/portal/martinco/", context.request.url).toString());
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(null, { status: 302, headers });
}
