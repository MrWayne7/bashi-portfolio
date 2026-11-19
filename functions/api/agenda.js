/* /api/agenda — fechas.
   Público: GET → {ocupadas, anticipo, texto} · POST {solicitud:{fecha,nombre,contacto,servicio,detalle}}
   Panel (x-admin-pass): GET ?panel=1 → además {bloqueadas, solicitudes} · POST {config:{ocupadas,bloqueadas,anticipo,texto}} · POST {borrar:"res:..."} */
import { json, cut, url, isAdmin, listAll, body, aviso } from "./_util.js";
const fechas = v => [...new Set((Array.isArray(v) ? v : []).map(x => cut(x, 10)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort().slice(-400);
export async function onRequest({ request, env }) {
  const KV = env.BASHI_KV; if (!KV) return json({ error: "KV no configurado" }, 500);
  let cfg = {}; try { cfg = JSON.parse((await KV.get("agenda")) || "{}"); } catch (e) {}
  cfg = { ocupadas: cfg.ocupadas || [], bloqueadas: cfg.bloqueadas || [], anticipo: cfg.anticipo || "", texto: cfg.texto || "" };
  const admin = isAdmin(request, env);
  if (request.method === "GET") {
    const hoy = new Date().toISOString().slice(0, 10);
    const out = { ocupadas: [...new Set(cfg.ocupadas.concat(cfg.bloqueadas))].filter(d => d >= hoy).sort(), anticipo: cfg.anticipo, texto: cfg.texto };
    if (admin && new URL(request.url).searchParams.get("panel")) {
      const ks = (await listAll(KV, "res:")).slice(-200);
      out.solicitudes = (await Promise.all(ks.map(async k => { try { return Object.assign({ key: k.name }, JSON.parse(await KV.get(k.name))); } catch (e) { return null; } }))).filter(Boolean).reverse();
      out.cfg = cfg;
    }
    return json(out);
  }
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await body(request);
  if (admin && b.config) {
    const c = { ocupadas: fechas(b.config.ocupadas), bloqueadas: fechas(b.config.bloqueadas), anticipo: url(b.config.anticipo), texto: cut(b.config.texto, 200) };
    await KV.put("agenda", JSON.stringify(c)); return json({ ok: true, cfg: c });
  }
  if (admin && typeof b.borrar === "string" && b.borrar.startsWith("res:")) { await KV.delete(b.borrar); return json({ ok: true }); }
  if (b.web) return json({ ok: true });
  const s = b.solicitud || {};
  const f = cut(s.fecha, 10), nombre = cut(s.nombre, 80), contacto = cut(s.contacto, 80);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !nombre || !contacto) return json({ error: "Falta la fecha, tu nombre o cómo contactarte" }, 400);
  if (f < new Date().toISOString().slice(0, 10)) return json({ error: "Esa fecha ya pasó" }, 400);
  if (cfg.ocupadas.includes(f) || cfg.bloqueadas.includes(f)) return json({ error: "Esa fecha ya no está disponible" }, 409);
  const r = { t: new Date().toISOString(), fecha: f, nombre, contacto, servicio: cut(s.servicio, 60), detalle: cut(s.detalle, 500) };
  await KV.put("res:" + r.t + ":" + Math.random().toString(36).slice(2, 6), JSON.stringify(r), { expirationTtl: 60 * 60 * 24 * 365 });
  await aviso(KV, request, { nombre, contacto, servicio: "Solicitud de fecha · " + f, detalle: (r.servicio ? r.servicio + " · " : "") + r.detalle, origen: "/agenda/" });
  return json({ ok: true, anticipo: cfg.anticipo });
}
