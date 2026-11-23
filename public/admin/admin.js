/* Majori Sushi — Intranet */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clp = (n) => '$' + Math.round(n || 0).toLocaleString('es-CL');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS_LABEL = { nuevo: 'Nuevo', pagado: 'Pagado', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };

  let me = null;
  let state = { settings: {}, categories: [], products: [] };
  let selectedCat = null;
  let productFilter = '';
  let orderFilter = { status: '', q: '' };
  let lastOrderCount = null;

  const isAdmin = () => me?.role === 'admin';

  function toast(msg, err = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.className = 'toast'), 2600);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.includes('/auth/')) { showLogin(); throw new Error('Sesión expirada'); }
    if (!res.ok) throw new Error(out.error || 'Error');
    return out;
  }

  const run = (fn) => async (...args) => { try { await fn(...args); } catch (e) { toast(e.message, true); } };

  /* ---------------- Sesión ---------------- */
  function showLogin() {
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
  }

  async function boot() {
    try {
      const { user } = await api('/api/auth/me');
      me = user;
      await startApp();
    } catch {
      showLogin();
    }
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    $('#login-error').textContent = '';
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: { username: f.username.value, password: f.password.value } });
      me = user;
      f.reset();
      await startApp();
    } catch (err) {
      $('#login-error').textContent = err.message;
    }
  });

  $('#logout').addEventListener('click', run(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    location.reload();
  }));

  $('#change-pass-btn').addEventListener('click', () => changePassword(false));

  function changePassword(forced) {
    openDialog(`
      <h2>${forced ? 'Crea tu nueva clave' : 'Cambiar clave'}</h2>
      ${forced ? '<p class="muted">Por seguridad, cambia la clave inicial antes de continuar.</p>' : ''}
      <form id="pass-form" class="form-grid">
        <label class="f full"><span>Clave actual</span><input name="current" type="password" required autocomplete="current-password"></label>
        <label class="f"><span>Nueva clave</span><input name="next" type="password" minlength="8" required autocomplete="new-password"></label>
        <label class="f"><span>Repetir nueva clave</span><input name="next2" type="password" minlength="8" required autocomplete="new-password"></label>
        <div class="actions full">${forced ? '' : '<button type="button" class="btn" data-close>Cancelar</button>'}<button class="btn primary">Guardar clave</button></div>
      </form>`, { locked: forced });
    $('#pass-form').addEventListener('submit', run(async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.next.value !== f.next2.value) throw new Error('Las claves no coinciden');
      await api('/api/auth/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } });
      me.mustChangePassword = false;
      closeDialog();
      toast('Clave actualizada');
    }));
  }

  async function startApp() {
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    $('#who').textContent = `${me.name} · ${me.role === 'admin' ? 'Administrador' : 'Personal'}`;
    $$('[data-admin]').forEach((a) => (a.hidden = !isAdmin()));
    await reload();
    route();
    if (me.mustChangePassword) changePassword(true);
    pollOrders();
    setInterval(pollOrders, 30_000);
  }

  async function reload() {
    state = await api('/api/admin/data');
    if (!selectedCat || !state.categories.some((c) => c.id === selectedCat)) selectedCat = state.categories[0]?.id || null;
  }

  async function pollOrders() {
    try {
      const s = await api('/api/admin/stats');
      const b = $('#pending-badge');
      b.hidden = !s.pending;
      b.textContent = s.pending;
      if (lastOrderCount !== null && s.todayOrders > lastOrderCount) {
        toast('🔔 ¡Nuevo pedido!');
        beep();
        if (location.hash === '#pedidos') renderOrders();
      }
      lastOrderCount = s.todayOrders;
    } catch {}
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); o.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  /* ---------------- Router ---------------- */
  const views = {
    resumen: renderSummary,
    pedidos: renderOrders,
    carta: renderCarta,
    local: renderSettings,
    usuarios: renderUsers,
    respaldo: renderBackup,
  };
  function route() {
    let v = location.hash.slice(1) || 'resumen';
    if (!views[v] || (['local', 'usuarios', 'respaldo'].includes(v) && !isAdmin())) v = 'resumen';
    $$('#side-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === v));
    run(views[v])();
  }
  window.addEventListener('hashchange', route);

  /* ---------------- Diálogo ---------------- */
  function openDialog(html, { locked = false } = {}) {
    const d = $('#dlg');
    $('#dlg-body').innerHTML = html;
    d.dataset.locked = locked ? '1' : '';
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', closeDialog));
    if (!d.open) d.showModal();
  }
  function closeDialog() { $('#dlg').close(); }
  $('#dlg').addEventListener('cancel', (e) => { if ($('#dlg').dataset.locked) e.preventDefault(); });

  /* ---------------- Subida de imágenes ---------------- */
  function imageField(name, value, label = 'Imagen') {
    return `<div class="f full"><span>${label}</span>
      <div class="img-field">
        <img src="${esc(value || '')}" alt="" data-preview="${name}" ${value ? '' : 'style="visibility:hidden"'}>
        <div class="img-actions">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${name}">
          <input name="${name}" value="${esc(value || '')}" placeholder="/uploads/... o https://...">
        </div>
      </div></div>`;
  }

  function bindUploads(root) {
    $$('[data-upload]', root).forEach((inp) => inp.addEventListener('change', run(async () => {
      const file = inp.files[0];
      if (!file) return;
      const dataUrl = await resizeImage(file);
      const { url } = await api('/api/admin/upload', { method: 'POST', body: { dataUrl } });
      const name = inp.dataset.upload;
      root.querySelector(`input[name="${name}"]`).value = url;
      const prev = root.querySelector(`[data-preview="${name}"]`);
      prev.src = url;
      prev.style.visibility = '';
      toast('Imagen subida');
    })));
    $$('.img-field input[name]', root).forEach((inp) => inp.addEventListener('input', () => {
      const prev = root.querySelector(`[data-preview="${inp.name}"]`);
      prev.src = inp.value;
      prev.style.visibility = inp.value ? '' : 'hidden';
    }));
  }

  // Reduce la imagen en el navegador (máx. 1400px) para que la página cargue rápido.
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/gif') {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        return r.readAsDataURL(file);
      }
      const img = new Image();
      img.onload = () => {
        const max = 1400;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------------- Resumen ---------------- */
  async function renderSummary() {
    const s = await api('/api/admin/stats');
    const { orders } = await api('/api/admin/orders');
    $('#content').innerHTML = `
      <div class="page-head"><div><h1>Hola, ${esc(me.name)} 👋</h1><p class="muted">Resumen de hoy en ${esc(state.settings.name)} ${esc(state.settings.branch)}</p></div></div>
      <div class="stats">
        <div class="stat"><b>${s.todayOrders}</b><span>Pedidos hoy</span></div>
        <div class="stat"><b>${clp(s.todayTotal)}</b><span>Vendido hoy (web)</span></div>
        <div class="stat"><b>${s.pending}</b><span>Pedidos en curso</span></div>
        <div class="stat"><b>${s.soldOut}</b><span>Productos agotados</span></div>
        <div class="stat"><b>${s.totalProducts}</b><span>Productos en la carta</span></div>
      </div>
      <div class="form-grid">
        <div class="panel"><h2>Últimos pedidos</h2>
          ${orders.length ? `<table class="list"><tbody>${orders.slice(0, 6).map((o) => `<tr><td>#${o.number}</td><td>${esc(o.customer.name)}</td><td>${clp(o.total)}</td><td><span class="tag">${STATUS_LABEL[o.status]}</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Aún no hay pedidos desde la web.</p>'}
          <p><a href="#pedidos">Ver todos los pedidos →</a></p>
        </div>
        <div class="panel"><h2>Lo más vendido</h2>
          ${s.top.length ? `<ol>${s.top.map(([n, q]) => `<li>${esc(n)} <span class="muted">· ${q}</span></li>`).join('')}</ol>` : '<p class="muted">Se mostrará cuando lleguen pedidos.</p>'}
        </div>
      </div>
      <div class="panel"><h2>¿Cómo funciona?</h2>
        <ol class="muted">
          <li>El cliente arma su pedido en la página y lo envía: queda registrado aquí en <b>Pedidos</b> y se abre WhatsApp con el detalle.</li>
          <li>Confirma por WhatsApp, recibe la transferencia y cambia el estado del pedido (Pagado → Preparando → Listo → Entregado).</li>
          <li>En <b>Carta y productos</b> puedes marcar algo como agotado al instante, cambiar precios, fotos y opciones.</li>
          ${isAdmin() ? '<li>En <b>Información del local</b> cambias textos, horario, teléfono, colores, avisos y datos de transferencia.</li>' : ''}
        </ol>
      </div>`;
  }

  /* ---------------- Pedidos ---------------- */
  async function renderOrders() {
    const qs = new URLSearchParams(orderFilter).toString();
    const { orders, statuses } = await api('/api/admin/orders?' + qs);
    $('#content').innerHTML = `
      <div class="page-head"><h1>Pedidos</h1>
        <div class="filters">
          <select id="of-status"><option value="">Todos los estados</option>${statuses.map((s) => `<option value="${s}" ${orderFilter.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
          <input id="of-q" class="search" placeholder="Buscar nº, nombre o teléfono" value="${esc(orderFilter.q)}">
          <button class="btn" id="of-refresh">↻ Actualizar</button>
        </div>
      </div>
      <div class="orders">${orders.length ? orders.map(orderCard).join('') : '<div class="panel muted">No hay pedidos con este filtro.</div>'}</div>`;

    $('#of-status').addEventListener('change', (e) => { orderFilter.status = e.target.value; renderOrders(); });
    let t;
    $('#of-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { orderFilter.q = e.target.value; run(renderOrders)().then(() => { const i = $('#of-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); });
    $('#of-refresh').addEventListener('click', run(renderOrders));
    $$('[data-status-for]').forEach((sel) => sel.addEventListener('change', run(async () => {
      await api(`/api/admin/orders/${sel.dataset.statusFor}`, { method: 'PATCH', body: { status: sel.value } });
      sel.closest('.order').dataset.status = sel.value;
      toast('Estado actualizado');
      pollOrders();
    })));
    $$('[data-note-for]').forEach((inp) => inp.addEventListener('change', run(async () => {
      await api(`/api/admin/orders/${inp.dataset.noteFor}`, { method: 'PATCH', body: { internalNote: inp.value } });
      toast('Nota guardada');
    })));
    $$('[data-del-order]').forEach((b) => b.addEventListener('click', run(async () => {
      if (!confirm('¿Eliminar este pedido? No se puede deshacer.')) return;
      await api(`/api/admin/orders/${b.dataset.delOrder}`, { method: 'DELETE' });
      renderOrders();
    })));
  }

  function orderCard(o) {
    const d = new Date(o.createdAt);
    const phone = (o.customer.phone || '').replace(/\D/g, '');
    const waPhone = phone.length === 9 ? '56' + phone : phone;
    return `<article class="order" data-status="${o.status}">
      <div class="order-head">
        <h3>#${o.number} · ${esc(o.customer.name)}</h3>
        <div class="filters">
          <strong>${clp(o.total)}</strong>
          <select data-status-for="${o.id}">${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        </div>
      </div>
      <div class="order-meta">
        <span>🕒 ${d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span>${o.mode === 'delivery' ? `🛵 Delivery: ${esc(o.customer.address)}` : '🏪 Retiro'}</span>
        ${o.schedule ? `<span>📅 Para: ${esc(o.schedule)}</span>` : ''}
        ${o.customer.phone ? `<span>📞 ${esc(o.customer.phone)} ${waPhone ? `· <a href="https://wa.me/${waPhone}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</span>` : ''}
      </div>
      <ul>${o.items.map((l) => `<li>${l.qty} × ${esc(l.name)} — ${clp(l.total)}${l.selected.length ? `<br><small>${l.selected.map((s) => `${esc(s.group)}: ${esc(s.options.join(', '))}`).join(' | ')}</small>` : ''}${l.note ? `<br><small>Nota: ${esc(l.note)}</small>` : ''}</li>`).join('')}</ul>
      ${o.notes ? `<p>📝 ${esc(o.notes)}</p>` : ''}
      <div class="filters">
        <input data-note-for="${o.id}" placeholder="Nota interna (solo la ve el equipo)" value="${esc(o.internalNote || '')}" style="flex:1;min-width:200px">
        ${isAdmin() ? `<button class="btn sm danger" data-del-order="${o.id}">Eliminar</button>` : ''}
      </div>
    </article>`;
  }

  /* ---------------- Carta ---------------- */
  function renderCarta() {
    const cats = state.categories;
    const cat = cats.find((c) => c.id === selectedCat);
    const needle = productFilter.toLowerCase();
    const products = state.products.filter((p) => (needle ? p.name.toLowerCase().includes(needle) : p.categoryId === selectedCat));

    $('#content').innerHTML = `
      <div class="page-head"><div><h1>Carta y productos</h1><p class="muted">${isAdmin() ? 'Todo lo que cambies aquí se ve de inmediato en la página.' : 'Puedes marcar productos como agotados o disponibles.'}</p></div>
        <input id="p-search" class="search" placeholder="Buscar producto en toda la carta" value="${esc(productFilter)}">
      </div>
      <div class="carta">
        <div class="panel">
          <div class="page-head" style="margin-bottom:.5rem"><h2 style="margin:0">Categorías</h2>${isAdmin() ? '<button class="btn sm primary" id="new-cat">+ Nueva</button>' : ''}</div>
          <ul class="cat-list">${cats.map((c, i) => `
            <li class="${c.id === selectedCat && !needle ? 'active' : ''}" data-cat="${c.id}">
              <span class="name">${esc(c.name)}</span>
              ${c.visible ? '' : '<span class="tag off">Oculta</span>'}
              <span class="count">${state.products.filter((p) => p.categoryId === c.id).length}</span>
              ${isAdmin() ? `
                <button class="icon-btn" data-move-cat="${i}" data-dir="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button class="icon-btn" data-move-cat="${i}" data-dir="1" title="Bajar" ${i === cats.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="icon-btn" data-edit-cat="${c.id}" title="Editar">✎</button>` : ''}
            </li>`).join('')}
          </ul>
        </div>
        <div class="panel">
          <div class="page-head" style="margin-bottom:.5rem">
            <div><h2 style="margin:0">${needle ? `Resultados para “${esc(productFilter)}”` : esc(cat?.name || 'Sin categorías')}</h2>${!needle && cat?.description ? `<small class="muted">${esc(cat.description)}</small>` : ''}</div>
            ${isAdmin() && cat ? '<button class="btn sm primary" id="new-prod">+ Nuevo producto</button>' : ''}
          </div>
          ${products.length ? `<table class="list">
            <thead><tr><th></th><th>Producto</th><th>Precio</th><th class="hide-sm">Visible</th><th>Disponible</th><th></th></tr></thead>
            <tbody>${products.map((p, i) => `
              <tr>
                <td>${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="">` : '<div class="thumb"></div>'}</td>
                <td><strong>${esc(p.name)}</strong> ${p.featured ? '<span class="tag star">Destacado</span>' : ''} ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''}
                  ${p.optionGroups.length ? `<br><small class="muted">${p.optionGroups.map((g) => esc(g.name)).join(' · ')}</small>` : ''}</td>
                <td>${clp(p.price)}</td>
                <td class="hide-sm">${isAdmin() ? `<label class="toggle"><input type="checkbox" data-vis="${p.id}" ${p.visible ? 'checked' : ''}><span></span></label>` : p.visible ? 'Sí' : 'No'}</td>
                <td><label class="toggle" title="Desactiva para marcar como agotado"><input type="checkbox" data-avail="${p.id}" ${p.available ? 'checked' : ''}><span></span></label></td>
                <td style="white-space:nowrap">${isAdmin() ? `
                  ${!needle ? `<button class="icon-btn" data-move-prod="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" data-move-prod="${i}" data-dir="1" ${i === products.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
                  <button class="icon-btn" data-edit-prod="${p.id}" title="Editar">✎</button>
                  <button class="icon-btn" data-dup-prod="${p.id}" title="Duplicar">⧉</button>` : ''}</td>
              </tr>`).join('')}</tbody></table>` : '<p class="muted">No hay productos aquí todavía.</p>'}
        </div>
      </div>`;

    let t;
    $('#p-search').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { productFilter = e.target.value; renderCarta(); const i = $('#p-search'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); });
    $$('.cat-list li').forEach((li) => li.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectedCat = li.dataset.cat;
      productFilter = '';
      renderCarta();
    }));
    $$('[data-avail]').forEach((inp) => inp.addEventListener('change', run(async () => {
      const { product } = await api(`/api/admin/products/${inp.dataset.avail}/availability`, { method: 'PATCH', body: { available: inp.checked } });
      Object.assign(state.products.find((p) => p.id === product.id), product);
      toast(inp.checked ? 'Marcado como disponible' : 'Marcado como agotado');
    })));
    $$('[data-vis]').forEach((inp) => inp.addEventListener('change', run(async () => {
      const p = state.products.find((x) => x.id === inp.dataset.vis);
      await saveProduct({ ...p, visible: inp.checked });
      toast(inp.checked ? 'Visible en la página' : 'Oculto de la página');
    })));
    $$('[data-move-cat]').forEach((b) => b.addEventListener('click', run(async () => {
      const ids = state.categories.map((c) => c.id);
      const i = +b.dataset.moveCat, j = i + +b.dataset.dir;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await api('/api/admin/reorder', { method: 'POST', body: { type: 'categories', ids } });
      await reload(); renderCarta();
    })));
    $$('[data-move-prod]').forEach((b) => b.addEventListener('click', run(async () => {
      const ids = products.map((p) => p.id);
      const i = +b.dataset.moveProd, j = i + +b.dataset.dir;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await api('/api/admin/reorder', { method: 'POST', body: { type: 'products', ids } });
      await reload(); renderCarta();
    })));
    $$('[data-edit-cat]').forEach((b) => b.addEventListener('click', () => editCategory(state.categories.find((c) => c.id === b.dataset.editCat))));
    $('#new-cat')?.addEventListener('click', () => editCategory(null));
    $$('[data-edit-prod]').forEach((b) => b.addEventListener('click', () => editProduct(state.products.find((p) => p.id === b.dataset.editProd))));
    $$('[data-dup-prod]').forEach((b) => b.addEventListener('click', run(async () => {
      const p = state.products.find((x) => x.id === b.dataset.dupProd);
      const copy = JSON.parse(JSON.stringify(p));
      delete copy.id;
      copy.name += ' (copia)';
      copy.order = p.order + 1;
      await api('/api/admin/products', { method: 'POST', body: copy });
      await reload(); renderCarta();
      toast('Producto duplicado');
    })));
    $('#new-prod')?.addEventListener('click', () => editProduct(null));
  }

  async function saveProduct(p) {
    const { product } = await api(`/api/admin/products/${p.id}`, { method: 'PUT', body: p });
    Object.assign(state.products.find((x) => x.id === product.id), product);
  }

  /* --- Editor de grupos de opciones (reutilizado en categoría y producto) --- */
  function groupsEditor(groups) {
    return `<div class="f full"><span>Opciones para el cliente</span>
      <small>Ej.: "Elige 1 proteína" (mín 1, máx 1), "Extras" (mín 0). El precio de cada opción se suma al precio base (usa 0 si no cambia).</small>
      <div class="groups" id="groups">${groups.map(groupHtml).join('')}</div>
      <div><button type="button" class="btn sm" id="add-group">+ Agregar grupo de opciones</button></div></div>`;
  }
  function groupHtml(g = { id: '', name: '', min: 1, max: 1, options: [{ name: '', price: 0 }] }) {
    return `<div class="group" data-gid="${esc(g.id)}">
      <div class="group-head">
        <label class="f"><span>Nombre del grupo</span><input data-g="name" value="${esc(g.name)}" placeholder="Ej: Elige 2 vegetales"></label>
        <label class="f"><span>Mínimo</span><input data-g="min" type="number" min="0" value="${g.min}"></label>
        <label class="f"><span>Máximo</span><input data-g="max" type="number" min="1" value="${g.max}"></label>
        <button type="button" class="btn sm danger" data-del-group>Quitar grupo</button>
      </div>
      <div class="opts">${g.options.map(optHtml).join('')}</div>
      <button type="button" class="btn sm" data-add-opt style="margin-top:.5rem">+ Opción</button>
    </div>`;
  }
  function optHtml(o = { name: '', price: 0 }) {
    return `<div class="opt-row"><input data-o="name" value="${esc(o.name)}" placeholder="Nombre de la opción"><input data-o="price" type="number" step="100" value="${o.price}" title="Precio adicional"><button type="button" class="icon-btn" data-del-opt title="Quitar">✕</button></div>`;
  }
  function bindGroups(root) {
    root.addEventListener('click', (e) => {
      if (e.target.id === 'add-group') $('#groups', root).insertAdjacentHTML('beforeend', groupHtml());
      if (e.target.matches('[data-del-group]')) e.target.closest('.group').remove();
      if (e.target.matches('[data-add-opt]')) e.target.previousElementSibling.insertAdjacentHTML('beforeend', optHtml());
      if (e.target.matches('[data-del-opt]')) e.target.closest('.opt-row').remove();
    });
  }
  function readGroups(root) {
    return $$('.group', root).map((g) => ({
      id: g.dataset.gid,
      name: $('[data-g=name]', g).value,
      min: +$('[data-g=min]', g).value,
      max: +$('[data-g=max]', g).value,
      options: $$('.opt-row', g).map((r) => ({ name: $('[data-o=name]', r).value, price: +$('[data-o=price]', r).value || 0 })).filter((o) => o.name.trim()),
    })).filter((g) => g.options.length);
  }

  function editCategory(c) {
    const isNew = !c;
    c = c || { name: '', description: '', image: '', visible: true, optionGroups: [] };
    openDialog(`
      <h2>${isNew ? 'Nueva categoría' : 'Editar categoría'}</h2>
      <form id="cat-form" class="form-grid">
        <label class="f"><span>Nombre</span><input name="name" required value="${esc(c.name)}"></label>
        <label class="check" style="align-self:end"><input type="checkbox" name="visible" ${c.visible ? 'checked' : ''}> Visible en la página</label>
        <label class="f full"><span>Descripción</span><textarea name="description" rows="2">${esc(c.description)}</textarea></label>
        ${imageField('image', c.image, 'Imagen de la categoría')}
        ${groupsEditor(c.optionGroups)}
        <small class="full muted">Las opciones de la categoría se aplican a todos sus productos (ej.: "Cambiar a roll +$300").</small>
        <div class="actions full">
          ${!isNew ? '<button type="button" class="btn danger" id="del-cat" style="margin-right:auto">Eliminar</button>' : ''}
          <button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">Guardar</button>
        </div>
      </form>`);
    const form = $('#cat-form');
    bindUploads(form);
    bindGroups(form);
    form.addEventListener('submit', run(async (e) => {
      e.preventDefault();
      const body = { name: form.name.value, description: form.description.value, image: form.image.value, visible: form.visible.checked, optionGroups: readGroups(form) };
      const out = isNew ? await api('/api/admin/categories', { method: 'POST', body }) : await api(`/api/admin/categories/${c.id}`, { method: 'PUT', body: { ...body, order: c.order } });
      if (isNew) selectedCat = out.category.id;
      closeDialog(); await reload(); renderCarta();
      toast('Categoría guardada');
    }));
    $('#del-cat')?.addEventListener('click', run(async () => {
      if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
      await api(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      closeDialog(); await reload(); renderCarta();
      toast('Categoría eliminada');
    }));
  }

  function editProduct(p) {
    const isNew = !p;
    p = p || { name: '', description: '', details: [], price: 0, image: '', badge: '', visible: true, available: true, featured: false, categoryId: selectedCat, optionGroups: [] };
    openDialog(`
      <h2>${isNew ? 'Nuevo producto' : 'Editar producto'}</h2>
      <form id="prod-form" class="form-grid">
        <label class="f full"><span>Nombre</span><input name="name" required value="${esc(p.name)}"></label>
        <label class="f"><span>Categoría</span><select name="categoryId">${state.categories.map((c) => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="f"><span>Precio base (CLP)</span><input name="price" type="number" min="0" step="100" required value="${p.price}"></label>
        <label class="f full"><span>Descripción</span><textarea name="description" rows="2">${esc(p.description)}</textarea></label>
        <label class="f full"><span>Detalle / contenido</span><textarea name="details" rows="4" placeholder="Una línea por ítem (ej. para tablas)">${esc(p.details.join('\n'))}</textarea></label>
        ${imageField('image', p.image)}
        <label class="f"><span>Etiqueta</span><input name="badge" value="${esc(p.badge)}" placeholder="Ej: Nuevo, Más pedida"></label>
        <div class="f" style="gap:.5rem;justify-content:end">
          <label class="check"><input type="checkbox" name="visible" ${p.visible ? 'checked' : ''}> Visible en la página</label>
          <label class="check"><input type="checkbox" name="available" ${p.available ? 'checked' : ''}> Disponible (no agotado)</label>
          <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Mostrar en "Lo más pedido"</label>
        </div>
        ${groupsEditor(p.optionGroups)}
        <div class="actions full">
          ${!isNew ? '<button type="button" class="btn danger" id="del-prod" style="margin-right:auto">Eliminar</button>' : ''}
          <button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">Guardar</button>
        </div>
      </form>`);
    const form = $('#prod-form');
    bindUploads(form);
    bindGroups(form);
    form.addEventListener('submit', run(async (e) => {
      e.preventDefault();
      const body = {
        name: form.name.value, categoryId: form.categoryId.value, price: +form.price.value, description: form.description.value,
        details: form.details.value, image: form.image.value, badge: form.badge.value, visible: form.visible.checked,
        available: form.available.checked, featured: form.featured.checked, optionGroups: readGroups(form),
      };
      if (isNew) await api('/api/admin/products', { method: 'POST', body: { ...body, order: state.products.filter((x) => x.categoryId === body.categoryId).length } });
      else await api(`/api/admin/products/${p.id}`, { method: 'PUT', body: { ...body, order: p.order } });
      closeDialog(); await reload(); renderCarta();
      toast('Producto guardado');
    }));
    $('#del-prod')?.addEventListener('click', run(async () => {
      if (!confirm(`¿Eliminar "${p.name}"?`)) return;
      await api(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      closeDialog(); await reload(); renderCarta();
      toast('Producto eliminado');
    }));
  }

  /* ---------------- Información del local ---------------- */
  function renderSettings() {
    const s = state.settings;
    const field = (name, label, opts = {}) => `<label class="f ${opts.full ? 'full' : ''}"><span>${label}</span>${opts.area ? `<textarea name="${name}" rows="${opts.rows || 3}">${esc(s[name])}</textarea>` : `<input name="${name}" value="${esc(s[name])}" ${opts.ph ? `placeholder="${opts.ph}"` : ''}>`}${opts.help ? `<small>${opts.help}</small>` : ''}</label>`;
    $('#content').innerHTML = `
      <div class="page-head"><h1>Información del local</h1><a class="btn" href="/" target="_blank" rel="noopener">Ver página ↗</a></div>
      <form id="settings-form">
        <div class="panel"><h2>Marca</h2><div class="form-grid">
          ${field('name', 'Nombre')}${field('branch', 'Sucursal')}
          ${field('slogan', 'Slogan')}
          <div class="f"><span>Colores</span><div style="display:flex;gap:1rem;align-items:center">
            <label class="check"><input type="color" name="color-primary" value="${esc(s.colors.primary)}"> Principal</label>
            <label class="check"><input type="color" name="color-accent" value="${esc(s.colors.accent)}"> Acento</label></div></div>
          ${imageField('logo', s.logo, 'Logo')}
        </div></div>

        <div class="panel"><h2>Portada</h2><div class="form-grid">
          ${field('heroTitle', 'Título principal', { full: true })}
          ${field('heroSubtitle', 'Texto de portada', { full: true, area: true })}
          ${imageField('heroImage', s.heroImage, 'Foto de portada')}
          <label class="check full"><input type="checkbox" name="ann-enabled" ${s.announcement?.enabled ? 'checked' : ''}> Mostrar barra de aviso arriba de la página</label>
          <label class="f full"><span>Texto del aviso</span><input name="ann-text" value="${esc(s.announcement?.text)}" placeholder="Ej: ¡Este sábado 2x1 en handrolls!"></label>
        </div></div>

        <div class="panel"><h2>Contacto y ubicación</h2><div class="form-grid">
          ${field('phone', 'Teléfono visible')}
          ${field('whatsapp', 'Número WhatsApp para pedidos', { help: 'Solo números con código país, ej: 56952787582' })}
          ${field('instagram', 'Instagram (sin @)')}
          ${field('address', 'Dirección')}
          ${field('addressNote', 'Nota de dirección')}
          ${field('mapsQuery', 'Búsqueda en Google Maps', { help: 'Lo que se busca para mostrar el mapa (puede ser dirección exacta o coordenadas "-33.4,-70.6").' })}
        </div></div>

        <div class="panel"><h2>Pedidos y pagos</h2><div class="form-grid">
          <label class="check"><input type="checkbox" name="pickupEnabled" ${s.pickupEnabled ? 'checked' : ''}> Permitir retiro en local</label>
          <label class="check"><input type="checkbox" name="deliveryEnabled" ${s.deliveryEnabled ? 'checked' : ''}> Permitir delivery</label>
          ${field('deliveryNote', 'Mensaje de delivery', { full: true })}
          ${field('paymentNotice', 'Aviso de pago', { full: true })}
          ${field('bankInfo', 'Datos de transferencia (opcional)', { full: true, area: true, help: 'Si lo completas, se muestra al cliente al enviar su pedido.' })}
        </div></div>

        <div class="panel"><h2>Horario</h2>
          <table class="list"><tbody>${s.hours.map((h, i) => `
            <tr><td><strong>${esc(h.day)}</strong></td>
            <td><input type="time" name="open-${i}" value="${esc(h.open)}"></td>
            <td><input type="time" name="close-${i}" value="${esc(h.close)}"></td>
            <td><label class="check"><input type="checkbox" name="closed-${i}" ${h.closed ? 'checked' : ''}> Cerrado</label></td></tr>`).join('')}
          </tbody></table>
        </div>

        <div class="panel"><h2>Nosotros</h2><div class="form-grid">
          ${field('aboutTitle', 'Título', { full: true })}
          ${field('aboutText', 'Texto', { full: true, area: true, rows: 5 })}
        </div></div>
        <div class="actions" style="position:sticky;bottom:0;background:var(--bg);padding:.8rem 0"><button class="btn primary">Guardar cambios</button></div>
      </form>`;
    const form = $('#settings-form');
    bindUploads(form);
    form.addEventListener('submit', run(async (e) => {
      e.preventDefault();
      const v = (n) => form.elements[n].value;
      const body = {};
      ['name', 'branch', 'slogan', 'logo', 'heroTitle', 'heroSubtitle', 'heroImage', 'phone', 'whatsapp', 'instagram', 'address', 'addressNote', 'mapsQuery', 'deliveryNote', 'paymentNotice', 'bankInfo', 'aboutTitle', 'aboutText'].forEach((k) => (body[k] = v(k)));
      body.pickupEnabled = form.pickupEnabled.checked;
      body.deliveryEnabled = form.deliveryEnabled.checked;
      if (!body.pickupEnabled && !body.deliveryEnabled) throw new Error('Activa al menos retiro o delivery');
      body.colors = { primary: v('color-primary'), accent: v('color-accent') };
      body.announcement = { enabled: form['ann-enabled'].checked, text: v('ann-text') };
      body.hours = s.hours.map((h, i) => ({ day: h.day, open: v(`open-${i}`), close: v(`close-${i}`), closed: form[`closed-${i}`].checked }));
      const out = await api('/api/admin/settings', { method: 'PUT', body });
      state.settings = out.settings;
      toast('Cambios guardados ✔');
    }));
  }

  /* ---------------- Usuarios ---------------- */
  async function renderUsers() {
    const { users } = await api('/api/admin/users');
    $('#content').innerHTML = `
      <div class="page-head"><h1>Usuarios</h1></div>
      <div class="panel">
        <table class="list"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th></th></tr></thead>
        <tbody>${users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td><span class="tag ${u.role === 'admin' ? 'star' : ''}">${u.role === 'admin' ? 'Administrador' : 'Personal'}</span></td>
          <td>${u.id === me.id ? '<small class="muted">Tú</small>' : `<button class="btn sm danger" data-del-user="${u.id}">Eliminar</button>`}</td></tr>`).join('')}</tbody></table>
      </div>
      <div class="panel"><h2>Agregar usuario</h2>
        <form id="user-form" class="form-grid">
          <label class="f"><span>Nombre</span><input name="name" required></label>
          <label class="f"><span>Usuario</span><input name="username" required pattern="[a-zA-Z0-9._-]{3,}" placeholder="ej: cocina"></label>
          <label class="f"><span>Clave inicial</span><input name="password" type="text" minlength="8" required><small>Se le pedirá cambiarla al ingresar.</small></label>
          <label class="f"><span>Rol</span><select name="role"><option value="staff">Personal (pedidos y agotados)</option><option value="admin">Administrador (todo)</option></select></label>
          <div class="actions full"><button class="btn primary">Crear usuario</button></div>
        </form>
      </div>`;
    $('#user-form').addEventListener('submit', run(async (e) => {
      e.preventDefault();
      const f = e.target;
      await api('/api/admin/users', { method: 'POST', body: { name: f.name.value, username: f.username.value, password: f.password.value, role: f.role.value } });
      toast('Usuario creado');
      renderUsers();
    }));
    $$('[data-del-user]').forEach((b) => b.addEventListener('click', run(async () => {
      if (!confirm('¿Eliminar este usuario?')) return;
      await api(`/api/admin/users/${b.dataset.delUser}`, { method: 'DELETE' });
      renderUsers();
    })));
  }

  /* ---------------- Respaldo ---------------- */
  function renderBackup() {
    $('#content').innerHTML = `
      <div class="page-head"><h1>Respaldo</h1></div>
      <div class="panel"><h2>Descargar respaldo</h2>
        <p class="muted">Guarda una copia de la carta, la información del local y los pedidos (las claves de usuarios no se incluyen).</p>
        <a class="btn primary" href="/api/admin/backup">⬇ Descargar respaldo (.json)</a>
      </div>
      <div class="panel"><h2>Restaurar respaldo</h2>
        <p class="muted">Reemplaza la carta y la información actual por la del archivo. Los usuarios se mantienen.</p>
        <input type="file" id="restore-file" accept="application/json,.json">
      </div>`;
    $('#restore-file').addEventListener('change', run(async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm('Esto reemplazará la carta y la información actuales. ¿Continuar?')) { e.target.value = ''; return; }
      const json = JSON.parse(await file.text());
      await api('/api/admin/restore', { method: 'POST', body: json });
      await reload();
      toast('Respaldo restaurado');
    }));
  }

  boot();
})();
