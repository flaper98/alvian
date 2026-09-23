# Alvian Perfumes

Sitio web de catálogo de perfumes con compra por WhatsApp y un panel de
administración privado (`/admin`) con dos roles de acceso. Hecho con
Next.js, pensado para desplegarse en Vercel.

- **Catálogo público (`/`)**: responsive, sin ningún enlace ni botón hacia el
  panel de admin. Cada perfume tiene un botón "Comprar por WhatsApp" que abre
  un chat a **994379917** con un mensaje ya redactado mencionando ese
  perfume. También hay un botón flotante de WhatsApp para consultas generales.
- **Panel privado (`/admin`)**: pide una clave antes de mostrar nada, con menú
  hamburguesa para navegar entre secciones. Hay dos roles, cada uno con su
  propia clave:
  - **Administrador** (`ADMIN_PASSWORD`): acceso completo — Catálogo (alta,
    edición y baja de perfumes con imagen y stock), Compras (reponer stock),
    Ventas, Crédito/Pandero, Comisiones (asignar montos y marcarlas pagadas) y
    el Resumen del negocio.
  - **Vendedora** (`SELLER_PASSWORD`, opcional): puede registrar Ventas,
    registrar abonos en Crédito/Pandero, y ver sus propias Comisiones y su
    Resumen — sin acceso a Catálogo ni Compras.

  Todo se guarda en una base de datos Postgres, así que los cambios se ven al
  instante para todos, desde cualquier dispositivo.

## Tienda online (carrito + checkout) — novedades

Inspirado en la web del dispensador (Exótico), pero sobre Next.js + Postgres para
que funcione en Vercel:

- **Carrito** lateral con contador en el menú, cantidades y barra de "envío gratis".
- **Checkout** en `/checkout`: datos, envío (Delivery Pucallpa / provincia / recojo),
  pago con **Yape/Plin** (número, QR y botón copiar), **transferencia** o
  **contra entrega** (solo envíos locales), subida opcional del comprobante.
  El servidor recalcula precios, stock y envío: nunca confía en el navegador.
- **Confirmación** `/pedido/ALV-xxxxx` con botón "Enviar mi pedido por WhatsApp"
  (mensaje con el detalle ya redactado) y **seguimiento** en `/seguimiento`
  (código + celular) con línea de tiempo del estado.
- **Portada premium**: barra de anuncio, hero, "Los más pedidos" (perfumes marcados
  como destacados), cómo comprar, beneficios, opiniones, garantías, FAQ y CTA final.
- **Ficha de producto**: precio tachado/ahorro, notas olfativas, cantidad, "Agregar"
  y "Comprar ahora", barra fija de compra en móvil, acordeones de envíos y pagos.
- **Libro de Reclamaciones** virtual (`/reclamaciones`), **Términos** y **Privacidad**.

### En el panel

- **Pedidos web** (`/admin/pedidos-web`): filtros por estado, comprobante, datos
  del cliente, WhatsApp con mensaje según el estado, código de seguimiento y
  **Registrar como venta** (descuenta stock y entra al Resumen). El menú muestra
  cuántos pedidos nuevos hay.
- **Tienda online** (`/admin/tienda`): barra de anuncio, Yape/Plin (número, titular,
  QR), transferencia, contra entrega, exigir comprobante, opciones y precios de
  envío, envío gratis desde S/ X, datos del negocio (RUC), FAQ y opiniones.
- **Reclamos** (`/admin/reclamos`): hojas recibidas y registro de la respuesta.
- En **Catálogo** cada perfume tiene ahora: precio anterior (tachado), notas
  olfativas y "Destacar en la portada".

Las tablas nuevas (`web_orders`, `web_order_items`, `faqs`, `testimonials`,
`complaints`) y columnas nuevas se crean solas la primera vez que el sitio se
conecta a la base: no hay que correr migraciones.

### Después de desplegar

1. Verifica que el Blob esté conectado (lo usan el comprobante de pago y el QR).
2. Opcional: agrega `NEXT_PUBLIC_SITE_URL` (ej. `https://alvianfragancias.com`).
3. Entra a `/admin/tienda`, revisa número Yape, titular, sube tu QR y completa
   razón social / RUC y correo para el Libro de Reclamaciones.
4. En Catálogo marca 3–4 perfumes como "Destacar en la portada".

## Antes de desplegar: crea el proyecto en Vercel

1. Sube esta carpeta a un repositorio de GitHub (o usa `vercel` CLI para
   desplegar directo desde tu computadora con `vercel`).
2. En [vercel.com](https://vercel.com) crea un nuevo proyecto a partir de ese
   repositorio.
3. Entra al proyecto → pestaña **Storage** → **Create Database** → elige
   **Postgres** (Neon) → conéctala al proyecto. Esto agrega automáticamente
   la variable `DATABASE_URL`.
4. En la misma pestaña **Storage** → **Create Database** → elige **Blob** →
   conéctalo al proyecto. Esto agrega automáticamente la variable
   `BLOB_READ_WRITE_TOKEN`.
5. Ve a **Settings → Environment Variables** y agrega:
   - `ADMIN_PASSWORD` → tu clave, con acceso completo al panel.
   - `SELLER_PASSWORD` → la clave de la vendedora, con acceso limitado (opcional).
   - `SESSION_SECRET` → una cadena larga y aleatoria (por ejemplo, generada
     con `openssl rand -hex 32`).
6. Vuelve a desplegar el proyecto (**Deployments → Redeploy**) para que tome
   las variables nuevas.
7. Abre `https://tu-proyecto.vercel.app/admin`, ingresa tu clave y agrega tus
   perfumes.

Sin los pasos 3 y 4 (base de datos y blob conectados) el sitio no podrá
guardar perfumes ni imágenes.

## Cambiar el número de WhatsApp

Está en [`lib/whatsapp.js`](lib/whatsapp.js). Se asumió el prefijo de Perú
(`51`) delante de `994379917`. Si el número es de otro país, cambia el
prefijo por el que corresponda.

## Probar en tu computadora (opcional)

Necesitas [Node.js](https://nodejs.org) 18 o superior instalado.

```bash
npm install
vercel link          # conecta esta carpeta con tu proyecto de Vercel
vercel env pull .env.local   # trae las variables ya configuradas en Vercel
npm run dev
```

Abre `http://localhost:3000` para el catálogo y `http://localhost:3000/admin`
para el panel.
