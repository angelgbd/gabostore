# Guía del flujo básico

## Iniciar la web

Requiere Node.js 22.12 o posterior. En PowerShell:

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
$env:PORT='3001'
npm run dev
```

Abrir http://127.0.0.1:3001. La API escucha únicamente en el equipo local. `dev` compila y arranca; después de editar código, detener con Ctrl+C y ejecutarlo otra vez. `npm start` reutiliza la compilación web existente.

## Cliente: catálogo → carrito → vista previa → registro

1. Consultar el catálogo, combinar búsqueda y categoría y abrir un artículo. Las tres imágenes generadas para los cuatro artículos semilla llevan **Imagen ilustrativa**; las fotos reales del personal no llevan esa etiqueta. Si una foto falla, aparecen iniciales.
2. Seleccionar una variante disponible y una cantidad entera positiva. **Agregar al carrito** acumula la misma variante. Las variantes normales agotadas están deshabilitadas.
3. Abrir **Mi pedido**, cambiar cantidades o quitar líneas. No se pide nombre, teléfono ni correo. La selección se conserva al recargar la misma pestaña. El envío aparece como **A confirmar**.
4. Pulsar **Generar mensaje de WhatsApp**. La web actualiza precios y disponibilidad. Si algo cambió, conserva la selección y pide corregirla. Esta vista previa no escribe en la base de datos.
5. Con WhatsApp configurado, pulsar **Registrar pedido y abrir WhatsApp**. El backend guarda un pedido PENDIENTE completo, obtiene precios del servidor y devuelve su número. Después se abre el mensaje con ese número. La persona debe enviarlo manualmente dentro de WhatsApp.
6. El personal tendrá **120 horas desde el registro** para confirmar el pedido. No representa un pago, reserva ni descuento de existencias. Abrir WhatsApp no demuestra que se haya enviado el mensaje.

El mismo contenido y clave de solicitud recuperan el mismo pedido al reintentar o recargar. Si falla el guardado, no se abre WhatsApp y la selección se conserva. Si el navegador bloquea la apertura después de guardar, se muestra el número y **Abrir mensaje guardado**. Editar artículos o cantidades prepara una solicitud nueva y no modifica el pedido anterior. Después del vencimiento, **Preparar nuevo pedido** conserva la selección y genera otra clave.

Los artículos sobre pedido mantienen el precio público oculto y el total parcial. Pueden registrarse como pendientes; la confirmación posterior exige la disponibilidad del proveedor. No hay consulta automática al proveedor.

### Configurar WhatsApp después

En `.env`, establecer `GABOSTORE_WHATSAPP` con el número comercial internacional de GaboStore, solo dígitos, sin espacios ni guiones. Reiniciar el servidor. No se ha configurado un número comercial ficticio.

El backend también necesita `SUPABASE_SECRET_KEY` para la operación limitada de registro público. Nunca se entrega al navegador ni se sube a Git. Si falta la configuración del registro, la API devuelve un error y no guarda pedidos. Sin número válido, la vista previa funciona y el botón de registro permanece deshabilitado.

`GET /api/config` conserva únicamente URL, clave pública y destino WhatsApp. La API de registro acepta solo clave de solicitud, variantes y cantidades; rechaza precios, datos de cliente o estado enviados por el navegador. Limita a diez intentos por minuto por dirección en el servidor local. No permite consultar pedidos privados por su número sin una sesión del personal.

## Personal: registrar y confirmar pedidos

1. Entrar en **Personal** con el correo y contraseña de `.env.personal.local`. El correo de acceso sigue vigente.
2. **Nuevo pedido** solicita nombre y teléfono del cliente, sin correo. Es información de contacto, no una cuenta.
3. Añadir variantes al carrito interno, cambiar cantidades y revisar el total. El servidor valida disponibilidad y conserva el precio capturado. El carrito está separado de la selección pública.
4. **Revisar pedido** muestra artículos y cliente. Si hay artículos sobre pedido, confirmar manualmente la consulta al proveedor y pulsar **Registrar pedido pendiente**.
5. Abrir **Pedidos** para consultar páginas de 20 registros, del más reciente al más antiguo. Los pedidos públicos sin cliente aparecen como **Pedido web**.
6. Abrir un pedido pendiente y pulsar **Confirmar pedido**. El servidor vuelve a validar stock, plazo y confirmaciones del proveedor en una transacción. El resultado es CONFIRMADO, sin cambiar sus precios ni cantidades y sin descontar existencias.

Los pedidos públicos muestran su plazo. Después de las 120 horas ya no pueden confirmarse aunque la limpieza todavía no los haya quitado. Los pedidos existentes antes de esta entrega y todos los registrados por el personal no caducan automáticamente. No se añadieron operaciones para otros cambios de estado.

## Limpieza automática en Supabase

Las migraciones activan `pg_cron` y programan `gabostore-limpiar-pendientes-publicos` cada minuto. La función privada elimina físicamente solo pedidos con origen PUBLICO, estado PENDIENTE y plazo vencido, junto con sus detalles y carrito. Procesa hasta 500 por ejecución; los bloqueados pasan a una ejecución posterior.

Cron funciona con la aplicación local cerrada, siempre que el proyecto Supabase esté activo. Confirmación y limpieza bloquean la misma fila para evitar carreras. Las sesiones públicas, empleados y claves de servicio no pueden invocar la limpieza; tampoco se habilitaron borrados generales del historial.

Se pueden revisar ejecuciones en **Integrations → Cron** de Supabase. Los confirmados, productos, variantes, clientes y el historial anterior permanecen. Las columnas de correo antiguas siguen opcionales para conservar sus valores históricos; los contratos nuevos no las capturan ni las muestran.

## Alta y edición de productos

En el catálogo del personal, **Nuevo producto** permite capturar nombre, categoría, precio base, opción sobre pedido y al menos una variante con existencia inicial entera no negativa. Utilizar **Única** si no hay talla; las tallas no pueden repetirse aunque cambien mayúsculas o espacios exteriores.

La fotografía es opcional: JPEG, PNG o WebP de hasta **5 MiB**. Se previsualiza y se carga al guardar. Si falla, se conservan los datos para reintentar. La imagen se guarda en el bucket público `catalogo`, con carga exclusiva del personal y un archivo nuevo por sustitución.

En el detalle, **Editar producto** actualiza la ficha y fotografía. **Existencias por variante** permite Añadir o Retirar unidades con **Aplicar ajuste**. Cada ajuste se guarda por separado y de forma atómica, sin permitir saldo negativo. Se conservan variantes e importes históricos; no hay eliminación de productos o variantes.

`npm run demo:imagenes` conserva las fotografías ya asignadas y no cambia stock o precios. Sus originales, WebP y prompts están en `assets/productos-demo/`.

## Pruebas

```powershell
npm run typecheck
npm test
npm run build
npm run build:web
npm run verificar:whatsapp
```

Las pruebas locales cubren datos, negocio, API, permisos, correo retirado, idempotencia, precios, stock, proveedor y vencimiento. PGlite aplica las migraciones de tablas, funciones y Storage; no tiene el proceso `pg_cron`, por lo que la programación y sus ejecuciones se verifican además en Supabase real.

`verificar:whatsapp` requiere `.env` y `.env.personal.local`. Inicia un servidor temporal, registra un pedido público real de un artículo disponible, reintenta sin duplicarlo y realiza dos confirmaciones concurrentes con una sesión EMPLEADO. Deja ese pedido confirmado de demostración y verifica que el stock no cambió. Utiliza un destino sintáctico únicamente dentro de esa prueba; no configura el número comercial, no abre WhatsApp y no envía mensajes.

También siguen disponibles `verificar:flujo`, `verificar:catalogo` y `verificar:conexion`. Cada prueba remota conserva sus registros de demostración, salvo los públicos pendientes que venzan.

Verificación del **26 de octubre de 2026**: el pedido público **12** se registró sin contacto, se recuperó en los reintentos y se confirmó sin modificar stock o importes. Un pedido de prueba vencido, **13**, y su carrito **16** fueron eliminados por Cron; el pedido confirmado y los diez pedidos anteriores del personal permanecieron. La regresión del personal guardó el pedido **15**, carrito **18**, sin correo, con dos líneas y total **$499.00**, manteniendo autor e inventario. Estos números corresponden a esas ejecuciones, no deben introducirse manualmente.

La entrega conserva React, TypeScript y Supabase con presentación → API → negocio → repositorios. La identidad utiliza rojo coral y marca roja clara sobre el fondo oscuro. No incluye hosting, pagos, reservas, tarifas de envío, cuentas de clientes ni estados administrativos adicionales.
