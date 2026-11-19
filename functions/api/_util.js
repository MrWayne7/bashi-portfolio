/* utilidades compartidas por las funciones nuevas (v33) */
export const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
export const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: H });
export const cut = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0009\u000b-\u001f]/g, " ").trim().slice(0, n);
export const url = v => { v = cut(v, 400); return /^https:\/\//.test(v) ? v : ""; };
export const lines = (v, n, m) => (Array.isArray(v) ? v : String(v || "").split("\n")).map(x => cut(x, m || 200)).filter(Boolean).slice(0, n || 20);
export const isAdmin = (request, env) => !!env.ADMIN_PASS && request.headers.get("x-admin-pass") === env.ADMIN_PASS;
export const token = (n) => { const a = new Uint8Array(n || 10); crypto.getRandomValues(a); return Array.from(a, b => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join(""); };
export async function listAll(KV, prefix) {
  const keys = []; let cursor;
  do { const r = await KV.list({ prefix, cursor }); keys.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor && keys.length < 2000);
  return keys;
}
export async function body(request) { try { return await request.json(); } catch (e) { return {}; } }
/* deja un aviso en "Clientes" del panel, igual que un contacto del formulario */
export async function aviso(KV, request, o) {
  const lead = Object.assign({ t: new Date().toISOString(), pais: request.headers.get("CF-IPCountry") || "" }, o);
  await KV.put("lead:" + lead.t + ":" + Math.random().toString(36).slice(2, 7), JSON.stringify(lead), { expirationTtl: 60 * 60 * 24 * 365 });
}
