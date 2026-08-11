/**
 * OAuth 2.0 callback for the Jupix API integration.
 *
 * Jupix redirects here after authorization with ?code=... in the query string.
 * The auth code is never stored or logged server-side. It is only revealed
 * on screen after the correct access key is entered (SHA-256 checked in the
 * browser). The code alone is useless without the client secret, is single
 * use, and expires within minutes.
 */

// SHA-256 hash of the access key (key itself is never in this file)
const KEY_HASH = "1ee474a09efd4abdf1bd75727671a76330af8a5e456c388b03e47cd24bb451b5";

const BASE_STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #152337; color: #eaf0f8; min-height: 100vh;
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .card {
    background: #1F3451; border: 1px solid rgba(82,153,224,.25); border-radius: 14px;
    padding: 36px 32px; max-width: 460px; width: 100%; text-align: center;
    box-shadow: 0 12px 40px rgba(0,0,0,.35);
  }
  h1 { font-size: 1.25rem; margin-bottom: 10px; }
  p { font-size: .92rem; line-height: 1.55; color: #b9c6d9; }
  .ok { color: #37BE76; } .err { color: #E44444; }
  input {
    width: 100%; margin-top: 18px; padding: 12px 14px; border-radius: 8px;
    border: 1px solid rgba(82,153,224,.4); background: #152337; color: #eaf0f8;
    font-size: 1rem; text-align: center; letter-spacing: .08em;
  }
  button {
    width: 100%; margin-top: 12px; padding: 12px 14px; border-radius: 8px; border: 0;
    background: #5299E0; color: #fff; font-size: .95rem; font-weight: 600; cursor: pointer;
  }
  button:hover { background: #3f86cf; }
  pre {
    margin-top: 18px; padding: 14px; background: #0e1a2b; border-radius: 8px;
    font-size: .85rem; white-space: pre-wrap; word-break: break-all; text-align: left;
    border: 1px solid rgba(55,190,118,.35); color: #37BE76; display: none;
  }
  .note { margin-top: 14px; font-size: .78rem; color: #7f8ea3; }
`;

function page(title, body, script) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title><style>${BASE_STYLE}</style></head>
<body><div class="card">${body}</div>${script || ""}</body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    }
  );
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || "";

  if (error) {
    return page(
      "Authorization failed",
      `<h1 class="err">Authorization failed</h1>
       <p>The provider returned an error: <strong>${error.replace(/[<>&"]/g, "")}</strong></p>
       <p class="note">Social Surge integration endpoint</p>`
    );
  }

  if (!code) {
    return page(
      "Social Surge",
      `<h1>Integration endpoint</h1>
       <p>This URL handles authorization callbacks for Social Surge integrations. There is nothing to see here.</p>
       <p class="note">social-surge.co.uk</p>`
    );
  }

  // Code present: reveal only after the correct access key is entered.
  const safeCode = code.replace(/[^A-Za-z0-9._~+/=-]/g, "");
  return page(
    "Authorization received",
    `<h1 class="ok">&#10003; Authorization received</h1>
     <p>An authorization code has been issued. Enter the access key to reveal it.</p>
     <input id="k" type="password" placeholder="Access key" autocomplete="off" autofocus>
     <button id="b">Unlock</button>
     <pre id="c"></pre>
     <p class="note">The code is single use, expires in minutes, and is useless without the client secret. Nothing is stored on this server.</p>`,
    `<script>
      const CODE = ${JSON.stringify(safeCode)};
      const HASH = "${KEY_HASH}";
      async function sha256(s){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
      async function unlock(){
        const v=document.getElementById("k").value.trim();
        if(await sha256(v)===HASH){
          const el=document.getElementById("c");
          el.textContent=CODE; el.style.display="block";
        } else {
          document.getElementById("k").value="";
          document.getElementById("k").placeholder="Wrong key, try again";
        }
      }
      document.getElementById("b").addEventListener("click",unlock);
      document.getElementById("k").addEventListener("keydown",e=>{if(e.key==="Enter")unlock()});
    </script>`
  );
}
