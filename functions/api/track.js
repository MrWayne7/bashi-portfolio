/* /api/track — cuenta clics de contacto (WhatsApp, Instagram, correo, llamada) por página y por mes.
   Sin cookies y sin guardar IP. Usa el KV BASHI_KV. */
const EV = ["whatsapp", "instagram", "email", "llamada", "bio", "qr", "descarga", "referido", "tratamiento", "sesiones", "agenda", "zonas"];
export async function onRequestPost({ request, env }) {
  const KV = env.BASHI_KV;
  if (!KV) return new Response(null, { status: 204 });
  let b = {};
  try { b = await request.json(); } catch (e) { return new Response(null, { status: 204 }); }
  const e = String(b.e || "");
  if (!EV.includes(e)) return new Response(null, { status: 204 });
  let p = String(b.p || "/").slice(0, 80).replace(/[^a-zA-Z0-9/_#\-]/g, "");
  if (!p.startsWith("/")) p = "/";
  const mes = new Date().toISOString().slice(0, 7);
  const key = `ev:${mes}:${e}:${p}`;
  const n = parseInt((await KV.get(key)) || "0", 10) + 1;
  await KV.put(key, String(n), { expirationTtl: 60 * 60 * 24 * 400 });
  return new Response(null, { status: 204 });
}
export async function onRequest() { return new Response(null, { status: 405 }); }
