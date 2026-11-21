/* /api/proy — portal de clientes.
   Panel (x-admin-pass): GET /api/proy → lista · POST {guardar:{...}} · POST {borrar:token}
   Público (con el link privado): GET /api/proy/<token> · POST /api/proy/<token> {comentario:{e,s,txt,quien}} o {aprobar:{e,quien}} */
import { json, cut, url, lines, isAdmin, token, listAll, body, aviso } from "../_util.js";
const yt = v => { v = cut(v, 300); const m = v.match(/(?:youtu\.be\/|shorts\/|embed\/|v=)([A-Za-z0-9_-]{6,})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(v) ? v : ""); };
const fecha = v => cut(v, 10).replace(/[^\d-]/g, "");
const limpiar = (p, prev) => {
  const viejas = prev ? prev.entregas || [] : [];
  return {
    t: prev ? prev.t : token(12), creado: prev ? prev.creado : new Date().toISOString(),
    cliente: cut(p.cliente, 80), proyecto: cut(p.proyecto, 100), contacto: cut(p.contacto, 40).replace(/[^\d+]/g, ""),
    fases: (Array.isArray(p.fases) ? p.fases : []).slice(0, 12).map(f => ({ n: cut(f.n, 60), fecha: fecha(f.fecha), hecho: !!f.hecho })).filter(f => f.n),
    entregas: (Array.isArray(p.entregas) ? p.entregas : []).slice(0, 20).map((e, i) => {
      const old = viejas.find(o => o.id === e.id) || {};
      const link = url(e.link); const y = yt(e.link);
      return { id: cut(e.id, 10) || token(5), titulo: cut(e.titulo, 80), yt: y, link: y ? "" : link, fecha: fecha(e.fecha) || new Date().toISOString().slice(0, 10),
               nota: cut(e.nota, 300), aprobada: old.aprobada || null, comentarios: (old.comentarios || []).concat([]).slice(0, 200) };
    }).filter(e => e.titulo && (e.yt || e.link)),
    total: cut(p.total, 40), pagado: cut(p.pagado, 40), pago: url(p.pago), notas: cut(p.notas, 600), mensaje: cut(p.mensaje, 400),
    prop: cut(p.prop, 12), lang: p.lang === "en" ? "en" : "es"
  };
};
const publico = p => { const o = JSON.parse(JSON.stringify(p)); delete o.notas; delete o.contacto; return o; };
export async function onRequest({ request, env, params }) {
  const KV = env.BASHI_KV; if (!KV) return json({ error: "KV no configurado" }, 500);
  const t = ((params.t || [])[0] || "").replace(/[^a-z0-9]/g, "");
  if (!t) {
    if (!isAdmin(request, env)) return json({ error: "No autorizado" }, 401);
    if (request.method === "GET") {
      const ks = await listAll(KV, "proy:");
      const all = (await Promise.all(ks.map(async k => { try { return JSON.parse(await KV.get(k.name)); } catch (e) { return null; } }))).filter(Boolean);
      return json(all.sort((a, b) => b.creado.localeCompare(a.creado)));
    }
    const b = await body(request);
    if (typeof b.borrar === "string") { await KV.delete("proy:" + b.borrar.replace(/[^a-z0-9]/g, "")); return json({ ok: true }); }
    if (b.guardar && typeof b.guardar === "object") {
      let prev = null; const g = cut(b.guardar.t, 14).replace(/[^a-z0-9]/g, "");
      if (g) { try { prev = JSON.parse(await KV.get("proy:" + g)); } catch (e) {} }
      const p = limpiar(b.guardar, prev);
      if (!p.cliente) return json({ error: "Falta el cliente" }, 400);
      await KV.put("proy:" + p.t, JSON.stringify(p));
      return json({ ok: true, proy: p });
    }
    return json({ error: "Nada que hacer" }, 400);
  }
  const key = "proy:" + t;
  let p = null; try { p = JSON.parse(await KV.get(key)); } catch (e) {}
  if (!p) return json({ error: "No existe" }, 404);
  if (request.method === "GET") return json(isAdmin(request, env) ? p : publico(p));
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await body(request);
  if (b.web) return json({ ok: true });
  const quien = cut((b.comentario || b.aprobar || {}).quien, 40) || p.cliente;
  const e = p.entregas.find(x => x.id === cut((b.comentario || b.aprobar || {}).e, 10));
  if (!e) return json({ error: "Entrega no encontrada" }, 400);
  if (b.comentario) {
    const txt = cut(b.comentario.txt, 600); if (!txt) return json({ error: "Escribe el comentario" }, 400);
    if (e.comentarios.length >= 200) return json({ error: "Demasiados comentarios" }, 400);
    const s = Math.max(0, Math.min(36000, Math.round(Number(b.comentario.s) || 0)));
    e.comentarios.push({ s, txt, quien, t: new Date().toISOString() });
    await KV.put(key, JSON.stringify(p));
    await aviso(KV, request, { nombre: p.cliente, contacto: p.contacto || "", servicio: "Comentario en entrega", detalle: e.titulo + " · " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + " · " + txt, origen: "/c/" });
  } else if (b.aprobar) {
    e.aprobada = { quien, t: new Date().toISOString() };
    await KV.put(key, JSON.stringify(p));
    await aviso(KV, request, { nombre: p.cliente, contacto: p.contacto || "", servicio: "Entrega aprobada", detalle: e.titulo + " · aprobó: " + quien, origen: "/c/" });
  } else return json({ error: "Nada que hacer" }, 400);
  return json({ ok: true, proy: publico(p) });
}
