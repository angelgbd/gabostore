---
version: 1
slug: "web-app-tsx"
primary_target: "web/App.tsx"
related_targets: ["web/styles.css"]
---

# Flujo básico

Modo Operate. Cuatro pantallas públicas: catálogo, detalle, solicitud local y mensaje de WhatsApp. El personal conserva su registro de pedidos. React/TypeScript; implementación directa con código y referencias fijadas por el usuario.

## Direction contract

THESIS: Catálogo oscuro de Gabo Store. El producto encabeza la consulta y el mensaje es el puente al negocio; no se confunde una solicitud con un pedido registrado.

OWN-WORLD: Referencias visuales del usuario de 20/10/2026: negro, paneles carbón, bordes finos, rosa intenso, Roboto Mono y logotipo rosado de dos líneas con camiseta. Acciones de WhatsApp verdes. Sin fotografías inventadas; las ausencias usan iniciales. Controles rectos y tamaños adaptados a lectura y tacto.

STORY: Buscar o filtrar, elegir variante/cantidad, revisar solicitud y correo, generar vista previa y abrir WhatsApp cuando se configure el destino. Envío manual; no hay escrituras públicas a Supabase. El personal mantiene su flujo protegido de pedido pendiente.

FIRST VIEWPORT: Marca de dos líneas, carrito con contador rosa, búsqueda oscura y categorías de borde fino con selección rosa. Dos columnas de tarjetas de producto en móvil, tres desde 900px y cuatro desde 1200px, marco máximo1280px. Imagen o iniciales arriba, nombre/variante/precio debajo. Detalle móvil apilado y acción inferior fija con espacio reservado; en escritorio imagen y selección en columnas. Carrito de consulta con miniaturas y resumen/contacto lateral en escritorio. Mensaje centrado con vista previa verde.

FORM: Sustitución aprobada por el usuario a partir de seis imágenes, sin nueva propuesta creativa. Interacción: selección de talla resaltada en rosa, contador del carrito actualizado, conservación de búsqueda/categoría/posición y actualización de precios/disponibilidad antes de componer el mensaje. Movimiento breve del resumen del personal, respetando reduced-motion. Validación requerida a360/390/768/1024/1440px.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Ampliación del personal · 21 de octubre de 2026

Extensión Operate dentro de la identidad vigente. El plan aprobado incorpora alta/edición de productos, carga de una fotografía, ajustes atómicos de existencias y lista de pedidos de 20 registros. El catálogo del personal ofrece Nuevo producto y Pedidos; el detalle ofrece Editar producto. Formulario con ficha y variantes a la izquierda y fotografía a la derecha en escritorio; una columna en móvil. Ajustar existencias es una acción separada de guardar ficha, con resultado explícito por variante. La lista de pedidos usa filas alineadas con número, cliente, fecha, estado y total; cada pedido abre el detalle existente. Sin nuevas métricas, paneles de administración ni otra identidad visual. Las fotografías generadas de demo se identifican como ilustrativas. Se mantienen los anchos de revisión 360/390/768/1024/1440px y la protección del acceso del personal.
