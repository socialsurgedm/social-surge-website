/**
 * POST /api/portal-login — Martin & Co portal login.
 * Credentials are read from Cloudflare Pages env secrets (never hardcoded):
 *   PORTAL_USERS_JSON  — JSON object: { "email@example.com": "plaintext-password", ... }
 *   PORTAL_SECRET      — HMAC signing secret for session tokens
 *
 * Rate limit: 5 failed attempts per IP per 10 minutes.
 * Session cookie: HttpOnly, Secure, SameSite=Strict, 30 days.
 */

const COOKIE = "ss_mc";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const RATE_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT = 5;

const failedAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = failedAttempts.get(ip) || { count: 0, since: now };
  if (now - entry.since > RATE_WINDOW) { failedAttempts.delete(ip); return true; }
  return entry.count < RATE_LIMIT;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = failedAttempts.get(ip) || { count: 0, since: now };
  failedAttempts.set(ip, now - entry.since > RATE_WINDOW
    ? { count: 1, since: now }
    : { count: entry.count + 1, since: entry.since });
}

function safeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const secret = context.env.PORTAL_SECRET;
  if (!secret) {
    console.error("portal-login: PORTAL_SECRET env var not set");
    return new Response("Server configuration error", { status: 500 });
  }

  let users = {};
  try {
    users = JSON.parse(context.env.PORTAL_USERS_JSON || "{}");
  } catch {
    console.error("portal-login: PORTAL_USERS_JSON is not valid JSON");
  }

  const ip = context.request.headers.get("cf-connecting-ip") || "unknown";

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return Response.redirect(new URL("/portal/?err=2", context.request.url).toString(), 302);
  }

  let email = "", pass = "";
  try {
    const form = await context.request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    pass = String(form.get("password") || "");
  } catch {
    // fall through to failed auth
  }

  const expected = users[email];
  if (!expected || !safeEqual(pass, expected)) {
    recordFailure(ip);
    return Response.redirect(new URL("/portal/?err=1", context.request.url).toString(), 302);
  }

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${email}|${exp}`;
  const sig = await sign(payload, secret);
  const token = btoa(payload) + "." + sig;

  const headers = new Headers();
  headers.set("Set-Cookie",
    `${COOKIE}=${token}; Path=/portal; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`);
  headers.set("Location", new URL("/portal/martinco/", context.request.url).toString());
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(null, { status: 302, headers });
}
