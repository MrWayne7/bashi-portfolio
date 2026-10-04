// Sistema de canciones para la propuesta de Danna.
// GET  /api/canciones  -> devuelve la lista guardada
// POST /api/canciones  -> agrega una cancion { cancion, momento }
// Guarda en el KV namespace con binding CANCIONES.

const KEY = "danna";
const CLAVE = "dannanicolas";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequestGet({ env }) {
  const raw = await env.CANCIONES.get(KEY);
  return json(raw ? JSON.parse(raw) : []);
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("x-clave") !== CLAVE) return json({ error: "no autorizado" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "formato" }, 400); }

  const cancion = (body.cancion || "").toString().trim().slice(0, 300);
  const momento = (body.momento || "").toString().trim().slice(0, 120);
  if (!cancion) return json({ error: "vacio" }, 400);

  const raw = await env.CANCIONES.get(KEY);
  const list = raw ? JSON.parse(raw) : [];
  list.push({ cancion, momento, ts: Date.now() });
  await env.CANCIONES.put(KEY, JSON.stringify(list));

  return json({ ok: true, list });
}
