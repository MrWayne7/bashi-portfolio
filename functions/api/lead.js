/* /api/lead — guarda los contactos del formulario (con autorización de datos). Se ven en el panel.
   Se borran solos a los 12 meses, como dice la política de privacidad. */
const cut = (v, n) => String(v || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
export async function onRequestPost({ request, env }) {
  const KV = env.BASHI_KV;
  if (!KV) return new Response(null, { status: 204 });
  let b = {};
  try { b = await request.json(); } catch (e) { return new Response(null, { status: 204 }); }
  if (b.web) return new Response(null, { status: 204 });          // campo trampa: lo llenan los robots
  const nombre = cut(b.nombre, 80);
  if (!nombre) return new Response(null, { status: 204 });
  const lead = {
    t: new Date().toISOString(), nombre,
    contacto: cut(b.contacto, 80), servicio: cut(b.servicio, 60), rubro: cut(b.rubro, 60),
    detalle: cut(b.detalle, 600), origen: cut(b.origen, 80), pais: request.headers.get("CF-IPCountry") || "",
    ref: cut(b.ref, 40).toLowerCase().replace(/[^a-z0-9-]/g, "")
  };
  const key = "lead:" + lead.t + ":" + Math.random().toString(36).slice(2, 7);
  await KV.put(key, JSON.stringify(lead), { expirationTtl: 60 * 60 * 24 * 365 });
  return new Response(null, { status: 204 });
}
export async function onRequest() { return new Response(null, { status: 405 }); }
