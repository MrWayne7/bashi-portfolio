/* Cloudflare Pages Function -> /api/pricing
   GET  : { pricing, regions, country }  (country = país del visitante, vía Cloudflare)
   POST : guarda { pricing, regions }    (requiere x-admin-pass === ADMIN_PASS) */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-admin-pass"
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" }
  });
}
export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.BASHI_KV;
  const country = request.headers.get("CF-IPCountry") || "";

  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!KV) return json({ pricing: null, regions: null, country, note: "KV no configurado" });

  if (request.method === "GET") {
    const p = await KV.get("pricing");
    const r = await KV.get("regions");
    let pricing = null, regions = null;
    if (p) { try { pricing = JSON.parse(p); } catch (e) {} }
    if (r) { try { regions = JSON.parse(r); } catch (e) {} }
    return json({ pricing, regions, country });
  }

  if (request.method === "POST") {
    const pass = request.headers.get("x-admin-pass") || "";
    const real = env.ADMIN_PASS || "";
    if (!real) return json({ error: "ADMIN_PASS no configurada en el servidor" }, 500);
    if (pass !== real) return json({ error: "No autorizado" }, 401);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }

    if (Array.isArray(body.pricing)) await KV.put("pricing", JSON.stringify(body.pricing));
    if (body.regions && typeof body.regions === "object") await KV.put("regions", JSON.stringify(body.regions));
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
}
