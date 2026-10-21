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

1. **Catálogo:** buscar por nombre y filtrar por categoría; ambas opciones se combinan. Abrir un artículo. Los cuatro artículos iniciales tienen imágenes generadas identificadas como ilustrativas de demo. Las fotografías del personal se muestran cuando existen; si faltan o fallan, aparecen las iniciales. Las categorías se desplazan horizontalmente en pantallas pequeñas.
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

La ampliación añade una migración para el bucket y las políticas de Storage; las tablas del dominio se conservan. No publica la web ni despliega funciones Edge. El servidor Node sigue siendo el adaptador de prueba local.

## Dar de alta y editar productos

1. Iniciar sesión y pulsar **Nuevo producto** en el catálogo.
2. Capturar nombre, categoría y precio base en MXN. Marcar **Artículo sobre pedido** si corresponde: el público verá consulta de precio.
3. Registrar al menos una variante con existencia inicial entera no negativa. Usar **Única** si no hay talla. **Añadir variante** permite varias tallas; no se admiten nombres repetidos aunque cambien mayúsculas o espacios.
4. Opcionalmente elegir una fotografía del equipo. Se admiten JPEG, PNG y WebP de hasta **5 MiB**. La vista previa aparece antes de guardar; la carga se hace al pulsar **Crear producto**. Si falla, el formulario conserva sus datos para reintentar.
5. Guardar y revisar el detalle. Un artículo normal sin existencias permanece visible para el personal, pero no aparece en el catálogo público.
6. En el detalle, pulsar **Editar producto**. Cambiar la ficha o sustituir la imagen y pulsar **Guardar cambios**. Las variantes existentes se conservan.
7. En **Existencias por variante**, elegir **Añadir** o **Retirar**, indicar las unidades y pulsar **Aplicar ajuste**. Esta acción se guarda por separado de la ficha. El ajuste es atómico y no permite existencias negativas.

Modificar un precio no recalcula carritos ya capturados ni cambia los importes de pedidos históricos. La solicitud pública sí obtiene el precio actual al preparar su vista previa. Esta etapa no incorpora eliminación de productos o variantes.

## Consultar pedidos anteriores

En el acceso del personal, abrir **Pedidos** en la cabecera. La lista muestra número, cliente, fecha, estado y total, del más reciente al más antiguo. **Anterior** y **Siguiente** recorren páginas de 20 registros. Abrir un pedido recupera su detalle persistido; **Volver a pedidos** regresa a la lista. No se modifican estados desde esta pantalla.

## Imágenes de demostración

Las camisas y la gorra iniciales usan tres imágenes creadas con imagegen; los dos registros duplicados de Camisa comparten imagen. Sus originales, versiones WebP y prompts están en `assets/productos-demo/`. Las imágenes optimizadas pesan aproximadamente 40–90 kB cada una y se sirven desde Supabase Storage.

`npm run demo:imagenes` realiza la carga para los cuatro artículos verificados del proyecto GaboStore. Requiere la clave privada de servidor en `.env`, conserva toda fotografía ya asignada y no modifica precios ni existencias. Repetirlo no sustituye las fotografías que haya añadido el personal. La etiqueta **Imagen ilustrativa** corresponde a las imágenes de la carpeta de demo de Storage.

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
npm run verificar:catalogo
```

Las pruebas locales verifican PostgreSQL con PGlite, repositorios, reglas de negocio, permisos HTTP, políticas de Storage y solicitud pública. Cubren alta/edición, variantes repetidas, stock negativo, formato/tamaño de imágenes, paginación, acumulación, correo, cambios de disponibilidad, precios ocultos y configuración de WhatsApp. No se conectan al proyecto remoto. El esquema Storage mínimo de PGlite permite probar las políticas SQL; no reemplaza la prueba de carga de archivos real.

`verificar:flujo` autentica al personal y recorre HTTP → negocio → datos → Supabase real. Usa un puerto temporal y deja registros `DEMO FLUJO`. Comprueba precios del servidor, detalle completo, autor, reintento sin duplicados y conservación de existencias. Requiere dos artículos normales con al menos dos unidades disponibles.

En la revisión del 20 de octubre de 2026, el recorrido público conservó los mismos conteos de las cinco tablas de clientes, carritos y pedidos antes y después de preparar la vista previa. La prueba del personal guardó y recuperó el pedido **7**, carrito **10**, con dos líneas y total **$538.80**. Estos IDs pertenecen a esa ejecución. Se revisó el catálogo a 360, 390, 768, 1024 y 1440 px, además de detalle, carrito, mensaje y confirmación del personal en móvil y escritorio.

`verificar:catalogo` autentica a un empleado real y prueba carga de fotografía, rechazo de carga anónima, alta, edición, ajustes y conservación de un pedido anterior. Deja un artículo identificado como **DEMO CATALOGO**, con existencia final cero, para no incorporarlo al catálogo público. Cada ejecución conserva su registro y su imagen de prueba.

Verificación de la ampliación del **21 de octubre de 2026**: 51 pruebas locales correctas. La prueba HTTP real creó el artículo **6**, con imagen y precio editado a **$60.25**; terminó con cero existencias. La prueba desde el navegador creó el artículo **7** con dos variantes, sustituyó su fotografía y conservó el precio editado de **$81.25** tras recargar; sus existencias también terminaron en cero. La regresión de pedidos guardó el pedido **10**, carrito **13**, con dos líneas y total **$538.80**. Después, generar una solicitud pública conservó los mismos conteos de clientes, carritos y pedidos. Son IDs de estas ejecuciones, no valores que deban introducirse manualmente.

El flujo básico no incluye pagos, apartados, ventas, devoluciones, gestión de envíos, reportes, eliminación de artículos o administración de cuentas desde la web. La confirmación del proveedor es manual; no existe una consulta automática al proveedor.
