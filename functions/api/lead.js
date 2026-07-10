/**
 * Lead form handler — Cloudflare Pages Function
 * POST /api/lead  (form-encoded from /contact/ and /audit/ forms)
 * Sends the lead to jack@social-surge.co.uk via Gmail API
 * (service account with domain-wide delegation, sends as hello@social-surge.co.uk).
 * Secret required: GMAIL_SA_KEY = full service-account JSON.
 */

const SEND_AS = "hello@social-surge.co.uk";
const SEND_TO = "jack@social-surge.co.uk";

function b64url(data) {
  const str = typeof data === "string" ? data : String.fromCharCode(...new Uint8Array(data));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    sub: SEND_AS,
    scope: "https://www.googleapis.com/auth/gmail.send",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const jwt = `${header}.${claims}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Honeypot — bots fill everything; humans never see this field.
  if (form.get("company_hp")) {
    return Response.redirect(new URL("/thanks/", request.url).toString(), 302);
  }

  const thanksUrl = (t) => {
    const u = new URL("/thanks/", request.url);
    u.searchParams.set("src", t);
    return u.toString();
  };

  const name = (form.get("name") || "").toString().trim().slice(0, 200);
  const email = (form.get("email") || "").toString().trim().slice(0, 200);
  const website = (form.get("website") || "").toString().trim().slice(0, 300);
  const spend = (form.get("monthly_ad_spend") || "").toString().trim().slice(0, 50);
  const message = (form.get("message") || "").toString().trim().slice(0, 5000);
  const formType = (form.get("form_type") || "contact").toString().trim().slice(0, 20);

  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response("Missing or invalid fields", { status: 422 });
  }

  const label = formType === "audit" ? "Free Audit Request"
    : formType.startsWith("lp-") ? `LP Audit Request (${formType.slice(3)})`
    : "Contact Enquiry";
  const subject = `🔥 New lead — ${label} — ${name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#152337">New ${esc(label)} — social-surge.co.uk</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
        <tr><td><b>Name</b></td><td>${esc(name)}</td></tr>
        <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
        <tr><td><b>Website</b></td><td>${esc(website) || "—"}</td></tr>
        <tr><td><b>Monthly ad spend</b></td><td>${esc(spend) || "—"}</td></tr>
      </table>
      <p style="font-size:14px;white-space:pre-wrap;border-left:3px solid #5299E0;padding-left:12px">${esc(message) || "—"}</p>
      <p style="color:#888;font-size:12px">Submitted ${new Date().toISOString()} · form: ${esc(formType)}</p>
    </div>`;

  const mime = [
    `From: Social Surge Website <${SEND_AS}>`,
    `To: ${SEND_TO}`,
    `Reply-To: ${name.replace(/[\r\n"]/g, "")} <${email}>`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");

  try {
    const sa = JSON.parse(env.GMAIL_SA_KEY);
    const token = await getAccessToken(sa);
    const send = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64url(new TextEncoder().encode(mime)) }),
    });
    if (!send.ok) throw new Error(`gmail send failed: ${send.status} ${await send.text()}`);
  } catch (err) {
    console.error("lead send error:", err.message);
    return new Response("Something went wrong — please email hello@social-surge.co.uk directly.", { status: 500 });
  }

  return Response.redirect(thanksUrl(formType), 302);
}
