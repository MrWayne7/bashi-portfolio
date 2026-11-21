/* /api/prop — propuestas.
   Panel (x-admin-pass): GET /api/prop → lista · POST /api/prop {guardar:{...}} crea/edita · POST {borrar:id}
   Público: GET /api/prop/<id> → la propuesta (marca "vista") · POST /api/prop/<id> {acepto:"Nombre"} → aceptada */
import { json, cut, url, lines, isAdmin, token, listAll, body, aviso } from "../_util.js";
const limpiar = (p, prev) => ({
  id: prev ? prev.id : token(8),
  creada: prev ? prev.creada : new Date().toISOString(),
  cliente: cut(p.cliente, 80), contacto: cut(p.contacto, 40).replace(/[^\d+]/g, ""), servicio: cut(p.servicio, 60),
  titulo: cut(p.titulo, 100), intro: cut(p.intro, 900),
  alcance: lines(p.alcance, 14), entregables: lines(p.entregables, 14), cronograma: lines(p.cronograma, 12),
  precio: cut(p.precio, 40), anticipo: Math.max(0, Math.min(100, parseInt(p.anticipo, 10) || 0)),
  pago: url(p.pago), valida: cut(p.valida, 10).replace(/[^\d-]/g, ""), notas: cut(p.notas, 500),
  lang: p.lang === "en" ? "en" : "es",
  estado: prev ? prev.estado : "enviada", vista: prev ? prev.vista : null, acepto: prev ? prev.acepto : null,
  vistas: prev ? prev.vistas || 0 : 0, ultima: prev ? prev.ultima || null : null, segs: prev ? prev.segs || [] : []
});
const publica = p => { const o = Object.assign({}, p); delete o.contacto; delete o.notas; delete o.segs; delete o.vistas; delete o.ultima; return o; };
export async function onRequest({ request, env, params }) {
  const KV = env.BASHI_KV; if (!KV) return json({ error: "KV no configurado" }, 500);
  const id = (params.id || [])[0] || "";
  if (!id) {
    if (!isAdmin(request, env)) return json({ error: "No autorizado" }, 401);
    if (request.method === "GET") {
      const ks = await listAll(KV, "prop:");
      const all = (await Promise.all(ks.map(async k => { try { return JSON.parse(await KV.get(k.name)); } catch (e) { return null; } }))).filter(Boolean);
      return json(all.sort((a, b) => b.creada.localeCompare(a.creada)));
    }
    const b = await body(request);
    if (typeof b.borrar === "string") { await KV.delete("prop:" + b.borrar.replace(/[^a-z0-9]/g, "")); return json({ ok: true }); }
    if (typeof b.seguimiento === "string") {
      const k = "prop:" + b.seguimiento.replace(/[^a-z0-9]/g, ""); let q = null; try { q = JSON.parse(await KV.get(k)); } catch (e) {}
      if (!q) return json({ error: "No existe" }, 404);
      q.segs = (q.segs || []).concat([new Date().toISOString()]).slice(-10); await KV.put(k, JSON.stringify(q)); return json({ ok: true, prop: q });
    }
    if (b.guardar && typeof b.guardar === "object") {
      let prev = null; const gid = cut(b.guardar.id, 12).replace(/[^a-z0-9]/g, "");
      if (gid) { try { prev = JSON.parse(await KV.get("prop:" + gid)); } catch (e) {} }
      const p = limpiar(b.guardar, prev);
      if (!p.cliente) return json({ error: "Falta el cliente" }, 400);
      await KV.put("prop:" + p.id, JSON.stringify(p));
      return json({ ok: true, prop: p });
    }
    return json({ error: "Nada que hacer" }, 400);
  }
  const key = "prop:" + id.replace(/[^a-z0-9]/g, "");
  let p = null; try { p = JSON.parse(await KV.get(key)); } catch (e) {}
  if (!p) return json({ error: "No existe" }, 404);
  if (request.method === "GET") {
    if (!isAdmin(request, env)) {
      const ahora = new Date().toISOString();
      if (!p.vista) { p.vista = ahora; if (p.estado === "enviada") p.estado = "vista"; }
      p.vistas = (p.vistas || 0) + 1; p.ultima = ahora;
      await KV.put(key, JSON.stringify(p));
    }
    return json(publica(p));
  }
  if (request.method === "POST") {
    const b = await body(request);
    if (b.web) return json({ ok: true });
    const nombre = cut(b.acepto, 80);
    if (!nombre) return json({ error: "Escribe tu nombre para aceptar" }, 400);
    if (p.estado !== "aceptada") {
      p.estado = "aceptada"; p.acepto = { nombre, t: new Date().toISOString() };
      await KV.put(key, JSON.stringify(p));
      await aviso(KV, request, { nombre: p.cliente, contacto: p.contacto, servicio: "Propuesta aceptada", detalle: (p.titulo || p.servicio) + " · " + p.precio + " · aceptó: " + nombre, origen: "/p/" + p.id });
    }
    return json({ ok: true, prop: publica(p) });
  }
  return json({ error: "Método no permitido" }, 405);
}
