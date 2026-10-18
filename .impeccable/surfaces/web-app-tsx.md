---
version: 1
slug: "web-app-tsx"
primary_target: "web/App.tsx"
related_targets: ["web/styles.css"]
---

# Flujo básico

Modo Operate. El público consulta el catálogo; el personal registra pedidos. Cuatro pantallas: catálogo, detalle, carrito y confirmación. React/TypeScript, construcción directa con código elegida por el usuario.

## Direction contract

THESIS: Mostrador de tienda. El artículo y el pedido comparten el primer plano; no hay portada comercial ni promesas de venta.

OWN-WORLD: Blanco, verde profundo y gris verdoso. Tipografía de sistema firme, bordes finos, esquinas discretas, controles de trabajo y fotografías reales cuando existan. La ausencia de fotografía se identifica sin inventar productos.

STORY: Consultar disponibilidad, elegir variante y cantidad, revisar el carrito y registrar un pedido pendiente. El público puede leer; el personal autenticado puede operar.

FIRST VIEWPORT: Cabecera breve con GaboStore, catálogo y acceso del personal. Título, búsqueda y categorías encima de dos columnas de filas compactas en escritorio. Miniaturas discretas, datos alineados y filtros subrayados. El resumen aparece a la derecha cuando el personal tiene un carrito; en móvil se apila y el carrito permanece accesible en cabecera. El detalle sin fotografía usa una sola columna de información y una nota breve.

FORM: Mostrador de tienda, candidato 1 de la lista fundamentada, elección model-pick confirmada por el usuario; semilla 61217a2d. Interacción distintiva: añadir una variante actualiza el resumen sin perder la posición del catálogo; la confirmación conserva la misma jerarquía de líneas y totales. Movimiento breve de opacidad, respetando reduced-motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
