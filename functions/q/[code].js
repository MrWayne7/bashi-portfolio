/* /q/<código> — los QR impresos pasan por aquí: se cuenta la visita y se redirige a la página. */
const DESTINO = {
  tarjeta: "/links/",
  flyer: "/servicios/",
  estudio: "/servicios/videoclips/",
  bodas: "/servicios/bodas/",
  web: "/servicios/paginas-web/",
  checklist: "/recursos/checklist-videoclip/"
};
export async function onRequest({ params, env, request }) {
  const code = String(params.code || "").toLowerCase();
  const to = DESTINO[code] || "/";
  const KV = env.BASHI_KV;
  if (KV && DESTINO[code]) {
    const key = `ev:${new Date().toISOString().slice(0, 7)}:qr:/q/${code}`;
    const n = parseInt((await KV.get(key)) || "0", 10) + 1;
    await KV.put(key, String(n), { expirationTtl: 60 * 60 * 24 * 400 });
  }
  return Response.redirect(new URL(to, request.url).toString() + "?utm_source=qr&utm_medium=print&utm_campaign=" + code, 302);
}
