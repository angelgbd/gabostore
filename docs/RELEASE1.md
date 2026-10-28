# Release 1 de GaboStore

Esta entrega incorpora CU-01, CU-02, CU-03, CU-04, CU-05, CU-06, CU-08 y CU-10. La aplicación sigue siendo local, en React/TypeScript y Supabase. El flujo público de pedidos por WhatsApp conserva las decisiones posteriores al documento de visión: sin contacto, registro pendiente al abrir WhatsApp, confirmación del personal y vencimiento de 120 horas.

## Acceso y roles

Iniciar con `$env:PORT='3001'; npm run dev` y abrir http://127.0.0.1:3001. **Personal** permite iniciar sesión. La cuenta EMPLEADO está en `.env.personal.local`; la cuenta ADMIN de prueba separada, autorizada por el usuario, está en `.env.admin.local`. Ambos archivos son privados e ignorados por Git. `npm run preparar:admin` prepara el ADMIN de demostración una sola vez, sin modificar cuentas existentes ni enviar correos.

ADMIN administra usuarios, categorías y proveedores. ADMIN y EMPLEADO consultan estos datos cuando los necesitan para operar, mantienen artículos y variantes, registran compras/ventas y conservan el flujo previo de pedidos. El backend verifica la sesión con Supabase; PostgreSQL consulta el rol y estado actuales de la cuenta. Una cuenta desactivada no puede operar ni usar un JWT anterior para acceder a las tablas privadas.

## CU-02 · Usuarios

En **Gestión → Usuarios**, capturar nombre, correo de acceso, contraseña inicial y rol. La contraseña debe tener entre 12 y 128 caracteres, mayúsculas, minúsculas y números. El correo es una credencial del personal, no un dato de contacto del comprador. Las cuentas se crean sin enviar mensajes; el administrador comparte las credenciales de forma privada.

**Editar** permite cambiar nombre, rol y estado activo. Desactivar conserva la cuenta y el historial. El administrador no puede desactivarse ni quitarse su propio rol; también se protege la permanencia de un ADMIN activo. No se cambian contraseñas ni correos existentes desde este formulario.

## CU-03 · Categorías

En **Gestión → Categorías**, registrar nombre y descripción. Se rechazan nombres vacíos o duplicados aunque cambien mayúsculas o espacios exteriores. **Editar** permite renombrar, desactivar y reactivar. El cambio de nombre se refleja en los artículos vinculados; la baja oculta sus artículos del catálogo público sin borrar inventario ni operaciones históricas. Las categorías previas se migraron a registros relacionados conservando los artículos.

## CU-04 · Artículos y variantes

**Nuevo producto** y **Editar producto** conservan ficha, fotografía, precio base, opción sobre pedido y existencias. La categoría se selecciona del catálogo registrado. Desmarcar **Artículo activo** aplica una baja lógica; volver a marcarlo reactiva el artículo. Los agotados se conservan.

En **Administrar variantes**, añadir tallas o medidas, modificar su nombre, recargo y estado. Las tallas no pueden repetirse dentro de un artículo, incluyendo diferencias solo de mayúsculas/espacios. Una variante nueva comienza en cero; se abastece mediante una compra o un ajuste autorizado. El precio vigente de la variante es precio base más recargo. Las bajas conservan cantidades y vínculos con pedidos, compras y ventas anteriores. El sistema registra los cambios de precio desde esta migración; no inventa cambios anteriores.

## CU-05 · Proveedores

En **Gestión → Proveedores**, capturar nombre, persona de contacto, teléfono y dirección. Nombre y teléfono son obligatorios. Se pueden consultar, editar, dar de baja y reactivar. La baja evita nuevas compras a ese proveedor y conserva su abastecimiento anterior. WhatsApp continúa siendo un canal externo; este módulo no envía mensajes.

## CU-06 · Registrar compra

En **Gestión → Compras**, elegir un proveedor activo, fecha de recepción y referencia opcional. Agregar variantes, cantidades enteras positivas y costos unitarios no negativos con dos decimales. Cada compra corresponde a un solo proveedor. Para mercancía nueva, marcar **Registrar artículo nuevo en esta compra** y completar nombre, categoría, precio base de venta y talla/medida; se crea junto con el lote dentro de la misma transacción.

Pulsar **Revisar compra**, comprobar el resumen y **Registrar compra y sumar existencias**. El comprobante muestra número de compra/lote, proveedor, fecha, detalle y total. Un error revierte todas las filas y cantidades. El borrador y la clave se conservan en la pestaña; reintentar no suma dos veces. El comprobante registrado se recupera al recargar. La lista inferior permite volver a consultar los registros. Este comprobante no sustituye el reporte de lotes del Release 2.

## CU-08 · Catálogo público

El catálogo público conserva búsqueda, categorías, fotografías, detalle y variantes. Solo muestra artículos y categorías activos con alguna variante activa disponible. Las variantes activas agotadas permanecen diferenciadas; las dadas de baja dejan de ofrecerse. Elegir una variante actualiza el precio con su recargo. Los artículos sobre pedido mantienen el precio público oculto, incluso en la proyección SQL pública.

## CU-10 · Registrar venta

En **Gestión → Ventas**, elegir artículos y cantidades, registrar el método e importe pagado y confirmar que se recibió el pago completo. **Revisar venta** muestra detalle e importes antes de **Registrar venta y descontar existencias**. El precio de la venta directa se obtiene del catálogo del servidor, incluido el recargo. Los artículos sobre pedido requieren confirmar disponibilidad del proveedor y contar con existencias físicas para la salida.

También se puede abrir un pedido CONFIRMADO y elegir **Registrar venta de este pedido**. Se conservan sus cantidades y precios, aunque cambie el catálogo. Solo puede existir una venta por pedido. Un pedido pendiente debe confirmarse primero.

La venta exige que el importe pagado coincida exactamente con el total calculado. Un pago incompleto, cambio de precio o insuficiencia de stock se rechaza sin descontar cantidades. Registro y salida de inventario son atómicos; dos ventas concurrentes no pueden consumir las mismas unidades. Los reintentos recuperan la misma venta y el comprobante sobrevive a una recarga. El historial es inmutable y las ventas concretadas no se cancelan. El sistema registra un pago recibido y confirmado manualmente; no cobra tarjetas, verifica transferencias bancarias ni procesa reembolsos.

## Pruebas y datos de demostración

```powershell
npm run typecheck
npm test
npm run build
npm run build:web
npm run verificar:release1
```

`verificar:release1` requiere las tres configuraciones privadas y crea únicamente registros identificados como DEMO: cuenta de empleado, categoría, proveedor, artículos, compras, pedido y ventas. Comprueba roles, baja de cuenta, categorías, variantes duplicadas, recargos, compra con artículo nuevo, idempotencia, pago insuficiente, venta desde pedido y dos ventas concurrentes sobre el mismo inventario. Compara los importes de los pedidos previos. Al terminar da de baja sus artículos, categoría, proveedor y cuenta; las operaciones históricas se conservan. No envía WhatsApp ni procesa dinero.

Los datos nuevos usan migraciones reproducibles. Las pruebas locales aplican todas salvo la programación de Cron, que se verifica en Supabase real. Las tablas de negocio siguen privadas, los secretos se quedan en el backend y la auditoría es privada sin interfaz de consulta. El aviso previo de Supabase sobre protección de contraseñas filtradas desactivada sigue dependiendo de la configuración de Auth.

La validación de esta entrega pasó 77 pruebas, TypeScript y ambas compilaciones. En Supabase real se comprobó la persistencia con ADMIN y EMPLEADO, la conservación de precios anteriores, los reintentos y dos ventas simultáneas sobre el mismo stock. Desde la interfaz también se registraron la compra DEMO #5 y la venta DEMO #7, se rechazó un pago incompleto y se recuperaron sus comprobantes al recargar. Sus datos maestros quedaron desactivados; los comprobantes se conservan para consulta.

La revisión visual incluyó formularios y comprobantes en móvil y escritorio: 360, 390, 768, 1024 y 1440 px, además del ancho de 614 px de la ventana del usuario. Se comprobó que el documento no desborde horizontalmente y que el foco de teclado sea visible. Los módulos privados se cargan aparte del catálogo público. Esta ampliación conserva los colores, tipografía, componentes y fotografías del sistema de diseño existente.

Al editar, consultar un comprobante o guardar, el foco y la vista se trasladan al contenido actualizado; los errores se enfocan conservando el formulario. La revisión de compra muestra cada artículo/variante, cantidad, costo y subtotal. El aviso de variante guardada permanece después de cambiar talla, recargo o estado.

## Fuera de esta entrega

Los reportes específicos de existencias/lotes, apartados, anticipos, devolución, logística y gestión completa de pedidos corresponden al Release 2. Se conserva la funcionalidad de pedidos ya desarrollada, sin añadir esos procesos. No hay publicación en hosting ni pasarela de pagos.
