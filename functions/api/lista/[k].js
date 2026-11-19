/* /api/lista/testimonios y /api/lista/tienda
   GET: público (lo que se muestra en el sitio). POST: solo el panel (x-admin-pass), guarda la lista completa. */
const OK = ["testimonios", "tienda"];
const H = { "content-type": "application/json; charset=utf-8" };
const cut = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const url = v => { v = cut(v, 400); return /^https:\/\//.test(v) ? v : ""; };
const LIMPIAR = {
  testimonios: t => ({ nombre: cut(t.nombre, 60), rol: cut(t.rol, 80), texto: cut(t.texto, 500), caso: cut(t.caso, 80).replace(/[^a-z0-9\/\-]/g, ""), servicio: cut(t.servicio, 30) }),
  tienda: p => ({ id: cut(p.id, 40).replace(/[^a-z0-9\-]/g, ""), nombre: cut(p.nombre, 80), precio: cut(p.precio, 30), desc: cut(p.desc, 400), img: url(p.img), link: url(p.link) })
};
export async function onRequest({ request, env, params }) {
  const k = params.k, KV = env.BASHI_KV;
  if (!OK.includes(k)) return new Response("No", { status: 404 });
  if (!KV) return new Response("[]", { headers: H });
  if (request.method === "GET") return new Response((await KV.get("lista:" + k)) || "[]", { headers: Object.assign({ "cache-control": "public, max-age=60" }, H) });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!env.ADMIN_PASS || request.headers.get("x-admin-pass") !== env.ADMIN_PASS) return new Response('{"error":"No autorizado"}', { status: 401, headers: H });
  let b; try { b = await request.json(); } catch (e) { return new Response('{"error":"JSON inválido"}', { status: 400, headers: H }); }
  const list = (Array.isArray(b) ? b : []).slice(0, 60).map(LIMPIAR[k]).filter(x => x.nombre && (k === "tienda" ? x.link : x.texto));
  await KV.put("lista:" + k, JSON.stringify(list));
  return new Response(JSON.stringify({ ok: true, n: list.length }), { headers: H });
}
