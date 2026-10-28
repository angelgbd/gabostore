---
version: 1
slug: "web-app-tsx"
primary_target: "web/App.tsx"
related_targets: ["web/styles.css"]
---

# Flujo básico

## Release 1 · 28 de octubre de 2026

Ampliación Operate autorizada de la aplicación existente, implementación directa con código. La identidad oscura, coral y Roboto Mono se conserva. Gestión añade navegación secundaria horizontal por módulos; listas legibles y formulario inline a su lado en escritorio, una columna en móvil, sin métricas decorativas. Usuarios (ADMIN), categorías (ADMIN), proveedores (ADMIN), artículos (ambos roles), compras y ventas (ambos) mantienen formularios y controles nativos de48px. Importes y efecto en existencias se revisan antes de confirmar compras/ventas. Registro atómico, reintentos idempotentes y recuperación de errores sin perder campos. Bajas lógicas con reactivación e historial conservado. La cabecera se adapta a los nuevos enlaces. El catálogo público y WhatsApp existentes permanecen. Evidencia móvil360/390, tableta768/1024, escritorio1440 y tamaño real. No nuevas imágenes ni mundo visual; DESIGN se compara al finalizar y se preserva si no hay cambio de sistema.

Modo Operate. Cuatro pantallas públicas: catálogo, detalle, solicitud local y mensaje de WhatsApp. El personal conserva su registro de pedidos. React/TypeScript; implementación directa con código y referencias fijadas por el usuario.

## Direction contract

THESIS: Consultar el catálogo, preparar una selección local sin contacto y registrar un pedido pendiente al abrir WhatsApp. El personal confirma y conserva su flujo interno.

OWN-WORLD: Referencias visuales del usuario de 20/10/2026, con el cambio de color aprobado el26/10/2026: negro, paneles carbón, bordes finos, rojo coral #ff5264, Roboto Mono y logotipo rojo claro #ffb0b4 de dos líneas con camiseta. WhatsApp verde. Fotografías reales e ilustraciones demo identificadas; ausencias con iniciales. Controles rectos y lectura/tacto accesibles.

STORY: Buscar o filtrar, elegir variante/cantidad, revisar selección sin datos de contacto y preparar una vista previa sin escrituras. Registrar pedido y abrir WhatsApp guarda un PENDIENTE y devuelve folio/plazo. El usuario envía manualmente el mensaje. Personal confirma disponibilidad/proveedor sin pago, reserva o descuento. Solo nuevos públicos pendientes vencen a120horas.

FIRST VIEWPORT: Marca de dos líneas, carrito con contador coral, búsqueda oscura y categorías con selección coral. Dos columnas en móvil, tres desde900px y cuatro desde1200px; marco máximo1280px. Foto/iniciales y datos en tarjetas. Detalle móvil con acción inferior fija; en escritorio dos columnas. Carrito con resumen lateral en escritorio sin formulario de correo. Mensaje centrado con vista previa verde.

FORM: Conservar composición aprobada y aplicar solo la extensión autorizada. Selección coral, actualización de cantidades y disponibilidad, conservación de búsqueda/categoría/posición; solicitud e intento en sessionStorage para reintentos sin duplicar. Número comercial pendiente: botón final deshabilitado. Confirmación del personal protegida; vencimiento visible. Movimiento breve del resumen respetando reduced-motion. Revisión360/390/768/1024/1440px y tamaño real.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Filtros de pedidos · 28 de octubre de 2026

Extensión Operate de `web/PantallaPedidos.tsx`, con identidad y filas actuales. Encima de los resultados: número exacto, estado y fechas inicial/final, Buscar y Limpiar filtros. En escritorio una fila; en móvil dos columnas con acciones debajo. Etiquetas visibles, controles nativos de 48px y foco coral. Las fechas incluyen días completos en Hermosillo. Aplicación explícita al enviar el formulario; filtros combinables en servidor antes de paginar, reinicio en primera página y recuperación de errores sin borrar los campos. Vacío filtrado explica cómo recuperar resultados. No hay nuevos estados, métricas, imágenes ni cambios de permisos. Revisión móvil, escritorio y ancho real del usuario. Se conserva DESIGN.md al reutilizar sus controles y tokens.

## Ampliación del personal · 21 de octubre de 2026

Extensión Operate dentro de la identidad vigente. El plan aprobado incorpora alta/edición de productos, carga de una fotografía, ajustes atómicos de existencias y lista de pedidos de 20 registros. El catálogo del personal ofrece Nuevo producto y Pedidos; el detalle ofrece Editar producto. Formulario con ficha y variantes a la izquierda y fotografía a la derecha en escritorio; una columna en móvil. Ajustar existencias es una acción separada de guardar ficha, con resultado explícito por variante. La lista de pedidos usa filas alineadas con número, cliente, fecha, estado y total; cada pedido abre el detalle existente. Sin nuevas métricas, paneles de administración ni otra identidad visual. Las fotografías generadas de demo se identifican como ilustrativas. Se mantienen los anchos de revisión 360/390/768/1024/1440px y la protección del acceso del personal.


## Registro público y rojo coral · 26 de octubre de 2026

Cambio explícito aprobado: sustituir rosa por acento rojo coral #ff5264, hover/foco #ff7d88, marca #ffb0b4, sin cambiar composición, tipografía, fondos o imágenes. THESIS actual: preparar selección local, registrar al abrir WhatsApp y confirmar mediante personal. OWN-WORLD conserva la tienda oscura con controles rectos y verde de WhatsApp; el rojo sustituye al rosa. STORY actual: catálogo → selección sin contacto → vista previa sin escrituras → Registrar pedido y abrir WhatsApp → número, estado y plazo. El mensaje se envía manualmente. FORM: reintentos recuperan el mismo folio; cambiar artículos inicia otra solicitud. Los pedidos web no tienen datos de cliente ni correo. El personal conserva nombre/teléfono, puede confirmar sin pago/reserva/descuento de stock y ve el vencimiento de 120 horas. Solo los nuevos públicos pendientes vencen y se borran por Cron; se preserva el historial anterior. Número comercial sin configurar: botón deshabilitado. Mismos anchos 360/390/768/1024/1440 y revisión de tamaño real.
