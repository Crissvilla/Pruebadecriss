// Majori Sushi Los Laureles — sitio público + intranet de administración.
// Ejecutar: npm start  (puerto por defecto 3000)

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildSeed } = require('./src/seed');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SESSION_HOURS = 12;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Almacenamiento (archivo JSON con escritura atómica)                 */
/* ------------------------------------------------------------------ */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

let db;
function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    db = buildSeed();
    const initialPassword = process.env.ADMIN_PASSWORD || 'majori2026';
    db.users.push({
      id: newId(),
      username: process.env.ADMIN_USER || 'admin',
      name: 'Administrador',
      role: 'admin',
      password: hashPassword(initialPassword),
      mustChangePassword: !process.env.ADMIN_PASSWORD,
    });
    saveDb();
    console.log(`Base de datos creada. Usuario: admin / Clave: ${initialPassword}`);
  }
}

function saveDb() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

loadDb();

/* ------------------------------------------------------------------ */
/* Validación / limpieza de datos                                      */
/* ------------------------------------------------------------------ */

const str = (v, max = 2000) => (v === undefined || v === null ? '' : String(v).slice(0, max).trim());
const int = (v, min = 0, max = 10_000_000) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const bool = (v) => v === true || v === 'true' || v === 1 || v === 'on';
const imagePath = (v) => {
  const s = str(v, 500);
  return s === '' || s.startsWith('/img/') || s.startsWith('/uploads/') || /^https:\/\//.test(s) ? s : '';
};

function cleanOptionGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.slice(0, 20).map((g) => {
    const options = (Array.isArray(g.options) ? g.options : [])
      .slice(0, 50)
      .map((o) => ({ name: str(o.name, 120), price: int(o.price, -1_000_000) }))
      .filter((o) => o.name);
    const max = Math.max(1, Math.min(int(g.max, 1, 50), options.length || 1));
    return {
      id: str(g.id, 40) || newId(),
      name: str(g.name, 120) || 'Opciones',
      min: Math.min(int(g.min, 0, 50), max),
      max,
      options,
    };
  });
}

function cleanSettings(input, current) {
  const s = { ...current };
  const textFields = {
    name: 120, branch: 120, slogan: 200, heroTitle: 200, heroSubtitle: 600, phone: 40,
    instagram: 80, address: 300, addressNote: 300, mapsQuery: 300, paymentNotice: 400,
    bankInfo: 1000, deliveryNote: 400, aboutTitle: 200, aboutText: 4000,
  };
  for (const [k, max] of Object.entries(textFields)) if (k in input) s[k] = str(input[k], max);
  if ('whatsapp' in input) s.whatsapp = str(input.whatsapp, 30).replace(/\D/g, '');
  if ('instagram' in input) s.instagram = s.instagram.replace(/^@/, '');
  if ('heroImage' in input) s.heroImage = imagePath(input.heroImage);
  if ('logo' in input) s.logo = imagePath(input.logo);
  if ('deliveryEnabled' in input) s.deliveryEnabled = bool(input.deliveryEnabled);
  if ('pickupEnabled' in input) s.pickupEnabled = bool(input.pickupEnabled);
  if (input.announcement) {
    s.announcement = { enabled: bool(input.announcement.enabled), text: str(input.announcement.text, 300) };
  }
  if (input.colors) {
    const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);
    s.colors = {
      primary: hex(input.colors.primary, current.colors.primary),
      accent: hex(input.colors.accent, current.colors.accent),
    };
  }
  if (Array.isArray(input.hours)) {
    s.hours = input.hours.slice(0, 7).map((h) => ({
      day: str(h.day, 20),
      open: /^\d{2}:\d{2}$/.test(h.open) ? h.open : '09:00',
      close: /^\d{2}:\d{2}$/.test(h.close) ? h.close : '21:00',
      closed: bool(h.closed),
    }));
  }
  return s;
}

function cleanCategory(input, current = {}) {
  return {
    id: current.id || newId(),
    name: str(input.name, 120) || current.name || 'Nueva categoría',
    description: str(input.description, 600),
    image: imagePath(input.image),
    visible: 'visible' in input ? bool(input.visible) : current.visible ?? true,
    order: 'order' in input ? int(input.order, 0, 10000) : current.order ?? db.categories.length,
    optionGroups: cleanOptionGroups(input.optionGroups),
  };
}

function cleanProduct(input, current = {}) {
  const categoryId = str(input.categoryId, 40);
  if (!db.categories.some((c) => c.id === categoryId)) throw httpError(400, 'Categoría inválida');
  return {
    id: current.id || newId(),
    categoryId,
    name: str(input.name, 160) || 'Nuevo producto',
    description: str(input.description, 800),
    details: (Array.isArray(input.details) ? input.details : String(input.details || '').split('\n'))
      .map((d) => str(d, 200))
      .filter(Boolean)
      .slice(0, 40),
    price: int(input.price),
    image: imagePath(input.image),
    badge: str(input.badge, 40),
    visible: 'visible' in input ? bool(input.visible) : current.visible ?? true,
    available: 'available' in input ? bool(input.available) : current.available ?? true,
    featured: bool(input.featured),
    order: 'order' in input ? int(input.order, 0, 10000) : current.order ?? 999,
    optionGroups: cleanOptionGroups(input.optionGroups),
  };
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/* ------------------------------------------------------------------ */
/* Sesiones                                                            */
/* ------------------------------------------------------------------ */

const sessions = new Map(); // token -> { userId, expires }
const loginAttempts = new Map(); // ip -> { count, until }

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

function currentUser(req) {
  const token = parseCookies(req.headers.cookie).majori_session;
  const s = token && sessions.get(token);
  if (!s || s.expires < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return db.users.find((u) => u.id === s.userId) || null;
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, mustChangePassword: !!u.mustChangePassword });

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Protección CSRF básica: las escrituras deben venir del mismo origen.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== req.headers.host) return res.status(403).json({ error: 'Origen no permitido' });
  }
  next();
});

/* ---------- API pública ---------- */

app.get('/api/content', (req, res) => {
  const categories = db.categories.filter((c) => c.visible).sort((a, b) => a.order - b.order);
  const ids = new Set(categories.map((c) => c.id));
  const products = db.products
    .filter((p) => p.visible && ids.has(p.categoryId))
    .sort((a, b) => a.order - b.order);
  res.json({ settings: db.settings, categories, products });
});

app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!items.length) return res.status(400).json({ error: 'El pedido está vacío' });

  // El precio se recalcula en el servidor: no se confía en el navegador.
  const lines = [];
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.productId && x.visible);
    if (!p) return res.status(400).json({ error: 'Un producto ya no está disponible' });
    if (!p.available) return res.status(400).json({ error: `"${p.name}" está agotado por hoy` });
    const cat = db.categories.find((c) => c.id === p.categoryId);
    const groups = [...(cat?.optionGroups || []), ...p.optionGroups];
    const chosen = it.options && typeof it.options === 'object' ? it.options : {};
    let unit = p.price;
    const selected = [];
    for (const g of groups) {
      const picks = (Array.isArray(chosen[g.id]) ? chosen[g.id] : []).map(String);
      const valid = g.options.filter((o) => picks.includes(o.name));
      if (valid.length < g.min || valid.length > g.max) {
        return res.status(400).json({ error: `Revisa las opciones de "${p.name}": ${g.name}` });
      }
      valid.forEach((o) => (unit += o.price));
      if (valid.length) selected.push({ group: g.name, options: valid.map((o) => o.name) });
    }
    const qty = int(it.qty, 1, 50);
    lines.push({ productId: p.id, name: p.name, qty, unitPrice: unit, total: unit * qty, selected, note: str(it.note, 200) });
  }

  const mode = b.mode === 'delivery' ? 'delivery' : 'retiro';
  const order = {
    id: newId(),
    number: ++db.orderCounter,
    createdAt: new Date().toISOString(),
    status: 'nuevo',
    customer: { name: str(b.name, 120), phone: str(b.phone, 40), address: mode === 'delivery' ? str(b.address, 300) : '' },
    mode,
    schedule: str(b.schedule, 120),
    notes: str(b.notes, 600),
    items: lines,
    total: lines.reduce((s, l) => s + l.total, 0),
  };
  if (!order.customer.name) return res.status(400).json({ error: 'Indica tu nombre' });
  if (mode === 'delivery' && !order.customer.address) return res.status(400).json({ error: 'Indica la dirección de entrega' });
  db.orders.unshift(order);
  db.orders = db.orders.slice(0, 5000);
  saveDb();
  res.json({ order });
});

/* ---------- Autenticación ---------- */

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip;
  const a = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });

  const { username, password } = req.body || {};
  const user = db.users.find((u) => u.username.toLowerCase() === str(username, 60).toLowerCase());
  if (!user || !verifyPassword(String(password || ''), user.password)) {
    a.count += 1;
    if (a.count >= 5) Object.assign(a, { count: 0, until: Date.now() + 5 * 60_000 });
    loginAttempts.set(ip, a);
    return res.status(401).json({ error: 'Usuario o clave incorrectos' });
  }
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_HOURS * 3600_000 });
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `majori_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secure}`);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie).majori_session;
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'majori_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (!verifyPassword(String(current || ''), req.user.password)) return res.status(400).json({ error: 'La clave actual no es correcta' });
  if (String(next || '').length < 8) return res.status(400).json({ error: 'La nueva clave debe tener al menos 8 caracteres' });
  req.user.password = hashPassword(String(next));
  req.user.mustChangePassword = false;
  saveDb();
  res.json({ ok: true });
});

/* ---------- Intranet ---------- */

const admin = express.Router();
admin.use(requireAuth);

admin.get('/data', (req, res) => {
  res.json({
    settings: db.settings,
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    products: [...db.products].sort((a, b) => a.order - b.order),
    user: publicUser(req.user),
  });
});

admin.put('/settings', requireAdmin, (req, res) => {
  db.settings = cleanSettings(req.body || {}, db.settings);
  saveDb();
  res.json({ settings: db.settings });
});

admin.post('/categories', requireAdmin, (req, res) => {
  const cat = cleanCategory(req.body || {});
  db.categories.push(cat);
  saveDb();
  res.json({ category: cat });
});

admin.put('/categories/:id', requireAdmin, (req, res) => {
  const i = db.categories.findIndex((c) => c.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'No existe' });
  db.categories[i] = cleanCategory(req.body || {}, db.categories[i]);
  saveDb();
  res.json({ category: db.categories[i] });
});

admin.delete('/categories/:id', requireAdmin, (req, res) => {
  if (db.products.some((p) => p.categoryId === req.params.id)) {
    return res.status(400).json({ error: 'Primero mueve o elimina los productos de esta categoría' });
  }
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

admin.post('/reorder', requireAdmin, (req, res) => {
  const { type, ids } = req.body || {};
  const list = type === 'categories' ? db.categories : type === 'products' ? db.products : null;
  if (!list || !Array.isArray(ids)) return res.status(400).json({ error: 'Datos inválidos' });
  ids.forEach((id, i) => {
    const item = list.find((x) => x.id === id);
    if (item) item.order = i;
  });
  saveDb();
  res.json({ ok: true });
});

admin.post('/products', requireAdmin, (req, res) => {
  const p = cleanProduct(req.body || {});
  db.products.push(p);
  saveDb();
  res.json({ product: p });
});

admin.put('/products/:id', requireAdmin, (req, res) => {
  const i = db.products.findIndex((p) => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'No existe' });
  db.products[i] = cleanProduct(req.body || {}, db.products[i]);
  saveDb();
  res.json({ product: db.products[i] });
});

// Disponible para todo el personal: marcar agotado / disponible.
admin.patch('/products/:id/availability', (req, res) => {
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'No existe' });
  p.available = bool(req.body?.available);
  saveDb();
  res.json({ product: p });
});

admin.delete('/products/:id', requireAdmin, (req, res) => {
  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

admin.post('/upload', requireAdmin, (req, res) => {
  const m = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
  if (!m) return res.status(400).json({ error: 'Formato de imagen no válido (usa JPG, PNG, WEBP o GIF)' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'La imagen supera 5 MB' });
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.json({ url: `/uploads/${name}` });
});

const ORDER_STATUSES = ['nuevo', 'pagado', 'preparando', 'listo', 'entregado', 'cancelado'];

admin.get('/orders', (req, res) => {
  const { status, q } = req.query;
  let list = db.orders;
  if (status && ORDER_STATUSES.includes(status)) list = list.filter((o) => o.status === status);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((o) => `${o.number} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(needle));
  }
  res.json({ orders: list.slice(0, 300), statuses: ORDER_STATUSES });
});

admin.patch('/orders/:id', (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'No existe' });
  if (req.body?.status && ORDER_STATUSES.includes(req.body.status)) o.status = req.body.status;
  if ('internalNote' in (req.body || {})) o.internalNote = str(req.body.internalNote, 600);
  saveDb();
  res.json({ order: o });
});

admin.delete('/orders/:id', requireAdmin, (req, res) => {
  db.orders = db.orders.filter((o) => o.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

admin.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const valid = db.orders.filter((o) => o.status !== 'cancelado');
  const todays = valid.filter((o) => o.createdAt.slice(0, 10) === today);
  const counts = {};
  valid.slice(0, 1000).forEach((o) => o.items.forEach((l) => (counts[l.name] = (counts[l.name] || 0) + l.qty)));
  res.json({
    todayOrders: todays.length,
    todayTotal: todays.reduce((s, o) => s + o.total, 0),
    pending: db.orders.filter((o) => ['nuevo', 'pagado', 'preparando', 'listo'].includes(o.status)).length,
    totalProducts: db.products.length,
    soldOut: db.products.filter((p) => !p.available).length,
    top: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5),
  });
});

admin.get('/users', requireAdmin, (req, res) => res.json({ users: db.users.map(publicUser) }));

admin.post('/users', requireAdmin, (req, res) => {
  const username = str(req.body?.username, 60).toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[a-z0-9._-]{3,}$/.test(username)) return res.status(400).json({ error: 'Usuario inválido (mín. 3 letras/números)' });
  if (db.users.some((u) => u.username === username)) return res.status(400).json({ error: 'Ese usuario ya existe' });
  if (password.length < 8) return res.status(400).json({ error: 'La clave debe tener al menos 8 caracteres' });
  const user = {
    id: newId(),
    username,
    name: str(req.body?.name, 120) || username,
    role: req.body?.role === 'admin' ? 'admin' : 'staff',
    password: hashPassword(password),
    mustChangePassword: true,
  };
  db.users.push(user);
  saveDb();
  res.json({ user: publicUser(user) });
});

admin.delete('/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  db.users = db.users.filter((u) => u.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

admin.get('/backup', requireAdmin, (req, res) => {
  const { users, ...safe } = db;
  res.setHeader('Content-Disposition', `attachment; filename="majori-respaldo-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(safe);
});

admin.post('/restore', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.settings || !Array.isArray(b.categories) || !Array.isArray(b.products)) {
    return res.status(400).json({ error: 'El archivo de respaldo no es válido' });
  }
  const prev = db;
  try {
    db = { ...db, settings: cleanSettings(b.settings, prev.settings), categories: [], products: [] };
    db.categories = b.categories.map((c) => ({ ...cleanCategory(c), id: str(c.id, 40) || newId() }));
    db.products = b.products.map((p) => ({ ...cleanProduct(p), id: str(p.id, 40) || newId() }));
    if (Array.isArray(b.orders)) db.orders = b.orders;
    if (b.orderCounter) db.orderCounter = int(b.orderCounter);
    saveDb();
    res.json({ ok: true });
  } catch (e) {
    db = prev;
    throw e;
  }
});

app.use('/api/admin', admin);

/* ---------- Archivos estáticos ---------- */

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));

app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Error interno' : err.message });
});

app.listen(PORT, () => console.log(`Majori Sushi corriendo en http://localhost:${PORT}  (intranet: /admin)`));
