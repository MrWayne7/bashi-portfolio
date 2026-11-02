/* Cloudflare Pages Function  ->  ruta  /api/overrides
   GET  : devuelve { hidden:[...], added:[...] }  (público, solo lectura)
   POST : guarda los overrides  (requiere cabecera x-admin-pass === ADMIN_PASS)
   Necesita el binding KV  BASHI_KV  y la variable secreta  ADMIN_PASS. */
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

  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Sin KV configurado todavía: respondemos vacío para no romper el sitio
  if (!KV) return json({ hidden: [], added: [], note: "KV no configurado" });

  if (request.method === "GET") {
    const raw = await KV.get("overrides");
    let data = { hidden: [], added: [] };
    if (raw) { try { data = JSON.parse(raw); } catch (e) {} }
    return json({ hidden: data.hidden || [], added: data.added || [] });
  }

  if (request.method === "POST") {
    const pass = request.headers.get("x-admin-pass") || "";
    const real = env.ADMIN_PASS || "";
    if (!real) return json({ error: "ADMIN_PASS no configurada en el servidor" }, 500);
    if (pass !== real) return json({ error: "No autorizado" }, 401);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }

    const clean = {
      hidden: Array.isArray(body.hidden) ? body.hidden.filter(x => typeof x === "string") : [],
      added:  Array.isArray(body.added)  ? body.added.filter(x => x && x.yt) : []
    };
    await KV.put("overrides", JSON.stringify(clean));
    return json({ ok: true, saved: clean });
  }

  return json({ error: "Método no permitido" }, 405);
}
