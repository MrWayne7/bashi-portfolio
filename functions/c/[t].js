/* /c/<id> → muestra la página /c/ (el proyecto se carga por JS) */
export async function onRequest({ request, env }) {
  const r = await env.ASSETS.fetch(new Request(new URL("/c/", request.url)));
  return new Response(r.body, { status: r.status, headers: Object.assign(Object.fromEntries(r.headers), { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" }) });
}
