/**
 * Edge middleware — SEO hygiene:
 * 1. 301 www.social-surge.co.uk -> social-surge.co.uk (single canonical host)
 * 2. Noindex the *.pages.dev preview hosts so they never compete in search
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === "www.social-surge.co.uk") {
    url.hostname = "social-surge.co.uk";
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();

  if (url.hostname.endsWith(".pages.dev")) {
    const r = new Response(response.body, response);
    r.headers.set("X-Robots-Tag", "noindex");
    return r;
  }

  return response;
}
