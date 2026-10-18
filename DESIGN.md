---
name: "GaboStore"
description: "Mostrador de tienda: artículos, variantes y pedidos con claridad."
colors:
  fondo: "#fff"
  superficie: "#fff"
  tinta: "#202925"
  secundario: "#5b655f"
  verde: "#17624c"
  verde-hover: "#104b39"
  suave: "#f3f5f3"
  linea: "#dfe4e0"
  error: "#a22630"
  error-fondo: "#fff2f2"
  foco: "#287b61"
typography:
  headline:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline-mobile:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    lineHeight: 1.35
  title-compact:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  note:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.55
  action:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.55
  meta:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  tag:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.55
  price:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.55
  total:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.55
  brand:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.55
    letterSpacing: "-0.035em"
rounded:
  none: "0px"
  tag: "0px"
  category: "0px"
  control: "4px"
  surface: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  control: "18px"
  section: "20px"
  panel: "24px"
  block: "28px"
  shell: "32px"
  spacious: "40px"
components:
  button-primary:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    typography: "{typography.action}"
  button-primary-hover:
    backgroundColor: "{colors.verde-hover}"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.verde}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    typography: "{typography.action}"
  button-secondary-hover:
    backgroundColor: "{colors.suave}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.verde}"
    rounded: "{rounded.control}"
    padding: "6px 0"
    typography: "{typography.action}"
  field:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "46px"
    typography: "{typography.body}"
  navigation:
    textColor: "{colors.secundario}"
  category:
    backgroundColor: "transparent"
    textColor: "{colors.secundario}"
    rounded: "{rounded.category}"
    padding: "10px 0"
    typography: "{typography.note}"
  category-active:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.verde}"
    rounded: "{rounded.tag}"
    padding: "0"
    typography: "{typography.tag}"
  tag-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.secundario}"
  product-row:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
  quantity-control:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.verde}"
    rounded: "{rounded.control}"
  order-summary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "0 0 0 24px"
---

# Design System: GaboStore

## Overview

**Creative North Star: "Mostrador de tienda"**

“Mostrador de tienda” organiza una interfaz de trabajo sobria, cercana y en español. Los artículos, las variantes y los importes mandan; el verde profundo identifica acciones y disponibilidad sobre un fondo blanco.

Public Sans local mantiene una voz común. Las filas abiertas, los divisores finos y los controles compactos permiten comparar sin convertir cada dato en una tarjeta. Las fotografías reales se muestran cuando existen; su ausencia se indica con texto, sin reservar un bloque grande en el detalle.

**Key Characteristics:**

- Public Sans e importes con cifras tabulares.
- Filas abiertas, controles compactos y separación por espacio y líneas.
- Verde para acciones y disponibilidad; rojo para errores.
- La misma jerarquía de líneas y totales durante todo el pedido.
- Una transición breve del resumen, desactivada con movimiento reducido.

## Colors

Los valores normativos están en el frontmatter. El blanco es el lienzo y las superficies comparten su tono; la agrupación no depende de fondos de tarjeta. Las rampas del sidecar son muestras sintéticas, no colores adicionales de la interfaz.

### Primary

Verde de mostrador para acciones y disponibilidad, verde de respuesta para hover y verde de foco para teclado.

### Secondary

Rojo de error y papel de error se reservan para mensajes de error.

### Neutral

Tinta oscura para lectura, gris de apoyo para contexto, gris suave para miniaturas y avisos, y línea clara para campos y filas.

**The Verde con función Rule.** El verde identifica acción, selección o estado. La lectura principal usa tinta oscura y el contexto usa gris de apoyo.

## Typography

Public Sans local, con respaldo system-ui y sans-serif. El archivo variable cubre pesos de (400–800) con font-display swap. El cuerpo conserva interlineado (1.55) y medida máxima de (70ch).

Los títulos de página usan headline y su variante móvil; nombres y secciones usan title. El detalle destaca el precio a (24px), reducido a (22px) en teléfono. Los importes se alinean con cifras tabulares. Las etiquetas de campo, notas, metadatos y acciones conservan sus roles del frontmatter.

**The Una voz, cifras alineadas Rule.** Public Sans sostiene toda la interfaz. Los precios y totales usan cifras tabulares.

## Layout

Marco y cabecera centrados de hasta (1280px). El contenido de escritorio usa relleno (40px 32px 64px); la cabecera, laterales de (32px) y altura mínima de (68px).

El catálogo presenta dos columnas de filas compactas con separación horizontal de (40px). Cada fila combina miniatura cuadrada de (112px) e información, con espacio de (20px). La búsqueda tiene un máximo de (600px); las categorías aparecen debajo como filtros subrayados. El contador refleja los resultados visibles.

El resumen aparece cuando el personal tiene un carrito, no como panel vacío al entrar. Su columna mide (280px), con separación de (40px), y permanece sticky a (100px). El detalle con imagen conserva dos columnas. Sin imagen, usa una sola columna de hasta (680px) y una nota breve bajo la información. Carrito y confirmación reservan una columna de (300px) para cliente y total.

- Hasta (1000px), el resumen baja a (250px), el espacio a (32px) y el catálogo con resumen pasa a una columna de artículos.
- Hasta (800px), resumen y datos del pedido se apilan. Las filas usan miniaturas de (88px), espacio de (16px) y dos columnas cuando caben. Los laterales del marco bajan a (20px).
- Hasta (560px), el catálogo queda en una columna. El marco usa laterales de (16px), la cabecera mide al menos (64px) y los títulos usan headline-mobile. La marca y el carrito mantienen la navegación. El enlace redundante al catálogo y la etiqueta de sesión se ocultan.

Los nombres y contactos largos pueden partirse; los importes de las líneas permanecen juntos. Las acciones y categorías admiten varias líneas. Formularios de acceso y nuevo pedido conservan sus máximos de (440px) y (520px).

## Elevation & Depth

No hay sombras ni desenfoque. La cabecera es opaca; las filas se delimitan por abajo y los datos laterales se separan con una línea de (1px). En móvil esa separación pasa arriba. No se duplican los divisores entre la última línea y el bloque de datos.

**The Agrupar sin encerrar Rule.** El espacio y los divisores agrupan artículos y datos del pedido. No se añade un contenedor por cada dato.

## Shapes

Controles con esquinas discretas según control. Las filas, filtros y etiquetas no usan cápsulas. El radio surface se conserva en las fotografías reales del detalle; no convierte la ausencia de imagen en una tarjeta.

## Components

### Buttons

Principal verde con texto blanco, secundario blanco con contorno y acción de texto para quitar. Altura mínima de (44px), salvo el de texto de (36px). El hover oscurece el principal o subraya acciones de texto. El foco usa contorno verde de (3px), separado (4px). Disabled usa opacidad (0.55) y cursor not-allowed.

### Categories and Tags

Categorías como botones de texto con línea inferior; la activa tiene peso (650), texto oscuro y línea verde. Se conserva aria-pressed. Sobre pedido y Demo son texto compacto de estado, sin fondos de insignia.

### Product Rows

El enlace incluye miniatura, nombre, categoría, precio y disponibilidad. No tiene contorno completo, sombra ni relleno de tarjeta. El hover subraya el nombre y cambia su color. Una foto ausente ocupa solo la miniatura; en el detalle queda como nota de texto.

### Inputs and Variants

Campos de altura (46px), etiquetas visibles y borde fino. El personal con carrito selecciona la variante directamente en una lista de radios que muestra disponibilidad; no hay un selector que repita la misma lista. Las variantes agotadas se ven y se deshabilitan cuando corresponde. Cantidad y botón para añadir comparten una fila que puede envolver.

El control de cantidad del carrito conserva botones de (38px) e input de (54px), reducidos a (30px) y (40px) en teléfono. El foco rodea el grupo.

### Navigation

Marca textual y enlaces, con la página actual subrayada. El acceso público se llama Acceso del personal. La sesión del empleado se indica en la cabecera; el correo está disponible como nombre accesible y título. Las etapas numeradas se reservan para carrito y revisión. No hay un pie que repita la marca.

### Order Summary and Confirmation

Cliente, líneas y total se leen en un panel abierto, separado por una regla. Los importes se alinean a la derecha. El resumen solo anima líneas y total: opacidad de (0.72) a (1) durante (180ms), curva cubic-bezier(.16,1,.3,1). Con prefers-reduced-motion se desactivan animaciones y transiciones.

La confirmación conserva líneas, datos de contacto y total. El resultado correcto muestra un SVG de confirmación y texto, sin un bloque decorativo. La indicación de que el pedido no representa pago ni reserva permanece visible.

### Messages and Empty States

Avisos informativos sobrios y errores con su pareja roja. Estados vacíos alineados al contenido, con mensaje y acción de recuperación. La búsqueda sin resultados permite limpiar filtros. Los mensajes mantienen roles status y alert.

## Do's and Don'ts

### Do:

- **Do** mantener nombre, variante, cantidad e importe fáciles de comparar.
- **Do** conservar etiquetas visibles, foco de teclado y mensajes de estado con texto.
- **Do** usar imágenes reales y una indicación breve cuando falten.
- **Do** reservar el botón principal para avanzar en la tarea.

### Don't:

- **Don't** volver a envolver cada artículo o panel en una tarjeta.
- **Don't** usar un gran bloque de relleno cuando falte una fotografía.
- **Don't** añadir ayudas, insignias o pasos que repitan la información inmediata.
- **Don't** fabricar mercancía, fotografías ni afirmaciones comerciales.
