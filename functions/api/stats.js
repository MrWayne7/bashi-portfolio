/* /api/stats — solo para el panel (cabecera x-admin-pass). Devuelve contactos y clics.
   POST {borrar: "lead:..."} borra un contacto. */
const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: H });
async function listAll(KV, prefix) {
  const keys = []; let cursor;
  do { const r = await KV.list({ prefix, cursor }); keys.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor && keys.length < 3000);
  return keys;
}
export async function onRequest({ request, env }) {
  const KV = env.BASHI_KV;
  if (!KV) return json({ error: "KV no configurado" }, 500);
  if (!env.ADMIN_PASS || request.headers.get("x-admin-pass") !== env.ADMIN_PASS) return json({ error: "No autorizado" }, 401);
  if (request.method === "POST") {
    let b = {}; try { b = await request.json(); } catch (e) {}
    if (typeof b.borrar === "string" && b.borrar.startsWith("lead:")) { await KV.delete(b.borrar); return json({ ok: true }); }
    return json({ error: "Nada que hacer" }, 400);
  }
  const lk = (await listAll(KV, "lead:")).slice(-200);
  const leads = (await Promise.all(lk.map(async k => { const v = await KV.get(k.name); try { return Object.assign({ key: k.name }, JSON.parse(v)); } catch (e) { return null; } }))).filter(Boolean).reverse();
  const ek = await listAll(KV, "ev:");
  const clicks = await Promise.all(ek.map(async k => { const [, mes, e, ...rest] = k.name.split(":"); return { mes, e, p: rest.join(":"), n: parseInt((await KV.get(k.name)) || "0", 10) }; }));
  return json({ leads, clicks });
}
