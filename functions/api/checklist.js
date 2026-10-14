// Checklist "El plan del dia" para la propuesta de Danna.
// GET  /api/checklist  -> lista (se auto-llena la primera vez con los momentos de la reunion)
// POST /api/checklist  -> { op: "add", texto } | { op: "toggle", id } | { op: "del", id }
// Reutiliza el mismo KV namespace (binding CANCIONES) con una llave distinta.

const KEY = "danna-checklist";
const CLAVE = "dannanicolas";

const SEED = [
  "Investigar el orden de la misa (para no perder momentos)",
  "Coordinar video pre-boda",
  "Maquillaje y preparación de la novia",
  "2:00 PM — Inicio de ceremonia / llegada de invitados",
  "Ingreso del novio con su mamá",
  "Ingreso de la mamá / suegro de Danna",
  "Damas de honor y padrinos",
  "Ingreso de pajecitos",
  "Ingreso de la novia con su papá",
  "Salida de los novios bajo el arco de sables",
  "Pichirilo rojo (carro de salida)",
  "4:30 PM — Llegada a la hacienda",
  "Video corto de entrada a la fiesta",
  "Protocolo (6:00–6:30 PM)",
  "Baile de novios",
  "Palabras y brindis",
  "Torta especial",
  "Hora loca / rumba",
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequestGet({ env }) {
  const raw = await env.CANCIONES.get(KEY);
  if (!raw) {
    const seeded = SEED.map((t, i) => ({ id: "s" + i, texto: t, hecho: false }));
    await env.CANCIONES.put(KEY, JSON.stringify(seeded));
    return json(seeded);
  }
  return json(JSON.parse(raw));
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("x-clave") !== CLAVE) return json({ error: "no autorizado" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "formato" }, 400); }

  const raw = await env.CANCIONES.get(KEY);
  let list = raw ? JSON.parse(raw) : [];

  if (body.op === "add") {
    const texto = (body.texto || "").toString().trim().slice(0, 200);
    if (!texto) return json({ error: "vacio" }, 400);
    list.push({ id: "u" + Date.now(), texto, hecho: false });
  } else if (body.op === "toggle") {
    list = list.map((it) => (it.id === body.id ? { ...it, hecho: !it.hecho } : it));
  } else if (body.op === "del") {
    list = list.filter((it) => it.id !== body.id);
  } else {
    return json({ error: "op" }, 400);
  }

  await env.CANCIONES.put(KEY, JSON.stringify(list));
  return json({ ok: true, list });
}
