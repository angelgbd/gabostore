# GaboStore: capa de datos

Implementación independiente de la capa de persistencia con **Supabase/PostgreSQL y TypeScript**. Contiene los tres repositorios del último diagrama lógico aprobado: `ArticuloRepository`, `CarritoRepository` y `PedidoRepository`.

## Qué está implementado

- Artículos con variantes, fotografías como URL/ruta, precio base y marca `sobrePedido`.
- Datos de contacto de clientes, capturados por el personal; no se crean cuentas de clientes.
- Un carrito abierto por cliente y carritos anteriores conservados como historial.
- Un pedido por carrito, con copia independiente de cantidades y precios.
- Estados de la última imagen: `PENDIENTE`, `ENVIADO`, `ENTREGADO`, `CANCELADO` y `CONFIRMADO`.
- Catálogo público de solo lectura: oculta artículos completamente agotados y conserva las tallas agotadas de los artículos que aún tienen otra talla disponible.
- Permisos de acceso para el personal y protección de datos de clientes, carritos y pedidos.
- Ajustes atómicos de existencias, validaciones y errores identificables.

Esta entrega contiene persistencia y acceso a datos. La interfaz, los controladores, el inicio de sesión y el despliegue de las API pertenecen a las otras capas y no se implementan aquí.

## Archivos principales

- `src/models.ts`: tipos del dominio.
- `src/database.generated.ts`: tipos generados desde el esquema real de Supabase.
- `src/database.types.ts`: alias de los tipos utilizados por los repositorios.
- `src/supabase.ts`: configuración del cliente de Supabase.
- `src/repositories/`: los tres repositorios.
- `src/index.ts`: exportaciones y función `crearCapaDatos`.
- `supabase/migrations/`: las dos migraciones aplicadas, con versiones sincronizadas con Supabase.
- `tests/`: pruebas de la migración y del acceso desde TypeScript.
- `scripts/verificar-conexion.mjs`: prueba de conexión y permisos públicos sobre Supabase real.

## Preparación local

Requiere Node.js 22 o posterior.

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
npm ci
npm run typecheck
npm test
npm run build
npm run verificar:conexion
```

`build` genera JavaScript y declaraciones de tipos en `dist/`. El paquete se puede importar desde otra aplicación TypeScript o desde las funciones del backend. No necesita React ni un servidor web propio.

## Preparación de Supabase

La carpeta ya está configurada para el proyecto **GaboStore** (`nugyfjtbfhtllgomlnob`). Las migraciones se aplicaron por MCP y `.env` contiene la URL y la clave pública activa del proyecto. No contiene contraseñas, claves secretas ni tokens de empleados.

Migraciones aplicadas:

- `20261014031557_datos_gabostore.sql`: modelo, permisos y funciones.
- `20261014032020_ajustar_integridad_pedidos.sql`: índice de la relación compuesta y subtotales obligatorios.

**No volver a ejecutar estas migraciones en GaboStore:** ya están registradas en su historial. Para preparar otro proyecto vacío, ejecutar los archivos de `supabase/migrations/` en orden y configurar su URL y clave pública.

Este paquete recibe la configuración por parámetro; no carga `.env` automáticamente. En Node.js se puede cargar con `node --env-file=.env archivo.js`, o usar la gestión de variables de la aplicación.

Para operaciones internas todavía se necesita el JWT de un usuario del personal con `app_metadata.rol` igual a `ADMIN` o `EMPLEADO`. No se han creado cuentas de empleados ni modificado usuarios de Auth.

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

El backend debe crear una instancia del cliente por petición si recibe el JWT del empleado. Esto evita compartir la identidad de un empleado entre peticiones. No poner claves secretas o `service_role` en el navegador; este paquete trabaja con clave pública y JWT del personal.

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

Operaciones internas: el JWT proviene del inicio de sesión del personal, que implementará la aplicación. La capa de datos recibe ese token, sin implementar el flujo de autenticación.

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
// const carrito = await datos.carritos.abrir(cliente.id, 'ana@example.com');
// await datos.carritos.guardarItem(carrito.id, varianteId, 2);
// const pedido = await datos.pedidos.crearDesdeCarrito(carrito.id);
// La compra siguiente obtiene un carrito nuevo:
// const siguiente = await datos.carritos.abrir(cliente.id, 'ana@example.com');
```

También se puede pasar un `SupabaseClient<Database>` ya configurado a `crearCapaDatos`, por ejemplo si la aplicación gestiona su propia sesión. La conexión usa el [cliente oficial de Supabase](https://supabase.com/docs/reference/javascript/initializing).

## Operaciones disponibles

### ArticuloRepository

- `listarCatalogo(limite?, desde?)`: consulta pública, hasta 100 artículos por página.
- `obtenerPublicoPorId(id)`: devuelve un artículo público disponible o `null`.
- `listar(limite?, desde?)`: consulta interna, incluyendo agotados.
- `obtenerPorId(id)`: consulta interna o `null`.
- `crear(datos)`: guarda el artículo y sus variantes en una sola transacción.
- `actualizar(id, cambios)`: cambia los campos básicos del artículo.
- `crearVariante(articuloId, datos)`: añade una talla/medida. Para un producto sin talla, usar una variante `Única`.
- `ajustarExistencia(varianteId, cambio)`: suma o resta unidades en SQL, sin permitir existencias negativas. Usar cantidades negativas para restar.

### CarritoRepository

- `crearCliente(datos)`, `obtenerCliente(id)`, `actualizarCliente(id, cambios)`.
- `abrir(clienteId, correoCliente)`: recupera el abierto o crea uno nuevo si el anterior está cerrado. Si ya existe uno abierto, conserva su correo actual.
- `obtenerPorId(id)`, `obtenerAbierto(clienteId)`.
- `guardarItem(carritoId, varianteId, cantidad, precioUnitario?)`: inserta o cambia una línea. La cantidad es el nuevo valor total, no un incremento.
- `quitarItem(carritoId, varianteId)`.
- `actualizarCorreo(carritoId, correoCliente)`: solo sobre un carrito abierto.

Al añadir una variante sin indicar precio, se toma el precio base del artículo. Al cambiar la cantidad de una línea existente sin indicar precio, se conserva el precio previamente guardado. Un precio explícito solo debe enviarlo el personal autorizado.

### PedidoRepository

- `crearDesdeCarrito(carritoId)`: genera un pedido `PENDIENTE`, copia las líneas y cierra el carrito. Repetir la llamada devuelve el mismo pedido.
- `obtenerPorId(id)`.
- `listar({ clienteId?, estado?, limite?, desde? })`: consultas paginadas, con los pedidos más recientes primero.
- `actualizarEstado(id, estado)`: persiste uno de los cinco estados válidos. La capa de control debe decidir cuándo corresponde una transición.

Las consultas individuales devuelven `null` si el registro no existe o no es visible para el usuario. Las escrituras fallidas lanzan `ErrorDatos`, con `codigo`, `message` y `detalle`.

## Decisiones de persistencia

- Se usa el último dominio simplificado aprobado, sin modificar los archivos de diagramas.
- Según la decisión tomada en el chat, un cliente conserva varios carritos históricos y **solo uno abierto**. Cada carrito cerrado pertenece a un único pedido. Esta precisión sustituye la interpretación literal de un único carrito de por vida por cliente.
- `items_carrito` e `items_pedido` representan `ItemCarrito` en dos momentos: cesta editable y copia histórica. No son nuevas entidades comerciales.
- Los identificadores de carrito, las claves foráneas y `cerrado` son datos técnicos para almacenar las asociaciones y proteger el historial.
- Los importes se almacenan como `numeric`, aunque el dibujo use `float`, para calcular los subtotales con decimales exactos en PostgreSQL. TypeScript los presenta como `number`. El precio admite hasta dos decimales y como máximo 99.999.999,99; los subtotales admiten hasta 999.999.999.999,99.
- `subtotal` es una columna generada; no se recibe del consumidor.
- Las cantidades deben ser enteras positivas; las existencias, enteras no negativas. Los identificadores están limitados al rango seguro de JavaScript.
- Las fechas se guardan como `timestamptz` y se entregan como cadenas ISO 8601.
- No se permite borrar artículos, variantes, clientes o pedidos desde los repositorios. El stock agotado y los pedidos se conservan.
- La fotografía se almacena como URL/ruta. La carga física de archivos en Supabase Storage queda para la integración correspondiente.
- Crear un carrito o pedido pendiente **no reserva ni descuenta stock y no registra un pago**. La capa de control no debe tratar esta operación como una venta.

El modelo final no incluye anticipos, `APARTADO`, `PAGADO`, reservas de 48 horas, ventas, devoluciones, `activo` ni `requiereConsulta`. Las reglas del documento que dependen de esos datos no quedan implementadas en este esquema simplificado. Para incorporarlas después se necesitaría una ampliación explícita del modelo; `CONFIRMADO` no se interpreta automáticamente como un pago.

## Demo en Supabase

La demo se muestra en la base real de **GaboStore**, desde el Table Editor o SQL Editor de Supabase. La demo temporal de terminal fue eliminada.

- `supabase/demo/cargar.sql`: carga los datos ficticios de manera transaccional y sin duplicarlos si se ejecuta otra vez.
- `supabase/demo/consultas.sql`: consultas de lectura listas para explicar cada parte de la demo.

Para presentarla:

1. Abrir GaboStore en Supabase y entrar en **Table Editor**.
2. En `articulos` y `variantes`, mostrar los dos productos marcados `DEMO GaboStore`, sus tallas y existencias.
3. En `clientes` y `carritos`, mostrar el cliente ficticio, su carrito cerrado y el nuevo carrito abierto.
4. En `items_carrito`, mostrar dos camisas a 149,90 y una gorra a 199,00: total 498,80.
5. En `pedidos` e `items_pedido`, mostrar el pedido `CONFIRMADO` y la copia de esas cantidades y precios.
6. Comparar la camisa en `articulos` (169,90) con `items_pedido` (149,90): el precio histórico se conserva.

Los datos quedan guardados en Supabase. Para cargar esta demo en otra base con las mismas migraciones, ejecutar `cargar.sql` en SQL Editor como administrador del proyecto. No elimina datos, no modifica usuarios de Auth y no cambia las políticas RLS. La identidad interna se simula únicamente dentro de esa transacción administrativa para ejecutar las funciones existentes; no genera una sesión ni un token utilizable en la aplicación.

Esta demo presenta la persistencia de datos. El estado `CONFIRMADO` no registra un pago ni descuenta existencias. `npm test` conserva sus pruebas locales independientes y `verificar:conexion` consulta el proyecto real.

## Verificación

`npm test` aplica la migración en PostgreSQL mediante PGlite, con roles y `auth.jwt()` de prueba. Verifica permisos públicos e internos, subtotales, restricciones, rollback, cierre del carrito, conservación del pedido, repetición sin duplicados y apertura de un carrito nuevo. Otras pruebas utilizan el cliente real de Supabase con HTTP simulado para comprobar las llamadas de los repositorios.

`npm test` no se conecta al proyecto remoto. PGlite se usa solo como dependencia de desarrollo; no reemplaza Supabase en la implementación. Las operaciones compuestas usan [funciones de PostgreSQL invocadas mediante Supabase](https://supabase.com/docs/guides/database/functions).

`npm run verificar:conexion` consulta el catálogo real y comprueba que la clave pública no pueda leer clientes ni generar pedidos. No inserta datos ni necesita credenciales de empleados.

La verificación inicial de GaboStore se hizo con una transacción de prueba y `ROLLBACK`, sin guardar registros. La demo actual es distinta: sus datos marcados `DEMO GaboStore` sí se conservan en el proyecto para la presentación.

La revisión de seguridad de Supabase no reportó alertas. La revisión de rendimiento solo señaló [índices aún sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), una observación informativa esperable en una base recién creada y vacía. El índice señalado como faltante se añadió en la segunda migración.
