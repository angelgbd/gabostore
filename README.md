# GaboStore: datos, negocio y presentación

Implementación con **Supabase/PostgreSQL, TypeScript y React**. Conserva los tres repositorios del diagrama lógico y añade sus controles de negocio y las cuatro pantallas del flujo básico.

## Qué está implementado

- Artículos con variantes, fotografía en Supabase Storage, precio base y marca `sobrePedido`.
- Alta y edición básica para ADMIN/EMPLEADO; ajustes atómicos de existencias por variante.
- Consulta del historial de pedidos en páginas de 20 registros, con acceso a su detalle.
- Nombre y teléfono capturados por el personal; el flujo público utiliza solo el número de pedido. No se crean cuentas de clientes.
- Un carrito abierto por cliente y carritos anteriores conservados como historial.
- Un pedido por carrito, con copia independiente de cantidades y precios. Los públicos se registran al abrir WhatsApp, sin datos de contacto y con plazo de 120 horas.
- `PedidoRepository.guardar(pedido)`: recibe un objeto con toda la cabecera y las líneas; persiste el conjunto de manera atómica.
- Estados de la última imagen: `PENDIENTE`, `ENVIADO`, `ENTREGADO`, `CANCELADO` y `CONFIRMADO`.
- Catálogo público con búsqueda y categorías: oculta artículos completamente agotados y conserva las tallas agotadas de los artículos que aún tienen otra talla disponible.
- Selección pública local sin datos de contacto. La vista previa no escribe; la acción final registra un pedido pendiente antes de abrir WhatsApp.
- Permisos de acceso para el personal y protección de datos de clientes, carritos y pedidos.
- Ajustes atómicos de existencias, validaciones y errores identificables.

La capa de negocio implementa `ControlCatalogo`, `ControlCarrito`, `ControlGeneracionPedido`, `ControlPedidoPublico` y `SolicitudConsulta`. El público registra al abrir WhatsApp; el personal consulta y confirma pedidos. La identidad oscura usa acentos rojos y se adapta a móvil y escritorio. No incluye pagos, ventas, reservas, tarifas de envío, devoluciones ni administración de cuentas.

## Ejecutar la aplicación web

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
npm run dev
```

Abrir **http://127.0.0.1:3000**. La conexión y una cuenta EMPLEADO de demostración ya están preparadas en esta carpeta. El correo y contraseña están en `.env.personal.local`, un archivo privado ignorado por Git.

La demostración de esta entrega está abierta en **http://127.0.0.1:3001** porque el puerto 3000 estaba ocupado. Para iniciarla en ese puerto, ejecutar `$env:PORT='3001'` antes de `npm run dev`.

La vista previa pública funciona sin configurar WhatsApp. Para habilitar **Abrir WhatsApp**, definir `GABOSTORE_WHATSAPP` en `.env` con el número comercial internacional, solo dígitos, y reiniciar el servidor. Un valor ausente o inválido mantiene el botón deshabilitado. El usuario envía el mensaje manualmente; preparar o abrir la consulta no registra un pedido.

La [guía del flujo básico](docs/FLUJO_BASICO.md) explica la prueba paso a paso, la separación de capas, las credenciales y la configuración en otro equipo. No se ha publicado la aplicación ni se han desplegado nuevas funciones Edge; el servidor HTTP es el adaptador de prueba local.

## Archivos principales

- `src/models.ts`: tipos del dominio.
- `src/database.generated.ts`: tipos generados desde el esquema real de Supabase.
- `src/database.types.ts`: alias de los tipos utilizados por los repositorios.
- `src/supabase.ts`: configuración del cliente de Supabase.
- `src/repositories/`: los tres repositorios.
- `src/negocio/`: los tres controles, las reglas del flujo básico y la solicitud pública independiente de `PedidoNuevo`.
- `src/servidor/`: API HTTP que valida la sesión y el rol del personal.
- `web/`: presentación React/TypeScript; `web-dist/` es una salida generada.
- `web/public/fonts/`: Roboto Mono y Public Sans alojadas localmente, con sus licencias OFL; proceden del repositorio oficial de Google Fonts.
- `src/index.ts`: exportaciones y función `crearCapaDatos`.
- `supabase/migrations/`: migraciones aplicadas, con versiones sincronizadas con Supabase.
- `tests/`: pruebas de la migración y del acceso desde TypeScript.
- `scripts/verificar-conexion.mjs`: prueba de conexión y permisos públicos sobre Supabase real.
- `scripts/demo-pedido.ts`: ejecuta los repositorios TypeScript y deja un pedido completo en Supabase real.
- `scripts/verificar-flujo.ts`: prueba real de HTTP → negocio → datos → Supabase.
- `scripts/verificar-catalogo.ts`: prueba real del alta, edición, carga de imagen y ajustes con una sesión EMPLEADO.
- `assets/productos-demo/`: tres imágenes ilustrativas generadas, versiones WebP optimizadas y sus prompts/procedencia.

## Preparación local

Requiere Node.js 22.12 o posterior.

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
npm ci
npm run typecheck
npm test
npm run build
npm run verificar:conexion
```

`build` genera JavaScript y declaraciones de tipos en `dist/`. `build:web` compila la presentación en `web-dist/`. `dev` compila la web y arranca el servidor local; se reinicia para reflejar cambios de código. Los repositorios y controles también pueden importarse sin utilizar la presentación React.

## Preparación de Supabase

La carpeta ya está configurada para el proyecto **GaboStore** (`nugyfjtbfhtllgomlnob`). Las migraciones se aplicaron por MCP. `.env`, ignorado por Git, contiene la configuración local. La URL y la clave pública bastan para leer el catálogo; para ejecutar la demo de escritura se necesita además la autenticación descrita abajo.

Migraciones aplicadas:

- `20261014031557_datos_gabostore.sql`: modelo, permisos y funciones.
- `20261014032020_ajustar_integridad_pedidos.sql`: índice de la relación compuesta y subtotales obligatorios.
- `20261017191819_guardar_objeto_pedido.sql`: guardado atómico de un objeto de pedido y permisos explícitos para un backend con `service_role`.
- `20261018193202_registrar_personal_pedido.sql`: UID del personal responsable en `pedidos.creado_por`. Los registros anteriores conservan un autor nulo; no se inventa trazabilidad histórica.

**No volver a ejecutar estas migraciones en GaboStore:** ya están registradas en su historial. Para preparar otro proyecto vacío, ejecutar los archivos de `supabase/migrations/` en orden y configurar su URL y clave pública.

Este paquete recibe la configuración por parámetro; no carga `.env` automáticamente. En Node.js se puede cargar con `node --env-file=.env archivo.js`, o usar la gestión de variables de la aplicación.

Las operaciones internas requieren un JWT de personal con `app_metadata.rol` ADMIN o EMPLEADO. La presentación ya implementa el inicio de sesión. `preparar:personal` creó una cuenta EMPLEADO ficticia sin enviar correos ni modificar cuentas existentes; los clientes siguen sin cuentas de Auth.

### Autorización del personal

La asignación del rol se hace mediante administración confiable de Supabase, nunca mediante un formulario donde el usuario elija su propio rol. Por ejemplo, un administrador del proyecto puede ejecutar lo siguiente en SQL Editor, sustituyendo el UUID:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                       || '{"rol":"ADMIN"}'::jsonb
where id = 'UUID_DEL_USUARIO_INTERNO';
```

Para un empleado se utiliza `EMPLEADO`. Después de cambiar el rol, renovar la sesión para obtener un JWT actualizado. Ambos roles tienen los mismos permisos de persistencia en esta versión; el documento no define una matriz más detallada.

Sin un JWT interno válido, la clave pública permite consultar el catálogo mediante `obtener_catalogo`, pero no acceder a los datos privados ni realizar escrituras. Las políticas requieren una identidad autenticada y el rol en `app_metadata`, que el usuario no puede editar, según la [documentación de RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). Las funciones con privilegios elevados están en el esquema interno `private`; la API pública expone funciones que delegan en operaciones concretas.

El backend debe crear una instancia del cliente por petición si recibe el JWT del empleado. Esto evita compartir la identidad de un empleado entre peticiones. El cliente público usa clave pública y JWT del personal. Para el registro público y la demo de terminal se usa una clave secreta de servidor mediante un cliente independiente; nunca poner claves secretas o `service_role` en un navegador.

## Uso desde TypeScript

Catálogo público:

```typescript
import { crearClienteSupabase, crearCapaDatos } from './dist/index.js';

const clientePublico = crearClienteSupabase({
  url: process.env.SUPABASE_URL ?? '',
  clavePublica: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
});

const datos = crearCapaDatos(clientePublico);
const primeraPagina = await datos.articulos.listarCatalogo(20, 0);
const detalle = await datos.articulos.obtenerPublicoPorId(1);
```

Operaciones internas: el JWT proviene del inicio de sesión del personal. La API lo valida con Supabase Auth antes de crear los controles; la capa de datos recibe ese token.

```typescript
import { crearClienteSupabase, crearCapaDatos } from './dist/index.js';

function datosDelPersonal(tokenUsuario: string) {
  return crearCapaDatos(crearClienteSupabase({
    url: process.env.SUPABASE_URL ?? '',
    clavePublica: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
    tokenUsuario,
  }));
}

// Dentro de una petición ya autenticada:
// const datos = datosDelPersonal(jwtDelEmpleado);
// const cliente = await datos.carritos.crearCliente({ nombre: 'Ana', telefono: '6621234567' });
// const carrito = await datos.carritos.abrir(cliente.id);
// const pedido = await datos.pedidos.guardar({
//   clienteId: cliente.id, carritoId: carrito.id,
//   items: [{ varianteId, cantidad: 2, precioUnitario: 149.90 }],
// });
// La compra siguiente obtiene un carrito nuevo:
// const siguiente = await datos.carritos.abrir(cliente.id);
```

También se puede pasar un `SupabaseClient<Database>` ya configurado a `crearCapaDatos`, por ejemplo si la aplicación gestiona su propia sesión. La conexión usa el [cliente oficial de Supabase](https://supabase.com/docs/reference/javascript/initializing).

## Operaciones disponibles

### ArticuloRepository

- `listarCatalogo(limite?, desde?)`: consulta pública, hasta 100 artículos por página.
- `obtenerPublicoPorId(id)`: devuelve un artículo público disponible o `null`.
- `listar(limite?, desde?)`: consulta interna, incluyendo agotados.
- `obtenerPorId(id)`: consulta interna o `null`.
- `obtenerPorVariante(varianteId)`: recupera el artículo de una variante para validar el carrito.
- `crear(datos)`: guarda el artículo y sus variantes en una sola transacción.
- `actualizar(id, cambios)`: cambia los campos básicos del artículo.
- `crearVariante(articuloId, datos)`: añade una talla/medida. Para un producto sin talla, usar una variante `Única`.
- `ajustarExistencia(varianteId, cambio)`: suma o resta unidades en SQL, sin permitir existencias negativas. Usar cantidades negativas para restar.

### CarritoRepository

- `crearCliente(datos)`, `obtenerCliente(id)`, `actualizarCliente(id, cambios)`.
- `abrir(clienteId)`: recupera el abierto o crea uno nuevo si el anterior está cerrado. No pide correo.
- `obtenerPorId(id)`, `obtenerAbierto(clienteId)`.
- `guardarItem(carritoId, varianteId, cantidad, precioUnitario?)`: inserta o cambia una línea. La cantidad es el nuevo valor total, no un incremento.
- `quitarItem(carritoId, varianteId)`.

Al añadir una variante sin indicar precio, se toma el precio base del artículo. Al cambiar la cantidad de una línea existente sin indicar precio, se conserva el precio previamente guardado. Un precio explícito solo debe enviarlo el personal autorizado.

### PedidoRepository

- `guardar(pedido: PedidoNuevo)`: recibe cliente, carrito, estado opcional (por defecto `PENDIENTE`) y todas las líneas `{ varianteId, cantidad, precioUnitario }`. Guarda cabecera y detalle en una transacción, sincroniza y cierra el carrito, y recupera el `Pedido` persistido. PostgreSQL asigna el ID, la fecha y los subtotales. No hay que insertar los detalles por separado.
- `crearDesdeCarrito(carritoId)`: genera un pedido `PENDIENTE`, copia las líneas y cierra el carrito. Repetir la llamada devuelve el mismo pedido.
- `obtenerPorId(id)`.
- `obtenerPorCarrito(carritoId)`: recupera el pedido de un carrito cerrado para un reintento del flujo.
- `listar({ clienteId?, estado?, limite?, desde? })`: consultas paginadas, con los pedidos más recientes primero.
- `confirmar(id, confirmacionesProveedor)`: comprueba plazo y disponibilidad en una transacción y pasa PENDIENTE a CONFIRMADO. No descuenta stock ni registra pagos.
- `actualizarEstado(id, estado)`: operación previa para pedidos internos; la confirmación pública pasa exclusivamente por la RPC protegida.

Las consultas individuales devuelven `null` si el registro no existe o no es visible para el usuario. Las escrituras fallidas lanzan `ErrorDatos`, con `codigo`, `message` y `detalle`.

`PedidoNuevo` es la forma de un pedido antes de guardarlo: omite los valores generados por la base. `guardar` también acepta una variable de tipo `Pedido`, pero utiliza únicamente los datos de entrada; no importa su ID, fecha ni subtotales calculados en memoria. No es un método para modificar pedidos existentes. Reintentar el mismo carrito y contenido devuelve el pedido guardado, sin duplicarlo ni restablecer su estado. Un contenido distinto para ese carrito se rechaza. Si falla la lectura después del guardado, se puede reintentar con el mismo objeto.

## Decisiones de persistencia

- Se usa el último dominio simplificado aprobado, sin modificar los archivos de diagramas.
- Según la decisión tomada en el chat, un cliente conserva varios carritos históricos y **solo uno abierto**. Cada carrito cerrado pertenece a un único pedido. Esta precisión sustituye la interpretación literal de un único carrito de por vida por cliente.
- `items_carrito` e `items_pedido` representan `ItemCarrito` en dos momentos: cesta editable y copia histórica. No son nuevas entidades comerciales.
- Los identificadores de carrito, las claves foráneas y `cerrado` son datos técnicos para almacenar las asociaciones y proteger el historial.
- Los importes se almacenan como `numeric`, aunque el dibujo use `float`, para calcular los subtotales con decimales exactos en PostgreSQL. TypeScript los presenta como `number`. El precio admite hasta dos decimales y como máximo 99.999.999,99; los subtotales admiten hasta 999.999.999.999,99.
- `subtotal` es una columna generada; no se recibe del consumidor.
- Las cantidades deben ser enteras positivas; las existencias, enteras no negativas. Los identificadores están limitados al rango seguro de JavaScript.
- Las fechas se guardan como `timestamptz` y se entregan como cadenas ISO 8601.
- No se permite borrar artículos, variantes o clientes desde los repositorios. La rutina privada de Cron elimina únicamente nuevos pedidos públicos pendientes vencidos y sus carritos. El resto del historial se conserva.
- La fotografía se almacena como URL. La web carga JPEG, PNG o WebP de hasta 5 MiB en el bucket público `catalogo`; las cargas requieren rol ADMIN o EMPLEADO y utilizan rutas nuevas para cada archivo.
- Crear un carrito o pedido pendiente **no reserva ni descuenta stock y no registra un pago**. La capa de control no debe tratar esta operación como una venta.

El modelo final no incluye anticipos, `APARTADO`, `PAGADO`, reservas de 48 horas, ventas, devoluciones, `activo` ni `requiereConsulta`. Las reglas del documento que dependen de esos datos no quedan implementadas en este esquema simplificado. Para incorporarlas después se necesitaría una ampliación explícita del modelo; `CONFIRMADO` no se interpreta automáticamente como un pago.

## Demo de la capa de datos en Supabase real

Se ejecuta desde la terminal y muestra el resultado en las tablas reales de Supabase. No tiene interfaz gráfica y no utiliza SQL Editor, PGlite ni respuestas HTTP simuladas.

**En esta carpeta la conexión de la demo ya quedó configurada en `.env` usando la CLI autorizada. Basta ejecutar `npm run demo:datos`.** Los pasos siguientes sirven para configurar otra copia del proyecto; las credenciales no se incluyen en GitHub.

1. Copiar `.env.example` a `.env` solo si todavía no existe. Configurar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.
2. En GaboStore, ir a **Settings > API Keys > Secret keys** y guardar la clave de servidor como `SUPABASE_SECRET_KEY` en `.env`. Es una credencial privada con privilegios de backend: no compartirla ni subirla a Git. Como alternativa, usar la clave pública y `SUPABASE_USER_TOKEN` de un ADMIN/EMPLEADO autenticado. La sesión MCP o la sesión del navegador no autentican automáticamente este script.
3. Ejecutar:

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
npm ci
npm run demo:datos
```

El script crea un artículo con dos variantes, un cliente ficticio y un carrito mediante los repositorios. A continuación construye este objeto, utilizando los IDs reales obtenidos:

```typescript
const pedido: PedidoNuevo = {
  clienteId: cliente.id,
  carritoId: carrito.id,
  estado: EstadoPedido.PENDIENTE,
  items: [
    { varianteId: mediana.id, cantidad: 2, precioUnitario: 149.90 },
    { varianteId: grande.id, cantidad: 1, precioUnitario: 159.90 },
  ],
};

const guardado = await datos.pedidos.guardar(pedido);
const recuperado = await otraConexion.pedidos.obtenerPorId(guardado.id);
```

La terminal imprime el objeto enviado y el pedido recuperado con otra conexión. Comprueba automáticamente las dos variantes, sus cantidades y precios, los subtotales de 299,80 y 159,90, el carrito cerrado y un reintento sin duplicados. Total: **459,70**. Solo muestra éxito si todas las comprobaciones pasan; un error termina con código distinto de cero.

Para presentarlo en Supabase, abrir **Table Editor > pedidos** y filtrar por el ID impreso. Después, abrir **items_pedido** y filtrar `pedido_id` por ese mismo número: aparecen las dos líneas. Los datos se conservan, identificados por `DEMO TS` y la fecha de ejecución en el nombre del cliente y del artículo. Cada ejecución crea un nuevo caso de demostración. No descuenta existencias ni registra pagos.

Verificación real del 17 de octubre de 2026: el script guardó y recuperó el pedido **3**, carrito **5**, variantes **6** y **7**, con dos líneas y total **459,70**. Una consulta independiente por MCP confirmó esos registros y el cierre del carrito. Son IDs de esa ejecución, no valores fijos de la demo.

`supabase/demo/cargar.sql` y `consultas.sql` quedan como datos y consultas auxiliares de la demostración anterior. Esa carga SQL permite revisar el esquema, pero no demuestra por sí misma la capa TypeScript; para eso se utiliza `npm run demo:datos`.

## Verificación

`npm test` aplica las migraciones de datos y funciones en PostgreSQL mediante PGlite (el proceso pg_cron se comprueba en Supabase real), con roles y `auth.jwt()` de prueba. Verifica permisos públicos e internos, subtotales, restricciones, rollback del objeto completo, cierre del carrito, conservación del pedido, repetición sin duplicados y apertura de un carrito nuevo. Otras pruebas utilizan el cliente real de Supabase con HTTP simulado para comprobar las llamadas de los repositorios.

`npm test` no se conecta al proyecto remoto. PGlite se usa solo como dependencia de desarrollo; no reemplaza Supabase en la implementación. Las operaciones compuestas usan [funciones de PostgreSQL invocadas mediante Supabase](https://supabase.com/docs/guides/database/functions).

`npm run verificar:conexion` consulta el catálogo real y comprueba que la clave pública no pueda leer clientes ni generar pedidos. No inserta datos ni necesita credenciales de empleados.

`npm run verificar:flujo` autentica el personal de prueba y recorre la API HTTP real. Crea un carrito, añade, modifica y quita líneas, genera el pedido, verifica su autor y recupera la copia persistida. Comprueba que un precio enviado por el navegador se ignore, que el reintento no duplique el pedido y que no se descuente stock. Sus registros quedan identificados por `DEMO FLUJO` en Supabase.

La revisión posterior a incorporar Auth señaló **Leaked Password Protection Disabled**, una configuración del proyecto: revisar la [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) en Supabase antes de una publicación. La revisión de rendimiento inicial solo señaló [índices aún sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). El índice señalado como faltante se añadió en la segunda migración.

## Registro público y vencimiento · 26 de octubre de 2026

`POST /api/pedidos/publicos` acepta `claveSolicitud` y líneas `{ varianteId, cantidad }`. Guarda un pedido web sin datos de cliente, con precios obtenidos del servidor y vencimiento de 120 horas. La misma clave y contenido recuperan el mismo pedido. El navegador recibe solo número, estado, fechas y mensaje público; nunca credenciales ni precios sobre pedido. La operación requiere número comercial válido y clave de servidor en el backend.

`POST /api/personal/pedidos/:id/confirmar` requiere ADMIN o EMPLEADO y acepta `confirmacionesProveedor`. Comprueba estado, plazo y disponibilidad en una transacción. Confirmar no descuenta existencias ni registra pagos. Solo los nuevos pedidos públicos pendientes vencen: Supabase Cron ejecuta la limpieza privada cada minuto y elimina sus detalles y carrito. Se conserva el historial anterior y del personal. Los correos históricos quedan opcionales; el acceso del personal conserva su correo.

`npm run verificar:whatsapp` prueba HTTP → negocio → repositorio → Supabase real con una sesión EMPLEADO, reintentos y confirmaciones concurrentes. No abre WhatsApp ni envía mensajes. Ver la [guía actualizada](docs/FLUJO_BASICO.md).
