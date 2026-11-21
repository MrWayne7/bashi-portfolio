/* BASHI · medición de clics, videos livianos y formulario de contacto.
   Compartido por la portada y todas las páginas. Sin cookies. */
(function(){
  'use strict';
  /* ---- clics que importan: WhatsApp, Instagram, correo, llamada ---- */
  function send(url, data){
    try{
      var body = conRef(url, JSON.stringify(data));
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) return;
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function(){});
    }catch(e){}
  }
  function where(){ return location.pathname + (location.hash && location.pathname === '/' ? location.hash : ''); }

  /* ---- referidos: /r/codigo llega con ?ref=. Se guarda 60 días en este navegador (sin cookies)
     y se agrega a los formularios y al mensaje de WhatsApp. ---- */
  var REF = null;
  try{
    var q = new URLSearchParams(location.search), rc = (q.get('ref') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    if (rc){
      REF = { c: rc, n: (q.get('de') || '').slice(0, 30), b: (q.get('b') || '').slice(0, 120), t: Date.now() };
      localStorage.setItem('bashi-ref', JSON.stringify(REF));
      ['ref', 'de', 'b'].forEach(function(k){ q.delete(k); });
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      setTimeout(function(){ aviso(REF); }, 900);
    } else {
      REF = JSON.parse(localStorage.getItem('bashi-ref') || 'null');
      if (REF && Date.now() - REF.t > 60 * 864e5){ REF = null; localStorage.removeItem('bashi-ref'); }
    }
  }catch(e){ REF = null; }
  window.bashiRef = function(){ return REF ? REF.c : ''; };
  function aviso(r){
    var en = document.documentElement.lang === 'en', d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:9999;max-width:340px;background:#0b0d0b;color:#e9e7df;border:1px solid #00ff66;padding:14px 40px 14px 16px;font:15px/1.45 "Space Grotesk",system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.6)';
    d.innerHTML = '<b style="color:#00ff66">' + (en ? 'Welcome' : 'Bienvenido') + '</b><br>' + (r.n ? (en ? 'You were referred by ' : 'Vienes de parte de ') + esc0(r.n) + '. ' : '') +
      (r.b ? esc0(r.b) : (en ? 'Mention it when you message me.' : 'Cuéntamelo cuando me escribas.')) +
      '<button type="button" aria-label="Cerrar" style="position:absolute;right:8px;top:6px;background:none;border:0;color:#7d837d;font-size:20px;cursor:pointer">×</button>';
    d.querySelector('button').onclick = function(){ d.remove(); };
    document.body.appendChild(d); setTimeout(function(){ if (d.parentNode) d.remove(); }, 12000);
  }
  function esc0(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function conRef(url, body){
    if (!REF || typeof body !== 'string' || !/\/api\/(lead|agenda)(\?|$)/.test(url)) return body;
    try{ var o = JSON.parse(body); if (!o.ref) o.ref = REF.c; return JSON.stringify(o); }catch(e){ return body; }
  }
  if (window.fetch){
    var f0 = window.fetch;
    window.fetch = function(u, init){ try{ if (init && init.body) init.body = conRef(String(u && u.url || u), init.body); }catch(e){} return f0.apply(this, arguments); };
  }
  if (navigator.sendBeacon){
    var b0 = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(u, data){
      if (REF && /\/api\/lead/.test(u) && data && data.text){
        data.text().then(function(t){ f0 ? f0(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: conRef(u, t), keepalive: true }).catch(function(){}) : b0(u, data); });
        return true;
      }
      return b0(u, data);
    };
  }
  window.bashiTrack = function(ev){ send('/api/track', { e: ev, p: where() }); };
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if (a.hasAttribute('data-t')){ send('/api/track', { e: 'bio', p: '/links/' + a.getAttribute('data-t') }); return; }
    var h = a.getAttribute('href') || '', ev = '';
    if (/wa\.me|whatsapp/.test(h)) ev = 'whatsapp';
    if (ev === 'whatsapp' && REF && /wa\.me\//.test(h) && h.indexOf('ref:' + REF.c) < 0){
      try{
        var wu = new URL(a.href), tx = wu.searchParams.get('text') || '';
        wu.searchParams.set('text', (tx ? tx + '\n\n' : '') + (REF.n ? 'Vengo de parte de ' + REF.n + ' ' : '') + '(ref:' + REF.c + ')');
        a.href = wu.toString();
      }catch(e){}
      send('/api/track', { e: 'referido', p: '/r/' + REF.c });
    }
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
      var msg = form.querySelector('.msg'), en = form.getAttribute('data-lang') === 'en';
      msg.className = 'msg';
      if (!g('nombre')){ msg.textContent = en ? 'Please enter your name.' : 'Escribe tu nombre para continuar.'; msg.classList.add('err'); form.elements.nombre.focus(); return; }
      if (!g('acepto')){ msg.textContent = en ? 'Please tick the data consent box.' : 'Marca la casilla de tratamiento de datos para continuar.'; msg.classList.add('err'); return; }
      var data = { nombre: g('nombre'), contacto: g('contacto'), servicio: g('servicio'), detalle: g('detalle'), web: g('web'), origen: where() };
      send('/api/lead', data);
      var t = en ? ('Hi BASHI, I would like a quote.\n\nName: ' + data.nombre + '\nService: ' + data.servicio + (data.detalle ? '\nDetails: ' + data.detalle : '')) : ('Hola BASHI, quiero cotizar un proyecto.\n\nNombre: ' + data.nombre + '\nServicio: ' + data.servicio + (data.detalle ? '\nDetalle: ' + data.detalle : ''));
      window.open('https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(t), '_blank');
      msg.textContent = en ? 'Done. WhatsApp opened with your message; if it did not, write to +57 324 502 6518.' : 'Listo. Se abrió WhatsApp con tu mensaje; si no se abrió, escríbeme al +57 324 502 6518.';
      msg.classList.add('ok');
    });
  }

  /* ---- /links: cuenta cada visita que llega desde la bio de Instagram ---- */
  if (/^\/links\/?$/.test(location.pathname)) send('/api/track', { e: 'bio', p: '/links/visita' });

  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function lista(k, cb){ fetch('/api/lista/' + k).then(function(r){ return r.ok ? r.json() : []; }).then(cb).catch(function(){}); }

  /* ---- testimonios: se cargan desde el panel; la sección se oculta si no hay ---- */
  var tBoxes = document.querySelectorAll('[data-testimonios]');
  if (tBoxes.length) lista('testimonios', function(L){
    tBoxes.forEach(function(box){
      var f = box.getAttribute('data-testimonios'), en = box.getAttribute('data-lang') === 'en';
      var items = L.filter(function(x){ return !f || !x.servicio || x.servicio === f; }).slice(0, 6);
      if (!items.length) return;
      box.querySelector('.tlist').innerHTML = items.map(function(x){
        return '<figure class="tst"><blockquote>“' + esc(x.texto) + '”</blockquote><figcaption><b>' + esc(x.nombre) + '</b>' + (x.rol ? '<span>' + esc(x.rol) + '</span>' : '') +
          (x.caso ? '<a href="' + (en ? '/en' : '') + '/work/' + esc(x.caso.replace(/^\/?(work\/)?|\/$/g, '')) + '/">' + (en ? 'See the case' : 'Ver el caso') + '</a>' : '') + '</figcaption></figure>';
      }).join('');
      box.hidden = false;
    });
  });

  /* ---- tienda: productos cargados desde el panel ---- */
  var shop = document.querySelector('[data-tienda]');
  if (shop) lista('tienda', function(L){
    if (!L.length) return;
    shop.innerHTML = L.map(function(p){
      return '<article class="prod">' + (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '" loading="lazy">' : '') +
        '<div><b>' + esc(p.nombre) + '</b><span class="pr">' + esc(p.precio) + '</span><p>' + esc(p.desc) + '</p>' +
        '<a class="btn" href="' + esc(p.link) + '" target="_blank" rel="noopener" onclick="window.bashiTrack&&bashiTrack(\'descarga\')">Comprar</a></div></article>';
    }).join('');
    var em = document.querySelector('.shop-empty'); if (em) em.hidden = true;
  });

  /* ---- recurso gratis: se desbloquea al dejar el contacto ---- */
  var un = document.getElementById('unlock');
  if (un){
    var abrir = function(){ document.documentElement.classList.add('unlocked'); };
    try{ if (localStorage.getItem('bashi-unlock-' + un.getAttribute('data-id'))) abrir(); }catch(e){}
    un.addEventListener('submit', function(e){
      e.preventDefault();
      var n = (un.elements.nombre.value || '').trim(), c = (un.elements.contacto.value || '').trim(), m = un.querySelector('.msg');
      m.className = 'msg';
      if (!n || !c){ m.textContent = 'Escribe tu nombre y tu WhatsApp o correo.'; m.classList.add('err'); return; }
      if (!un.elements.acepto.checked){ m.textContent = 'Marca la casilla de tratamiento de datos para continuar.'; m.classList.add('err'); return; }
      send('/api/lead', { nombre: n, contacto: c, servicio: 'Recurso: ' + un.getAttribute('data-id'), detalle: '', web: un.elements.web.value, origen: location.pathname });
      send('/api/track', { e: 'descarga', p: location.pathname });
      try{ localStorage.setItem('bashi-unlock-' + un.getAttribute('data-id'), '1'); }catch(e){}
      abrir();
      var full = document.getElementById('completa'); if (full) full.scrollIntoView({ behavior: 'smooth' });
    });
  }
})();
