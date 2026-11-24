Necesito que instales y publiques en este servidor un sitio web completo con intranet para un local de sushi real: **Majori Sushi Los Laureles**. Es un proyecto aparte de VentaChile Network: NO modifiques ni reemplaces el sitio actual de VentaChile. Publícalo en su propio subdominio (por ejemplo `majori.<mi-dominio>`) o en su propia ruta/puerto, en su propia carpeta y como su propio servicio. Antes de tocar la configuración del servidor web (nginx/caddy/apache), muéstrame qué vas a cambiar.

## Paso 1: Usar el código que ya existe (preferido)

El código ya está terminado y probado en GitHub:
- Repositorio: `crissvilla/pruebadecriss`
- Rama: `claude/youthful-pascal-l3eiya`

Si tienes acceso a ese repositorio, clónalo en esa rama y úsalo tal cual. No lo reescribas. Luego:
1. Instala Node.js 18 o superior si no está.
2. `npm install` y luego `npm start` (por defecto usa el puerto 3000; cámbialo con la variable `PORT` si está ocupado).
3. Configura estas variables de entorno:
   - `PORT`: un puerto libre.
   - `DATA_DIR`: una carpeta persistente fuera del código, por ejemplo `/var/lib/majori`. Ahí se guardan `db.json` y las fotos subidas.
   - `ADMIN_PASSWORD`: una clave segura para el usuario `admin`. Dímela al final.
4. Déjalo corriendo como servicio que se reinicie solo (systemd o pm2) y que arranque con el servidor.
5. Pon un proxy inverso con HTTPS hacia ese puerto. Pasa el encabezado `X-Forwarded-Proto` para que la cookie de sesión sea segura.
6. Agrega un respaldo diario de la carpeta `DATA_DIR`.
7. Al final, entrégame el link de la página, el link de la intranet (`/admin`), el usuario y la clave, y verifica que ambas cargan.

Si NO tienes acceso a ese repositorio, constrúyelo desde cero siguiendo exactamente la especificación de abajo.

## Paso 2 (solo si no hay acceso al repo): Especificación completa

### Tecnología
- Node.js 18+ con Express 4 como única dependencia.
- Datos en un archivo JSON (`DATA_DIR/db.json`) con escritura atómica: escribir en `.tmp` y luego renombrar.
- Fotos subidas en `DATA_DIR/uploads/`, servidas en `/uploads/`.
- Frontend en HTML, CSS y JavaScript sin frameworks, en `public/`. La intranet va en `public/admin/`.
- Todo el texto de la interfaz en español de Chile. Precios en CLP con formato `$9.500`.

### Datos del negocio
- Nombre: Majori Sushi. Sucursal: Los Laureles. Slogan: "Explosión de sabores".
- Dirección: Strip Center Paseo Los Laureles, poste 49.
- WhatsApp y teléfono: +56 9 5278 7582 (para links `wa.me` usar `56952787582`).
- Instagram: @majori_loslaureles.
- Horario: lunes a domingo de 09:00 a 21:00.
- Aviso de pago: "Se debe realizar la transferencia antes de empezar el pedido."
- Ofrecen retiro en el local y delivery. El costo del delivery se confirma por WhatsApp.
- Logo: círculo negro con un sol rojo, un torii rojo, el monte Fuji y el texto "MAJORI".

### Diseño del sitio público
- Fondo casi negro (`#0e0e0f`), rojo principal `#d62828` y dorado de acento `#e9a23b`. Ambos colores se editan desde la intranet.
- Patrón japonés de olas (seigaiha) dorado y sutil de fondo en la portada y en "Nosotros", como en la carta impresa.
- Tipografías de Google Fonts: Outfit para el texto y Kaushan Script para el slogan.
- Diseño mobile-first, sin scroll horizontal en el celular.

### Secciones del sitio público
1. Barra de aviso superior, editable y activable o desactivable.
2. Header fijo con logo, nombre y sucursal, menú (Carta, Nosotros, Ubicación) y botón "Mi pedido" con un contador.
3. Portada (hero):
   - Indicador "Abierto ahora · hasta las 21:00" o "Cerrado · abrimos a las 09:00", calculado con la zona horaria America/Santiago y el horario configurado.
   - Slogan, título, subtítulo y foto con un círculo rojo detrás (el sol del logo).
   - Botones "Ver la carta" y "Escríbenos por WhatsApp".
4. "Lo más pedido": fila con scroll horizontal de los productos marcados como destacados. Cada tarjeta muestra el nombre de su categoría.
5. Carta:
   - Barra de categorías fija (chips) que resalta la categoría visible al hacer scroll.
   - Cada categoría muestra imagen redonda, nombre y descripción, y una grilla de tarjetas.
   - Cada tarjeta lleva foto, etiqueta (por ejemplo "Nuevo" o "Más pedida"), nombre, descripción, lista de detalle (para las tablas), precio ("desde" cuando hay opciones con costo) y botón "Agregar".
   - Los productos agotados muestran "Agotado" con el botón deshabilitado.
   - Si un grupo propio del producto tiene una sola elección obligatoria con precios distintos (Mixta/Hot), mostrar ambos precios en la tarjeta.
6. Modal de producto:
   - Muestra los grupos de opciones: radio si min = max = 1, checkbox en los demás casos, respetando mínimos y máximos.
   - Muestra el precio extra de cada opción, un comentario opcional, la cantidad y el botón "Agregar · $total".
   - Valida los grupos incompletos y los marca en rojo.
7. Carro (panel lateral):
   - Líneas con sus opciones, cantidad editable, opción para quitar y total.
   - Formulario: retiro o delivery, nombre, teléfono, dirección (solo para delivery), "¿Para cuándo?", comentarios, aviso de pago y datos de transferencia si existen.
   - Se guarda en `localStorage`, igual que los datos del cliente.
   - Al enviar: hacer POST a `/api/orders`, que guarda el pedido y responde con un número correlativo (desde el #1001). Luego abrir `wa.me` con un mensaje como este:
     "🍣 *Pedido #1001* — Majori Sushi Los Laureles / • 1 x Gohan 1x3 — $6.500 / opciones… / *Total* / 👤 nombre · teléfono / 🛵 Delivery a: … o 🏪 Retiro / 🕒 Para: … / 📝 notas / Quedo atento/a a los datos para la transferencia 🙌"
   - Abrir la ventana antes del fetch para que el navegador no la bloquee.
8. Nosotros: logo grande, título, texto y botón a Instagram.
9. Ubicación: dirección, nota, tabla de horario con el día actual destacado, links a WhatsApp e Instagram, y mapa con un iframe `https://www.google.com/maps?q=<búsqueda>&output=embed`.
10. Footer con un link discreto a "Intranet". Botón flotante verde de WhatsApp.

### Modelo de datos (`db.json`)
- `settings`:
  - name, branch, slogan, heroTitle, heroSubtitle, heroImage, logo
  - phone, whatsapp, instagram, address, addressNote, mapsQuery
  - hours: 7 días con day, open, close y closed
  - paymentNotice, bankInfo, deliveryEnabled, deliveryNote, pickupEnabled
  - announcement: enabled y text
  - aboutTitle, aboutText
  - colors: primary y accent
- `categories[]`: id, name, description, image, visible, order, optionGroups[].
- `products[]`: id, categoryId, name, description, details[] (una línea por ítem), price, image, badge, visible, available, featured, order, optionGroups[].
- `optionGroups[]`: id, name, min, max, options[] con name y price.
  - El precio de cada opción se suma al precio base.
  - Los grupos de la categoría se aplican a todos sus productos, antes de los grupos propios del producto.
- `orders[]`:
  - id, number, createdAt, status
  - customer: name, phone, address
  - mode (retiro o delivery), schedule, notes, internalNote
  - items[] con productId, name, qty, unitPrice, total, selected[] (grupo y opciones) y note
  - total
- `orderCounter` y `users[]`.

### Carta inicial (cargarla la primera vez)

**Tablas** (descripción: "Para compartir. Se debe realizar la transferencia antes de empezar el pedido."). Grupo propio de cada tabla: "Tipo de tabla", con Mixta (+0) y Hot (todo frito).
- Tabla 1 · 24 piezas: $9.500 Mixta, Hot +$1.000. Etiqueta "Más pedida", destacada. Contenido:
  - 10 cortes pollo Majori, palta, queso crema en hotroll
  - 10 cortes kanikama, cebollín, queso crema envuelto en nori
  - 4 bolitas crispy
  - 2 salsas y palitos
- Tabla 2 · 44 piezas: $16.000, Hot +$1.500. Contenido:
  - 10 cortes pollo Majori, pimentón, queso crema en hotroll
  - 10 cortes camarón furay, cebollín, queso crema envuelto en semilla
  - 10 cortes kanikama, cebollín, queso crema envuelto en nori
  - 10 cortes hosomaki, queso crema, pimentón en hotroll
  - 4 bolitas krispy
  - 4 salsas y palitos
- Tabla 3 · 54 piezas: $18.500, Hot +$1.000. Contenido:
  - 10 cortes pollo Majori, pimentón, queso crema en hotroll
  - 10 cortes camarón furay, cebollín, queso crema envuelto en semilla
  - 10 cortes kanikama, cebollín, queso crema envuelto en nori
  - 10 cortes salmón, palta, queso crema envuelto en queso crema
  - 10 cortes hosomaki queso crema, pimentón en hotroll
  - 4 bolitas krispy
  - 5 salsas y palitos
- Tabla 4 · 64 piezas: $20.500, Hot +$1.000. Contenido:
  - Lo mismo de la Tabla 3
  - Más 10 cortes pollo, palta, queso crema en hotroll
  - Hosomaki con palta en vez de pimentón
  - 4 bolitas krispy
  - 6 salsas y palitos
- Tabla 5 · 88 piezas: $24.000, Hot +$1.500. Etiqueta "Para el grupo". Contenido:
  - 10 cortes pollo Majori, pimentón, queso crema en hotroll
  - 10 cortes camarón, cebollín, queso crema en hotroll
  - 10 cortes kanikama, cebollín, queso crema envuelto en nori
  - 10 cortes salmón, palta, queso crema envuelto en queso crema
  - 10 cortes pollo, palta, queso crema en hotroll
  - 10 cortes champiñón, aceituna, queso crema envuelto en palta
  - 10 cortes hosomaki, palta, queso crema en hotroll
  - 10 cortes hosomaki, pimentón, queso crema en hotroll
  - 8 bolitas krispy
  - 8 salsas y palitos

**Handrolls Panko** (grupo de categoría "Formato": Handroll +0 / Roll de 9 a 10 cortes +$300):
- Pollo, queso crema, palta: $3.800 (destacado)
- Pollo, queso crema, cebollín: $3.700
- Pollo, queso crema, pimentón: $3.700
- Pollo, queso crema, aceituna: $3.600
- Pollo, queso crema, champiñón: $3.600
- Salmón, queso crema, palta: $4.000
- Salmón, queso crema, cebollín: $3.900
- Camarón furay, queso crema, palta: $3.800
- Camarón furay, queso crema, cebollín: $3.700
- Kanikama, queso crema, palta: $3.600
- Kanikama, queso crema, cebollín: $3.400

**Handrolls Nori o Semilla** (grupos de categoría: "Envoltura" con Nori o Semilla, más el mismo "Formato"):
- Pollo, queso crema, palta: $3.200
- Pollo, queso crema, cebollín: $3.100
- Pollo, queso crema, pimentón: $3.200
- Pollo, queso crema, aceituna: $3.300
- Pollo, queso crema, champiñón: $3.300
- Salmón, queso crema, palta: $3.600
- Salmón, queso crema, cebollín: $3.500
- Camarón furay, queso crema, palta: $3.400
- Camarón furay, queso crema, cebollín: $3.300
- Kanikama, queso crema, palta: $2.900
- Kanikama, queso crema, cebollín: $2.800

**Rolls Avocado** (10 cortes envueltos en palta):
- Pollo, queso crema, cebollín: $5.000 (destacado)
- Pollo, queso crema, pimentón: $5.000
- Pollo, queso crema, palmito: $4.800
- Pollo, queso crema, champiñón: $4.600
- Pollo, queso crema, aceituna: $4.600
- Salmón, queso crema, palmito: $5.200
- Salmón, queso crema, cebollín: $5.200
- Salmón, queso crema: $5.000
- Camarón furay, queso crema, palmito: $5.100
- Camarón furay, queso crema, cebollín: $5.100
- Kanikama, queso crema, cebollín: $4.500
- Kanikama, queso crema, palta: $4.800

**Rolls Queso Crema** (10 cortes envueltos en queso crema):
- Pollo, cebollín, palta: $4.700
- Pollo, pimentón, palta: $4.600
- Pollo, cebollín, pimentón: $4.500
- Pollo, palmito, champiñón: $4.600
- Pollo, aceituna, champiñón: $4.700
- Salmón, palmito, cebollín: $5.000
- Salmón, palta, cebollín: $5.000
- Camarón furay, palta, cebollín: $4.800
- Camarón furay, palta: $4.600
- Kanikama, cebollín, palta: $4.700
- Kanikama, palta: $4.500

**Gohan** (bowl de arroz, todos llevan queso base):
- Gohan 1x3: $6.000 (destacado). Grupos: "Elige 1 proteína" (Pollo o Camarón), "Elige 3 vegetales" y "Extras" (opcional: Cambiar proteína por salmón +$500).
- Gohan 2x2: $6.500. Grupos: 2 proteínas, 2 vegetales y el mismo "Extras".
- Vegetales disponibles: Palta, Cebollín, Champiñón, Pimentón, Aceitunas, Palmito.

**Sushiburger** (todas llevan queso base):
- Sushiburger 1x3: $6.300 (destacado).
- Sushiburger 2x2: $6.800.
- Mismos grupos que el Gohan, con Choclo agregado a los vegetales y el mismo extra de salmón +$500.

**Sushipleto**:
- Sushipleto 1x2 + papas fritas: $4.500, con queso base. Etiqueta "Nuevo", destacado.
- Grupos: "Elige 1 proteína" (Pollo furay o Camarón furay), "Elige 2 vegetales" (Palta, Cebollín, Champiñón, Pimentón, Aceitunas) y el extra de salmón +$500.

**Handrolls Vegetales**. Los de nori o semilla llevan el grupo "Envoltura"; agregar el tipo entre paréntesis en el nombre.
- En nori o semilla:
  - Palta, queso crema, cebollín: $3.000
  - Palta, queso crema, pimentón: $2.800
  - Choclo, queso crema, palta: $3.000
  - Aceituna, champiñón, palmito: $2.800
  - Aceituna, queso crema, champiñón: $3.000
  - Palta, palmito, champiñón: $3.000
- Panko:
  - Palta, queso crema, cebollín: $3.600
  - Palta, queso crema, pimentón: $3.400
  - Choclo, queso crema, palta: $3.400
  - Aceituna, champiñón, palmito: $3.600
  - Aceituna, queso crema, champiñón: $3.600
  - Palta, palmito, champiñón: $3.300
- Envoltura palta:
  - Cebollín, queso crema: $4.000
  - Pimentón, queso crema: $4.000
  - Choclo, queso crema: $4.000
  - Aceituna, queso crema, champiñón: $4.400
  - Aceituna, champiñón, palmito: $4.400
  - Palmito, champiñón, queso crema: $4.400
- Envoltura en crema:
  - Palta, cebollín: $4.200
  - Palta, pimentón: $3.500
  - Choclo, palta: $3.500
  - Aceituna, champiñón: $3.700
  - Aceituna, champiñón, palmito: $3.900
  - Palta, palmito, champiñón: $3.900

**Fotos**: si no tienes las fotos del repositorio (`public/img/`), deja los productos sin imagen. Las tarjetas sin foto deben verse bien en formato compacto. Yo las subiré después desde la intranet.

### API
**Pública**
- `GET /api/content`: devuelve settings, más las categorías y productos visibles, ordenados.
- `POST /api/orders`:
  - **Recalcula precios en el servidor**: no confía en los precios que manda el navegador.
  - Valida mínimos y máximos de los grupos de opciones.
  - Rechaza productos agotados u ocultos.
  - Exige nombre, y dirección si es delivery.
  - Limita a 60 líneas y cantidades de 1 a 50.

**Autenticación**
- `POST /api/auth/login` y `POST /api/auth/logout`.
- `GET /api/auth/me`.
- `POST /api/auth/password`: pide la clave actual y la nueva, de mínimo 8 caracteres.

**Intranet** (todo requiere sesión)
- `GET /api/admin/data`.
- `PUT /api/admin/settings`.
- CRUD de `/api/admin/categories`. No se puede borrar una categoría que tenga productos.
- CRUD de `/api/admin/products`.
- `PATCH /api/admin/products/:id/availability`: también lo puede usar el rol personal.
- `POST /api/admin/reorder`: recibe `{type, ids}`.
- `POST /api/admin/upload`:
  - Recibe un dataURL base64 en formato png, jpeg, webp o gif, de máximo 5 MB.
  - Guarda el archivo con un nombre aleatorio.
- Pedidos:
  - `GET /api/admin/orders`: filtra con `?status=` y `?q=`.
  - `PATCH /api/admin/orders/:id`: cambia el estado o la nota interna.
  - `DELETE /api/admin/orders/:id`: solo administradores.
- `GET /api/admin/stats`: pedidos y total de hoy, pedidos en curso, cantidad de productos, agotados y los 5 más vendidos.
- Usuarios (solo administradores):
  - `GET` y `POST /api/admin/users`.
  - `DELETE /api/admin/users/:id`: no se puede borrar el propio usuario.
- `GET /api/admin/backup`: descarga JSON sin las claves de usuarios.
- `POST /api/admin/restore`: valida y limpia los datos, y mantiene los usuarios.

### Seguridad
- **Claves**: hash con `crypto.scrypt` y sal; comparación con `timingSafeEqual`.
- **Clave inicial**:
  - Usuario `admin`.
  - Clave desde `ADMIN_PASSWORD`. Si no existe, usar `majori2026` y marcar `mustChangePassword`.
- **Sesión**:
  - Token aleatorio de 32 bytes guardado en memoria, que dura 12 horas.
  - Cookie `HttpOnly; SameSite=Strict`, con `Secure` si llega por HTTPS.
- **Login**: después de 5 intentos fallidos, bloquear esa IP por 5 minutos.
- **Origen**: en peticiones que no son GET, rechazar las que traen un `Origin` distinto del host.
- **Validación**:
  - Limpiar y limitar el largo de todos los textos.
  - Las rutas de imagen solo pueden empezar con `/img/`, `/uploads/` o `https://`.
  - Los colores solo pueden ser `#rrggbb`.
  - Escapar todo el HTML en el frontend.
- **Cabeceras**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` y `Referrer-Policy`.
- **Roles**: `admin` puede editar todo. `staff` solo ve Resumen y Pedidos, y puede marcar productos como agotados.

### Intranet (`/admin`, con `noindex`)
- **Diseño**: claro y funcional, con barra lateral oscura y adaptado al celular.
- **Login**: con el logo. En el primer ingreso obliga a cambiar la clave.
- **Resumen**:
  - Tarjetas: pedidos hoy, vendido hoy, pedidos en curso, productos agotados y productos en la carta.
  - Últimos pedidos, lo más vendido y una guía corta de uso.
- **Pedidos**:
  - Tarjetas con borde de color según el estado.
  - Cada una muestra fecha, retiro o delivery con dirección, para cuándo, teléfono con link a WhatsApp del cliente (agregar 56 si el número tiene 9 dígitos), ítems con opciones, notas y un campo de nota interna.
  - Selector de estado: Nuevo, Pagado, Preparando, Listo, Entregado, Cancelado.
  - Filtro por estado y buscador.
  - Consulta cada 30 segundos, con sonido y aviso cuando llega un pedido nuevo, y un contador en el menú.
- **Carta y productos**:
  - A la izquierda, las categorías: subir, bajar, editar, crear, y un indicador de cuántos productos tiene cada una.
  - A la derecha, la tabla de productos: miniatura, nombre, etiquetas, precio, interruptor Visible, interruptor Disponible (agotado), subir/bajar, editar y duplicar.
  - Buscador de productos en toda la carta.
  - Editor de producto: nombre, categoría, precio, descripción, detalle (una línea por ítem), imagen (subir archivo o pegar URL, con vista previa), etiqueta, visible, disponible, destacado y editor de grupos de opciones (agregar o quitar grupos y opciones, con nombre, mínimo, máximo y precio extra).
  - Al subir una imagen, el navegador la reduce a un máximo de 1400 px antes de enviarla.
  - El editor de categoría tiene lo mismo, con sus propios grupos de opciones.
- **Información del local**: todos los campos de settings.
  - Selectores de color y logo.
  - Foto de portada.
  - Aviso superior.
  - Horario por día con opción de cerrado.
  - Retiro y delivery, y debe quedar activo al menos uno.
  - Aviso de pago y datos de transferencia.
  - Nosotros.
  - Botón "Guardar" fijo abajo.
- **Usuarios**: lista, crear (nombre, usuario, clave inicial y rol) y eliminar.
- **Respaldo**: descargar y restaurar el `.json`, con confirmación.

### Verificación antes de entregarme
Prueba en un navegador, idealmente con Playwright, en escritorio y en celular (iPhone):
1. Armar un Gohan 1x3: debe exigir 3 vegetales y sumar los $500 del salmón.
2. Agregar la Tabla 1 Hot: debe quedar en $10.500.
3. Enviar el pedido con delivery: se debe generar el pedido #1001 y el link de WhatsApp correcto.
4. En la intranet: cambiar la clave inicial, cambiar el estado del pedido, cambiar un precio, marcar un producto como agotado y editar el aviso.
5. Recargar la página pública y confirmar que se ven esos cambios.
6. Confirmar que en el celular no hay scroll horizontal y que no hay errores en la consola.
