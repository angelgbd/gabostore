# Guía del flujo básico

## Iniciar la web

Requiere Node.js 22.12 o posterior. En la carpeta existente:

```powershell
cd C:\Users\angel\OneDrive\Documents\GaboStoreDatos
npm run dev
```

Abrir http://127.0.0.1:3000. La API escucha únicamente en el equipo local. `dev` compila y arranca; después de editar código, detener con Ctrl+C y ejecutar de nuevo. `npm start` reutiliza la compilación. Para usar otro puerto, definir `PORT` antes de iniciar.

## Recorrer las cuatro pantallas

1. **Catálogo:** consultar artículos sin iniciar sesión, buscar por nombre o categoría y abrir una ficha. Los artículos agotados se conservan en la base; el catálogo público solo muestra aquellos con alguna existencia. Las variantes agotadas siguen visibles. Los artículos sobre pedido muestran consulta de precio.
2. **Acceso del personal:** entrar en Personal. Usar el correo y la contraseña de `.env.personal.local`. Es una cuenta EMPLEADO de demostración, sin acceso de cliente público a operaciones internas.
3. **Nuevo pedido:** pulsar Nuevo pedido, capturar nombre, teléfono y correo y continuar a los artículos. Son datos de contacto, no una cuenta de cliente.
4. **Detalle:** seleccionar una variante disponible y una cantidad entera positiva. Añadir al carrito. Repetir con otro artículo si se desea.
5. **Carrito:** cambiar cantidades o quitar líneas. El servidor valida disponibilidad y conserva el precio capturado. Pulsar Revisar pedido.
6. **Confirmación:** comprobar cliente, artículos, variantes, cantidades y total. Para artículos sobre pedido, confirmar manualmente que ya se consultó su disponibilidad con el proveedor. Pulsar Registrar pedido pendiente.
7. **Resultado:** anotar el número del pedido. La confirmación se puede recargar y recupera el registro real. Preparar otro pedido obtiene un carrito nuevo.
8. **Supabase:** buscar ese ID en `pedidos` y el mismo número como `pedido_id` en `items_pedido`. Verificar cantidades, precios y subtotales. `creado_por` guarda el UID del empleado autenticado.

Un pedido pendiente no representa una venta pagada, no reserva unidades y no descuenta existencias. La comunicación comercial sigue realizándose por WhatsApp fuera del sistema.

## Capas

`web/` → API HTTP → `src/negocio/` → `src/repositories/` → Supabase.

- React recoge datos y muestra los resultados. No inserta tablas ni acepta decisiones de precios como válidas.
- ControlCatalogo aplica las diferencias entre la consulta pública e interna.
- ControlCarrito valida contacto, asociación entre artículo y variante, cantidades y disponibilidad.
- ControlGeneracionPedido vuelve a validar el carrito y construye un objeto PedidoNuevo completo.
- PedidoRepository.guardar persiste cabecera y todas las líneas en una transacción. Si se pierde la respuesta, repetir el registro del carrito recupera el mismo pedido.
- El adaptador HTTP valida el JWT con Supabase Auth y exige ADMIN o EMPLEADO desde app_metadata. Cada petición usa un cliente con el token de su usuario.

Los controles no dependen de React ni de HTTP y pueden reutilizarse en las API del despliegue posterior. El catálogo estático puede compilarse para Cloudflare, pero esta entrega no lo publica ni supone que la API Node local esté desplegada allí.

## Preparar otra copia

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env` y configurar URL y clave pública de Supabase.
3. Usar una cuenta de personal existente, con rol en app_metadata.
4. Para una cuenta ficticia nueva, configurar la clave secreta exclusivamente en la terminal/backend y ejecutar `npm run preparar:personal`. El script crea una cuenta EMPLEADO, genera una contraseña y guarda el acceso en `.env.personal.local`, sin enviar correo. Se puede elegir el correo con GABOSTORE_PERSONAL_EMAIL.
5. El script conserva cuentas existentes: si el correo predeterminado ya está registrado y no se tiene su archivo de acceso, utilizar credenciales existentes o elegir otro correo. No restablece contraseñas.
6. Ejecutar `npm run dev`.

`.env` y `.env.personal.local` no se suben a Git. La API solo entrega al navegador URL y clave pública. Las claves secretas y contraseñas de preparación no forman parte del bundle de React.

## Verificar

```powershell
npm run typecheck
npm test
npm run build
npm run build:web
npm run verificar:flujo
```

Las pruebas locales usan PostgreSQL mediante PGlite y dobles de los repositorios. `verificar:flujo` utiliza una sesión real de personal y Supabase real, arrancando un servidor de prueba en un puerto temporal; no necesita detener la web abierta. Deja sus registros identificados como DEMO FLUJO. Requiere dos artículos normales con al menos dos unidades disponibles para probar las dos líneas.

El flujo básico no incluye pagos, apartados, ventas, devoluciones, envíos, reportes, edición del catálogo ni administración de cuentas desde la web. La confirmación del proveedor es una declaración manual del empleado; el sistema no consulta al proveedor automáticamente.
