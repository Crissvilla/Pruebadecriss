/* Majori Sushi — sitio público */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const clp = (n) => '$' + Math.round(n).toLocaleString('es-CL');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CART_KEY = 'majori_cart_v1';

  let data = { settings: {}, categories: [], products: [] };
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} renderCartCount(); };

  const productById = (id) => data.products.find((p) => p.id === id);
  const categoryById = (id) => data.categories.find((c) => c.id === id);
  const groupsFor = (p) => [...(categoryById(p.categoryId)?.optionGroups || []), ...(p.optionGroups || [])];

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  const waLink = (text = '') => `https://wa.me/${data.settings.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;

  /* ---------------- Horario (hora de Chile) ---------------- */
  function chileNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const dayIdx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
    return { dayIdx, minutes: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  }
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  function renderStatus() {
    const { dayIdx, minutes } = chileNow();
    const h = (data.settings.hours || [])[dayIdx];
    const pill = $('#open-status');
    if (!h) { pill.textContent = 'Agenda tu pedido'; return; }
    const open = !h.closed && minutes >= toMin(h.open) && minutes < toMin(h.close);
    pill.className = 'status-pill ' + (open ? 'open' : 'closed');
    pill.textContent = open ? `Abierto ahora · hasta las ${h.close}` : h.closed ? 'Hoy cerrado · agenda tu pedido' : `Cerrado · abrimos a las ${h.open}`;
  }

  /* ---------------- Render general ---------------- */
  function applySettings() {
    const s = data.settings;
    const root = document.documentElement.style;
    if (s.colors) { root.setProperty('--primary', s.colors.primary); root.setProperty('--accent', s.colors.accent); }
    const full = `${s.name} ${s.branch}`.trim();
    document.title = `${full} · ${s.slogan}`;
    $('#brand-name').textContent = s.name;
    $('#brand-branch').textContent = s.branch;
    if (s.logo) { $('#brand-logo').src = s.logo; $('#about-logo').src = s.logo; }
    $('#hero-slogan').textContent = s.slogan;
    $('#hero-title').textContent = s.heroTitle;
    $('#hero-subtitle').textContent = s.heroSubtitle;
    if (s.heroImage) $('#hero-image').src = s.heroImage;
    $('#hero-wa').href = waLink(`Hola ${full}, quiero hacer un pedido 🍣`);
    $('#wa-float').href = waLink(`Hola ${full}, tengo una consulta`);
    $('#payment-notice').textContent = s.paymentNotice;
    const ann = $('#announcement');
    ann.hidden = !(s.announcement?.enabled && s.announcement.text);
    ann.textContent = s.announcement?.text || '';
    $('#about-title').textContent = s.aboutTitle;
    $('#about-text').textContent = s.aboutText;
    const ig = `https://instagram.com/${s.instagram}`;
    $('#about-ig').href = ig;
    $('#address').textContent = s.address;
    $('#address-note').textContent = s.addressNote;
    $('#contact-wa').href = waLink();
    $('#contact-wa').textContent = `WhatsApp ${s.phone}`;
    $('#contact-ig').href = ig;
    $('#contact-ig').textContent = `Instagram @${s.instagram}`;
    $('#map').src = `https://www.google.com/maps?q=${encodeURIComponent(s.mapsQuery || s.address)}&output=embed`;
    $('#footer-name').textContent = full;
    $('#footer-slogan').textContent = s.slogan;
    $('#year').textContent = new Date().getFullYear();
    const { dayIdx } = chileNow();
    $('#hours').innerHTML = (s.hours || []).map((h, i) => `<tr class="${i === dayIdx ? 'today' : ''}"><td>${esc(h.day)}</td><td>${h.closed ? 'Cerrado' : `${esc(h.open)} – ${esc(h.close)}`}</td></tr>`).join('');
    renderStatus();
  }

  // Precio "desde": base + el mínimo obligatorio de cada grupo.
  function priceInfo(p) {
    let min = p.price;
    const variants = [];
    for (const g of groupsFor(p)) {
      if (g.min > 0) {
        const sorted = [...g.options].sort((a, b) => a.price - b.price);
        min += sorted.slice(0, g.min).reduce((s, o) => s + o.price, 0);
        // Solo grupos propios del producto (ej. Mixta / Hot en tablas) se muestran como variantes.
        if ((p.optionGroups || []).includes(g) && g.max === 1 && g.min === 1 && g.options.some((o) => o.price !== 0) && g.options.length <= 3) {
          g.options.forEach((o) => variants.push({ name: o.name, price: p.price + o.price }));
        }
      }
    }
    return { min, variants, hasOptions: groupsFor(p).length > 0 };
  }

  function card(p, { compact = false, showCategory = false } = {}) {
    const info = priceInfo(p);
    const details = p.details?.length ? `<ul class="details">${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '';
    const variants = info.variants.length
      ? `<div class="variants">${info.variants.map((v) => `<span>${esc(v.name.replace(/\s*\(.*\)/, ''))} <b>${clp(v.price)}</b></span>`).join('')}</div>`
      : '';
    const badge = !p.available ? '<span class="badge soldout">Agotado</span>' : p.badge ? `<span class="badge">${esc(p.badge)}</span>` : '';
    return `
      <article class="card ${compact || !p.image ? 'compact' : ''}">
        ${p.image ? `<img class="card-img" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : ''}
        ${badge}
        <div class="card-body">
          ${showCategory ? `<p class="card-cat">${esc(categoryById(p.categoryId)?.name || '')}</p>` : ''}
          <h4>${esc(p.name)}</h4>
          ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
          ${details}
          ${variants}
          <div class="card-foot">
            <span class="price">${info.variants.length || info.min !== p.price ? '<small>desde</small>' : ''}${clp(info.min)}</span>
            <button class="add-btn" data-add="${p.id}" ${p.available ? '' : 'disabled'}>${p.available ? 'Agregar' : 'Agotado'}</button>
          </div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const cats = data.categories;
    $('#cat-nav').innerHTML = cats.map((c) => `<a href="#cat-${c.id}" data-cat="${c.id}">${esc(c.name)}</a>`).join('');
    $('#menu-sections').innerHTML = cats.map((c) => {
      const items = data.products.filter((p) => p.categoryId === c.id);
      if (!items.length) return '';
      // En categorías con muchas fotos repetidas mostramos la foto en el encabezado y tarjetas compactas.
      const uniqueImgs = new Set(items.map((p) => p.image).filter(Boolean)).size;
      const compact = items.length > 6 && uniqueImgs <= Math.ceil(items.length / 2);
      return `
        <section class="category" id="cat-${c.id}">
          <div class="category-head">
            ${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : ''}
            <div><h3>${esc(c.name)}</h3>${c.description ? `<p>${esc(c.description)}</p>` : ''}</div>
          </div>
          <div class="grid">${items.map((p) => card(p, { compact })).join('')}</div>
        </section>`;
    }).join('');

    const featured = data.products.filter((p) => p.featured && p.available);
    $('#destacados').hidden = !featured.length;
    $('#featured').innerHTML = featured.map((p) => card(p, { showCategory: true })).join('');
    observeCategories();
  }

  function observeCategories() {
    const links = [...document.querySelectorAll('#cat-nav a')];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id.replace('cat-', '');
        links.forEach((l) => {
          const on = l.dataset.cat === id;
          l.classList.toggle('active', on);
          if (on) l.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.category').forEach((s) => io.observe(s));
  }

  /* ---------------- Modal de producto ---------------- */
  function openProduct(id) {
    const p = productById(id);
    if (!p) return;
    const groups = groupsFor(p);
    let qty = 1;
    const body = $('#product-modal-body');
    body.innerHTML = `
      ${p.image ? `<img class="pm-img" src="${esc(p.image)}" alt="">` : ''}
      <div class="pm-body">
        <h3>${esc(p.name)}</h3>
        ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
        ${p.details?.length ? `<ul class="details">${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
        ${groups.map((g) => {
          const type = g.max === 1 && g.min === 1 ? 'radio' : 'checkbox';
          const hint = g.min === g.max ? `elige ${g.min}` : g.min === 0 ? `opcional${g.max > 1 ? `, hasta ${g.max}` : ''}` : `elige de ${g.min} a ${g.max}`;
          return `<fieldset class="opt-group" data-group="${esc(g.id)}" data-min="${g.min}" data-max="${g.max}">
            <legend>${esc(g.name)}<small>${hint}</small></legend>
            ${g.options.map((o, i) => `<label class="opt"><input type="${type}" name="g-${esc(g.id)}" value="${esc(o.name)}" ${type === 'radio' && i === 0 ? 'checked' : ''}> ${esc(o.name)}${o.price ? `<span class="opt-price">${o.price > 0 ? '+' : ''}${clp(o.price)}</span>` : ''}</label>`).join('')}
          </fieldset>`;
        }).join('')}
        <div class="field"><label for="pm-note">Comentario (opcional)</label><input id="pm-note" maxlength="200" placeholder="Ej: sin sésamo, salsa aparte"></div>
        <div class="pm-foot">
          <div class="qty"><button type="button" data-q="-1" aria-label="Menos">−</button><span id="pm-qty">1</span><button type="button" data-q="1" aria-label="Más">+</button></div>
          <button type="button" class="btn btn-primary" id="pm-add">Agregar</button>
        </div>
      </div>`;

    const read = () => {
      const options = {};
      let ok = true;
      let unit = p.price;
      body.querySelectorAll('.opt-group').forEach((fs) => {
        const picked = [...fs.querySelectorAll('input:checked')].map((i) => i.value);
        const g = groups.find((x) => x.id === fs.dataset.group);
        picked.forEach((n) => (unit += g.options.find((o) => o.name === n)?.price || 0));
        options[g.id] = picked;
        const bad = picked.length < g.min || picked.length > g.max;
        fs.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      return { options, ok, unit };
    };
    const refresh = () => {
      const { unit } = read();
      body.querySelectorAll('.opt-group').forEach((fs) => fs.classList.remove('invalid'));
      $('#pm-add').textContent = `Agregar · ${clp(unit * qty)}`;
    };
    body.onchange = (e) => {
      const fs = e.target.closest('.opt-group');
      if (fs && e.target.type === 'checkbox') {
        const max = +fs.dataset.max;
        const checked = fs.querySelectorAll('input:checked');
        if (checked.length > max) { e.target.checked = false; toast(`Máximo ${max} en "${fs.querySelector('legend').firstChild.textContent}"`); }
      }
      refresh();
    };
    body.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(50, qty + +b.dataset.q));
      $('#pm-qty').textContent = qty;
      refresh();
    }));
    $('#pm-add').addEventListener('click', () => {
      const { options, ok, unit } = read();
      if (!ok) { toast('Completa las opciones marcadas'); body.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const note = $('#pm-note').value.trim();
      const key = JSON.stringify([p.id, options, note]);
      const existing = cart.find((l) => l.key === key);
      if (existing) existing.qty = Math.min(50, existing.qty + qty);
      else cart.push({ key, productId: p.id, options, note, qty, unit });
      saveCart();
      $('#product-modal').close();
      toast(`${p.name} agregado 🍣`);
    });
    refresh();
    $('#product-modal').showModal();
  }

  /* ---------------- Carro y checkout ---------------- */
  function lineText(l) {
    const p = productById(l.productId);
    const groups = p ? groupsFor(p) : [];
    return Object.entries(l.options).filter(([, v]) => v.length).map(([gid, v]) => {
      const g = groups.find((x) => x.id === gid);
      return `${g ? g.name.replace(/^Elige \d+ /i, '') + ': ' : ''}${v.join(', ')}`;
    }).join(' · ');
  }

  function validCart() {
    // Quita productos que ya no existen o están agotados y recalcula precios
    cart = cart.filter((l) => { const p = productById(l.productId); return p && p.available; });
    cart.forEach((l) => {
      const p = productById(l.productId);
      let unit = p.price;
      groupsFor(p).forEach((g) => (l.options[g.id] || []).forEach((n) => (unit += g.options.find((o) => o.name === n)?.price || 0)));
      l.unit = unit;
    });
  }

  function renderCartCount() {
    $('#cart-count').textContent = cart.reduce((s, l) => s + l.qty, 0);
  }

  function renderCart() {
    validCart();
    saveCart();
    const s = data.settings;
    const body = $('#cart-body');
    if (!cart.length) {
      body.innerHTML = `<div class="empty"><p>Tu pedido está vacío.</p><a href="#carta" class="btn btn-primary" id="go-menu">Ver la carta</a></div>`;
      $('#go-menu').addEventListener('click', closeCart);
      return;
    }
    const total = cart.reduce((sum, l) => sum + l.unit * l.qty, 0);
    const saved = (() => { try { return JSON.parse(localStorage.getItem('majori_customer')) || {}; } catch { return {}; } })();
    body.innerHTML = `
      ${cart.map((l, i) => {
        const p = productById(l.productId);
        return `<div class="cart-line">
          <div><h4>${esc(p.name)}</h4><p class="opts">${esc(lineText(l))}${l.note ? ` · “${esc(l.note)}”` : ''}</p></div>
          <strong>${clp(l.unit * l.qty)}</strong>
          <div class="line-actions">
            <div class="qty"><button data-line="${i}" data-d="-1" aria-label="Menos">−</button><span>${l.qty}</span><button data-line="${i}" data-d="1" aria-label="Más">+</button></div>
            <button class="remove" data-remove="${i}">Quitar</button>
          </div>
        </div>`;
      }).join('')}
      <div class="cart-total"><span>Total</span><span>${clp(total)}</span></div>
      <form id="checkout">
        <div class="seg" role="radiogroup" aria-label="Entrega">
          ${s.pickupEnabled ? `<label><input type="radio" name="mode" value="retiro" checked> Retiro en local</label>` : ''}
          ${s.deliveryEnabled ? `<label><input type="radio" name="mode" value="delivery" ${!s.pickupEnabled ? 'checked' : ''}> Delivery</label>` : ''}
        </div>
        <div class="field"><label for="c-name">Nombre</label><input id="c-name" name="name" required maxlength="120" autocomplete="name" value="${esc(saved.name || '')}"></div>
        <div class="field"><label for="c-phone">Teléfono</label><input id="c-phone" name="phone" type="tel" maxlength="40" autocomplete="tel" value="${esc(saved.phone || '')}" placeholder="+56 9 ..."></div>
        <div class="field" id="addr-field" hidden><label for="c-address">Dirección de entrega</label><input id="c-address" name="address" maxlength="300" autocomplete="street-address" value="${esc(saved.address || '')}"></div>
        <div class="field"><label for="c-schedule">¿Para cuándo?</label><input id="c-schedule" name="schedule" maxlength="120" placeholder="Lo antes posible / hoy a las 20:00"></div>
        <div class="field"><label for="c-notes">Comentarios</label><textarea id="c-notes" name="notes" rows="2" maxlength="600"></textarea></div>
        <p class="notice" id="delivery-note" hidden>${esc(s.deliveryNote)}</p>
        <p class="notice">${esc(s.paymentNotice)}${s.bankInfo ? '\n\n' + esc(s.bankInfo) : ''}</p>
        <button class="btn btn-primary btn-block" type="submit">Enviar pedido por WhatsApp</button>
      </form>`;

    const syncMode = () => {
      const delivery = body.querySelector('input[name=mode]:checked')?.value === 'delivery';
      $('#addr-field').hidden = !delivery;
      $('#c-address').required = delivery;
      $('#delivery-note').hidden = !delivery;
    };
    body.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', syncMode));
    syncMode();

    body.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
      const l = cart[+b.dataset.line];
      l.qty += +b.dataset.d;
      if (l.qty < 1) cart.splice(+b.dataset.line, 1);
      renderCart();
    }));
    body.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => { cart.splice(+b.dataset.remove, 1); renderCart(); }));
    $('#checkout').addEventListener('submit', submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type=submit]');
    const payload = {
      mode: f.mode?.value || 'retiro',
      name: f.name.value,
      phone: f.phone.value,
      address: f.address.value,
      schedule: f.schedule.value,
      notes: f.notes.value,
      items: cart.map((l) => ({ productId: l.productId, options: l.options, qty: l.qty, note: l.note })),
    };
    try { localStorage.setItem('majori_customer', JSON.stringify({ name: payload.name, phone: payload.phone, address: payload.address })); } catch {}

    // Abrimos la ventana antes del fetch para que el navegador no la bloquee.
    const win = window.open('', '_blank');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'No se pudo enviar');
      const o = out.order;
      const s = data.settings;
      const msg = [
        `🍣 *Pedido #${o.number}* — ${s.name} ${s.branch}`,
        '',
        ...o.items.map((l) => `• ${l.qty} x ${l.name} — ${clp(l.total)}${l.selected.length ? '\n   ' + l.selected.map((x) => `${x.group}: ${x.options.join(', ')}`).join(' | ') : ''}${l.note ? `\n   Nota: ${l.note}` : ''}`),
        '',
        `*Total: ${clp(o.total)}*`,
        '',
        `👤 ${o.customer.name}${o.customer.phone ? ' · ' + o.customer.phone : ''}`,
        o.mode === 'delivery' ? `🛵 Delivery a: ${o.customer.address}` : '🏪 Retiro en local',
        o.schedule ? `🕒 Para: ${o.schedule}` : '',
        o.notes ? `📝 ${o.notes}` : '',
        '',
        'Quedo atento/a a los datos para la transferencia 🙌',
      ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
      const url = waLink(msg);
      if (win) win.location.href = url; else location.href = url;
      cart = [];
      saveCart();
      $('#cart-body').innerHTML = `<div class="empty"><h3>¡Pedido #${o.number} creado!</h3><p>Se abrió WhatsApp con tu pedido. Si no se abrió, <a href="${esc(url)}" target="_blank" rel="noopener">toca aquí</a>.</p></div>`;
    } catch (err) {
      if (win) win.close();
      toast(err.message);
      btn.disabled = false;
      btn.textContent = 'Enviar pedido por WhatsApp';
      // Recargamos la carta por si cambió disponibilidad
      load().then(renderCart);
    }
  }

  function openCart() {
    renderCart();
    $('#cart').classList.add('open');
    $('#cart').setAttribute('aria-hidden', 'false');
    $('#drawer-backdrop').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    $('#cart').classList.remove('open');
    $('#cart').setAttribute('aria-hidden', 'true');
    $('#drawer-backdrop').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------------- Inicio ---------------- */
  async function load() {
    const res = await fetch('/api/content');
    data = await res.json();
    applySettings();
    renderMenu();
    validCart();
    renderCartCount();
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) openProduct(add.dataset.add);
  });
  $('#open-cart').addEventListener('click', openCart);
  $('#close-cart').addEventListener('click', closeCart);
  $('#drawer-backdrop').addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
  $('#product-modal').addEventListener('click', (e) => { if (e.target.id === 'product-modal') e.target.close(); });
  setInterval(renderStatus, 60_000);

  load().catch(() => toast('No se pudo cargar la carta. Intenta nuevamente.'));
})();
