# Guía del flujo básico

## Iniciar la web

Requiere Node.js 22.12 o posterior. En la carpeta existente:

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
$env:PORT='3001'
npm run dev
```

Abrir http://127.0.0.1:3001. Se usa 3001 en esta demostración porque 3000 estaba ocupado. Sin `PORT`, el valor predeterminado es 3000. La API escucha únicamente en el equipo local. `dev` compila y arranca; después de editar código, detener con Ctrl+C y ejecutar de nuevo. `npm start` reutiliza la compilación existente.

## Demostración pública: catálogo → detalle → carrito → mensaje

1. **Catálogo:** buscar por nombre y filtrar por categoría; ambas opciones se combinan. Abrir un artículo. Se muestran los datos reales existentes, sin inventar fotografías o descripciones. Si no hay fotografía, aparecen sus iniciales. Las categorías se desplazan horizontalmente en pantallas pequeñas.
2. **Detalle:** seleccionar una variante disponible y una cantidad entera positiva. Las variantes normales agotadas están deshabilitadas. Pulsar **Agregar al carrito**. Añadir otra vez la misma variante acumula cantidades, respetando las existencias. Los artículos sobre pedido ocultan el precio público y requieren consulta de disponibilidad.
3. **Mi pedido:** abrir el icono de carrito. Cambiar cantidades, quitar líneas y capturar un correo válido. Recargar la pestaña: la selección y el correo se conservan en `sessionStorage`. El correo es de contacto y no crea una cuenta. El envío aparece como **A confirmar**.
4. **Mensaje listo:** pulsar **Generar mensaje de WhatsApp**. Antes de preparar el texto, la web vuelve a consultar precios y disponibilidad. Si una selección dejó de estar disponible, se conserva y se pide corregirla. Revisar artículos, variantes, cantidades, importes y correo. Para artículos sobre pedido, el precio queda por confirmar y el total se identifica como parcial.

El recorrido público solo consulta el catálogo. No crea clientes, carritos ni pedidos en Supabase. La solicitud local tampoco se convierte automáticamente en un pedido al iniciar sesión como empleado. Se conserva en la pestaña mientras esté abierta; no se promete sincronización entre dispositivos ni recuperación después de cerrarla.

**Mensaje listo** significa que existe una vista previa: el mensaje todavía no se ha enviado y el pedido no está registrado. **Abrir WhatsApp** abre el chat con texto precargado; la persona debe pulsar Enviar dentro de WhatsApp. El personal confirma la solicitud y registra el pedido real mediante su acceso.

### Configurar WhatsApp después

En `.env`, configurar `GABOSTORE_WHATSAPP` con el número comercial internacional de GaboStore, solo dígitos, sin espacios ni guiones. No usar un número ficticio para la demostración. Reiniciar el servidor después de cambiarlo.

Mientras falte un número válido, la vista previa funciona y **Abrir WhatsApp** permanece deshabilitado. `GET /api/config` entrega `whatsappNumero` normalizado o `null`, junto con la URL y clave pública ya utilizadas. No entrega claves secretas ni credenciales del personal. El enlace utiliza el formato oficial `https://wa.me/NUMERO?text=TEXTO_CODIFICADO`.

## Demostración del personal: registrar el pedido real

1. Entrar en **Personal**. Usar el correo y la contraseña de `.env.personal.local`. Es una cuenta EMPLEADO de demostración.
2. Pulsar **Nuevo pedido**, capturar nombre, teléfono y correo y continuar a los artículos. Son datos de contacto, no una cuenta de cliente.
3. En el detalle, seleccionar una variante y una cantidad. Añadir al carrito del personal. Este carrito está separado de la solicitud pública.
4. Cambiar cantidades o quitar líneas. El servidor valida disponibilidad y conserva el precio capturado. Pulsar **Revisar pedido**.
5. Comprobar cliente, variantes, cantidades y total. Para artículos sobre pedido, confirmar manualmente que ya se consultó su disponibilidad con el proveedor. Pulsar **Registrar pedido pendiente**.
6. Anotar el número del pedido. Recargar la confirmación recupera el registro real. **Preparar otro pedido** obtiene un carrito nuevo.
7. En Supabase, buscar ese ID en `pedidos` y como `pedido_id` en `items_pedido`. Verificar cantidades, precios y subtotales. `creado_por` guarda el UID del empleado autenticado.

Un pedido pendiente no representa una venta pagada, no reserva unidades y no descuenta existencias.

## Capas

Para el personal: `web/` → API HTTP → `src/negocio/` → `src/repositories/` → Supabase.

- React recoge datos y muestra resultados; el servidor decide precios y autorización.
- `ControlCatalogo` distingue la consulta pública de la interna.
- `ControlCarrito` valida contacto, asociación de variante, cantidades y disponibilidad.
- `ControlGeneracionPedido` vuelve a validar y construye un `PedidoNuevo` completo.
- `PedidoRepository.guardar` persiste cabecera y detalles en una transacción. Reintentar el mismo carrito recupera el pedido sin duplicarlo.
- El adaptador HTTP valida el JWT con Supabase Auth y exige ADMIN o EMPLEADO desde `app_metadata`. Cada petición usa un cliente con el token de su usuario.

Para el público, `SolicitudConsulta` contiene únicamente selección y correo. Sus funciones calculan la vista previa con datos públicos actuales; `useSolicitudConsulta` mantiene el estado local. Ninguna de estas acciones llama a las operaciones de escritura del personal.

Esta entrega no cambia el esquema ni requiere migraciones SQL. No publica la web ni despliega funciones Edge. El servidor Node sigue siendo el adaptador de prueba local.

## Preparar otra copia

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env` y configurar URL y clave pública de Supabase.
3. Configurar WhatsApp cuando se tenga el número comercial; es opcional para probar la vista previa.
4. Usar una cuenta de personal existente con rol en `app_metadata`.
5. Para una cuenta ficticia nueva, configurar la clave secreta exclusivamente en terminal/backend y ejecutar `npm run preparar:personal`. Crea una cuenta EMPLEADO, genera una contraseña y guarda el acceso en `.env.personal.local`, sin enviar correo. Se puede elegir el correo con `GABOSTORE_PERSONAL_EMAIL`.
6. El script conserva cuentas existentes: si el correo ya está registrado y no se tiene el archivo de acceso, usar credenciales existentes o elegir otro correo. No restablece contraseñas.
7. Ejecutar `npm run dev` con el puerto deseado.

`.env` y `.env.personal.local` están ignorados por Git. Las claves secretas y contraseñas no forman parte del bundle de React.

## Verificar

```powershell
npm run typecheck
npm test
npm run build
npm run build:web
npm run verificar:flujo
```

Las 43 pruebas locales verifican PostgreSQL con PGlite, repositorios, reglas de negocio, permisos HTTP y solicitud pública: acumulación, cantidades, correo, cambios de disponibilidad, precios ocultos y configuración de WhatsApp ausente, inválida y válida. No se conectan al proyecto remoto.

`verificar:flujo` autentica al personal y recorre HTTP → negocio → datos → Supabase real. Usa un puerto temporal y deja registros `DEMO FLUJO`. Comprueba precios del servidor, detalle completo, autor, reintento sin duplicados y conservación de existencias. Requiere dos artículos normales con al menos dos unidades disponibles.

En la revisión del 20 de octubre de 2026, el recorrido público conservó los mismos conteos de las cinco tablas de clientes, carritos y pedidos antes y después de preparar la vista previa. La prueba del personal guardó y recuperó el pedido **7**, carrito **10**, con dos líneas y total **$538.80**. Estos IDs pertenecen a esa ejecución. Se revisó el catálogo a 360, 390, 768, 1024 y 1440 px, además de detalle, carrito, mensaje y confirmación del personal en móvil y escritorio.

El flujo básico no incluye pagos, apartados, ventas, devoluciones, gestión de envíos, reportes, edición del catálogo ni administración de cuentas desde la web. La confirmación del proveedor es manual; no existe una consulta automática al proveedor.
