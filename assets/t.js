/* BASHI · medición de clics, videos livianos y formulario de contacto.
   Compartido por la portada y todas las páginas. Sin cookies. */
(function(){
  'use strict';
  /* ---- clics que importan: WhatsApp, Instagram, correo, llamada ---- */
  function send(url, data){
    try{
      var body = JSON.stringify(data);
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) return;
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function(){});
    }catch(e){}
  }
  function where(){ return location.pathname + (location.hash && location.pathname === '/' ? location.hash : ''); }
  window.bashiTrack = function(ev){ send('/api/track', { e: ev, p: where() }); };
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '', ev = '';
    if (/wa\.me|whatsapp/.test(h)) ev = 'whatsapp';
    else if (/instagram\.com/.test(h)) ev = 'instagram';
    else if (/^mailto:/.test(h)) ev = 'email';
    else if (/^tel:/.test(h)) ev = 'llamada';
    if (ev) window.bashiTrack(ev);
  }, true);

  /* ---- video de YouTube: miniatura hasta que se toca (carga mucho más rápido) ---- */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button.yt[data-yt]'); if (!b || b.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true; f.title = b.getAttribute('aria-label') || 'Video';
    b.appendChild(f);
  });

  /* ---- formulario: guarda el contacto y abre WhatsApp con el mensaje listo ---- */
  var form = document.getElementById('lead');
  if (form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var g = function(n){ var el = form.elements[n]; return el ? (el.type === 'checkbox' ? el.checked : (el.value || '').trim()) : ''; };
      var msg = form.querySelector('.msg');
      msg.className = 'msg';
      if (!g('nombre')){ msg.textContent = 'Escribe tu nombre para continuar.'; msg.classList.add('err'); form.elements.nombre.focus(); return; }
      if (!g('acepto')){ msg.textContent = 'Marca la casilla de tratamiento de datos para continuar.'; msg.classList.add('err'); return; }
      var data = { nombre: g('nombre'), contacto: g('contacto'), servicio: g('servicio'), detalle: g('detalle'), web: g('web'), origen: where() };
      send('/api/lead', data);
      var t = 'Hola BASHI, quiero cotizar un proyecto.\n\nNombre: ' + data.nombre + '\nServicio: ' + data.servicio + (data.detalle ? '\nDetalle: ' + data.detalle : '');
      window.open('https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(t), '_blank');
      msg.textContent = 'Listo. Se abrió WhatsApp con tu mensaje; si no se abrió, escríbeme al +57 324 502 6518.';
      msg.classList.add('ok');
    });
  }
})();
