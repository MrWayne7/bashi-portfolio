/* /r/<código> — link de referido: cuenta la visita y lleva a la portada con el código. Sin cookies. */
export async function onRequest({ request, env, params }) {
  const c = String(params.code || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const u = new URL(request.url); const dest = new URL("/", u.origin);
  const KV = env.BASHI_KV;
  if (KV && c) {
    let r = null; try { r = JSON.parse(await KV.get("ref:" + c)); } catch (e) {}
    if (r) {
      const n = parseInt((await KV.get("refv:" + c)) || "0", 10) + 1;
      await KV.put("refv:" + c, String(n));
      dest.searchParams.set("ref", c);
      dest.searchParams.set("de", r.nombre.split(" ")[0]);
      if (r.beneficio) dest.searchParams.set("b", r.beneficio);
    }
  }
  return new Response(null, { status: 302, headers: { location: dest.pathname + dest.search, "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
