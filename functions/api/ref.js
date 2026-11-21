/* /api/ref — programa de referidos (solo panel, x-admin-pass).
   GET → lista con visitas · POST {guardar:{nombre,contacto,premio,beneficio}} · POST {borrar:codigo} */
import { json, cut, isAdmin, listAll, body } from "./_util.js";
const slug = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
export async function onRequest({ request, env }) {
  const KV = env.BASHI_KV; if (!KV) return json({ error: "KV no configurado" }, 500);
  if (!isAdmin(request, env)) return json({ error: "No autorizado" }, 401);
  if (request.method === "GET") {
    const ks = await listAll(KV, "ref:");
    const all = (await Promise.all(ks.map(async k => {
      try { const r = JSON.parse(await KV.get(k.name)); r.visitas = parseInt((await KV.get("refv:" + r.c)) || "0", 10); return r; } catch (e) { return null; }
    }))).filter(Boolean);
    return json(all.sort((a, b) => b.creado.localeCompare(a.creado)));
  }
  const b = await body(request);
  if (typeof b.borrar === "string") { const c = slug(b.borrar); await KV.delete("ref:" + c); await KV.delete("refv:" + c); return json({ ok: true }); }
  const g = b.guardar || {};
  const nombre = cut(g.nombre, 60); if (!nombre) return json({ error: "Falta el nombre" }, 400);
  let c = slug(g.codigo || nombre) || "ref"; let prev = null;
  try { prev = JSON.parse(await KV.get("ref:" + c)); } catch (e) {}
  if (prev && !g.codigo) { let i = 2; while (await KV.get("ref:" + c + "-" + i)) i++; c = c + "-" + i; prev = null; }
  const r = { c, nombre, contacto: cut(g.contacto, 40).replace(/[^\d+]/g, ""), premio: cut(g.premio, 120), beneficio: cut(g.beneficio, 120), creado: prev ? prev.creado : new Date().toISOString() };
  await KV.put("ref:" + c, JSON.stringify(r));
  return json({ ok: true, ref: r });
}
