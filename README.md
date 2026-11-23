# Majori Sushi Los Laureles · Sitio web + Intranet

Página web del local **Majori Sushi Los Laureles** (Strip Center Paseo Los Laureles, poste 49 · WhatsApp +56 9 5278 7582 · Instagram [@majori_loslaureles](https://instagram.com/majori_loslaureles)), con una intranet donde se edita todo el contenido.

## Qué incluye

**Sitio público** (`/`)
- Portada con estado "Abierto ahora / Cerrado" calculado con la hora de Chile y el horario configurado.
- Sección "Lo más pedido" con productos destacados.
- La carta completa con navegación por categorías: Tablas, Handrolls Panko, Handrolls Nori o Semilla, Rolls Avocado, Rolls Queso Crema, Gohan, Sushiburger, Sushipleto y Handrolls Vegetales.
- Armado de productos con opciones y precios: Mixta/Hot en tablas, proteína + vegetales en gohan, sushiburger y sushipleto, cambio a salmón (+$500), formato handroll/roll (+$300) y envoltura nori o semilla.
- Carro de compras con retiro o delivery, "¿para cuándo?" (agendar) y comentarios. Al enviar, el pedido queda guardado en la intranet y se abre WhatsApp con el detalle listo.
- Secciones Nosotros, ubicación con mapa, horario e Instagram. Diseño adaptado a celular.

**Intranet** (`/admin`)
- **Resumen**: pedidos y ventas del día, pedidos en curso, productos agotados y lo más vendido.
- **Pedidos**: llegan en tiempo real, con aviso sonoro. Se puede cambiar el estado (Nuevo → Pagado → Preparando → Listo → Entregado / Cancelado), agregar notas internas y abrir el WhatsApp del cliente.
- **Carta y productos**: crear, editar, duplicar, ordenar, ocultar y eliminar categorías y productos. Se editan precios, fotos (se suben desde el celular o el PC), descripciones, etiquetas ("Nuevo", "Más pedida"), destacados y grupos de opciones. El interruptor **Disponible** marca un producto como agotado al instante.
- **Información del local**: nombre, slogan, colores, logo, portada, barra de avisos, teléfono, WhatsApp, Instagram, dirección, mapa, horario por día, retiro/delivery, aviso de pago, datos de transferencia y texto de "Nosotros".
- **Usuarios**: dos roles. *Administrador* puede editar todo. *Personal* gestiona pedidos y marca productos agotados.
- **Respaldo**: descarga y restauración de toda la información en un archivo `.json`.

## Cómo ejecutarlo

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

- Sitio: http://localhost:3000
- Intranet: http://localhost:3000/admin
- Usuario inicial: `admin`. Clave inicial: `majori2026`. El sistema pide cambiarla en el primer ingreso.

Variables de entorno opcionales:

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor (por defecto 3000) |
| `DATA_DIR` | Carpeta donde se guardan los datos y las fotos subidas (por defecto `./data`) |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Usuario y clave del primer administrador. Solo se usan la primera vez que arranca. |

## Dónde se guarda la información

Todo se guarda en `data/db.json` y las fotos subidas en `data/uploads/`. La carpeta se crea sola la primera vez con la carta inicial, que viene del catálogo de WhatsApp Business. **Respalda esa carpeta** o usa la opción *Respaldo* de la intranet.

## Publicarlo en internet

Funciona en cualquier hosting que ejecute Node.js y tenga **disco persistente**: Railway, Render (con disco), Fly.io (con volumen) o un VPS. Pasos:

1. Sube este repositorio al hosting.
2. Comando de inicio: `npm start`.
3. Configura `DATA_DIR` apuntando al disco persistente y define `ADMIN_PASSWORD`.
4. Usa HTTPS. Con HTTPS la cookie de sesión se marca como segura automáticamente.

> Sin disco persistente, los cambios hechos en la intranet se pierden cuando el servidor se reinicia.

## Estructura

```
server.js            Servidor Express: API pública, autenticación e intranet
src/seed.js          Carta inicial (solo se usa la primera vez)
public/              Sitio público (index.html, styles.css, app.js, img/)
public/admin/        Intranet (index.html, admin.css, admin.js)
```
