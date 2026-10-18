---
name: "GaboStore"
description: "Mostrador de tienda: artículos, variantes y pedidos con claridad."
colors:
  fondo: "#f5f8f6"
  superficie: "#fff"
  tinta: "#19372d"
  secundario: "#536b61"
  verde: "#17624c"
  verde-hover: "#104b39"
  suave: "#edf4ef"
  linea: "#d8e3dc"
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
    fontWeight: 700
    lineHeight: 1.35
  title-compact:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
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
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.55
  total:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.55
  brand:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    lineHeight: 1.55
    letterSpacing: "-0.035em"
rounded:
  tag: "5px"
  category: "7px"
  control: "8px"
  surface: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  control: "18px"
  section: "20px"
  card: "22px"
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
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.secundario}"
    rounded: "{rounded.category}"
    padding: "7px 16px"
    typography: "{typography.note}"
  category-active:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.superficie}"
  tag:
    backgroundColor: "{colors.suave}"
    textColor: "{colors.verde}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
    typography: "{typography.tag}"
  tag-neutral:
    backgroundColor: "{colors.fondo}"
    textColor: "{colors.secundario}"
  product-card:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.surface}"
  quantity-control:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.verde}"
    rounded: "{rounded.control}"
  order-summary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: GaboStore

## Overview

**Creative North Star: "Mostrador de tienda"**

“Mostrador de tienda” organiza una interfaz de trabajo sobria, cercana y en español. El blanco, el verde profundo y los grises verdosos dejan que los artículos, las variantes y los importes se lean antes que cualquier adorno. La densidad permite comparar fichas y revisar líneas de pedido con el mismo lenguaje visual.

La implementación usa Public Sans local como voz común de títulos y controles; concreta la intención de una sans firme del contrato, cuyo texto inicial mencionaba tipografía de sistema. La profundidad se apoya en superficies opacas y divisores. Las fotografías reales ocupan su espacio cuando existen; en esta entrega la ausencia se declara con un pictograma SVG y “Sin fotografía”, sin fabricar mercancía.

**Key Characteristics:**

- Una sans local, jerarquía por tamaño y peso, e importes con cifras tabulares.
- Superficies claras opacas, contornos finos y esquinas discretas.
- Verde profundo para acciones, selección y estado; rojo reservado para errores.
- Listas de pedido y totales con continuidad visual entre preparación y confirmación.
- Movimiento breve de estado, desactivado con la preferencia de movimiento reducido.

## Colors

La paleta combina un verde profundo de trabajo con blancos y neutrales de matiz verde; los valores normativos están en el frontmatter.

Las rampas tonales del sidecar se sintetizan para visualizar cada color en el panel; no amplían la paleta aplicada.

### Primary

- **Verde de mostrador** (`verde`): acciones principales, categorías seleccionadas, enlaces y disponibilidad.
- **Verde de respuesta** (`verde-hover`): respuesta del botón principal al pasar el puntero.
- **Verde de foco** (`foco`): contorno de navegación por teclado.

### Secondary

- **Rojo de error** (`error`) y **papel de error** (`error-fondo`): texto y fondo de avisos de error. Son semánticos, no un segundo acento decorativo.

### Neutral

- **Fondo de trabajo** (`fondo`): lienzo general y etiqueta neutral.
- **Blanco de superficie** (`superficie`): cabecera, fichas, campos y paneles.
- **Tinta verde** (`tinta`): lectura principal.
- **Gris de apoyo** (`secundario`): contexto, categorías, notas, datos y disponibilidad agotada.
- **Verde lavado** (`suave`): ausencia de fotografía, etiquetas de estado y avisos informativos.
- **Línea clara** (`linea`): límites de campos, fichas, paneles y filas.

### Named Rules

**The Verde con función Rule.** El verde identifica acción, selección o estado; los textos secundarios conservan el gris verdoso y los errores usan su pareja roja.

## Typography

**Display Font:** Public Sans; respaldo system-ui y sans-serif. No hay una familia de exhibición independiente.
**Body Font:** Public Sans; archivo local `/fonts/public-sans-latin.woff2`, peso variable de 400 a 800 y `font-display: swap`.

**Character:** Una sola sans firme y abierta distingue títulos, controles e información por peso y tamaño. El cuerpo usa interlineado holgado y los párrafos se limitan a una medida de lectura de (70ch).

### Hierarchy

- **Headline:** título de página, peso (750), interlineado (1.2) y espaciado entre letras (-0.025em); se reduce en teléfono según `headline-mobile`.
- **Title:** títulos de artículo y panel, peso (700) e interlineado (1.35). La variante `title-compact` sirve al resumen y a las líneas del carrito; estas últimas se reducen a (16px) en teléfono.
- **Body:** texto principal regular, interlineado (1.55).
- **Note / Meta:** información auxiliar, contexto y filas del resumen. Las notas conservan legibilidad con el gris de apoyo.
- **Label / Tag:** etiquetas de campo y etiquetas compactas; los botones tienen peso específico (650), tamaño (14px) e interlineado heredado (1.55).
- **Price / Total:** el precio de ficha usa `price`; el total usa `total`. El precio del detalle sube a (28px), peso (700). Todos usan `font-variant-numeric: tabular-nums`.
- **Brand:** nombre textual GaboStore con `brand`; baja a (23px) en teléfono. “Store” usa el verde de mostrador.

### Named Rules

**The Una voz, cifras alineadas Rule.** Public Sans sostiene toda la interfaz. Los importes del catálogo, las líneas y el total usan cifras tabulares para mantener la comparación.

## Layout

El marco y la cabecera comparten un ancho máximo de (1280px), centrado. El contenido tiene relleno de escritorio (40px 32px 56px); la cabecera usa laterales de (32px) y altura mínima de (76px). El ritmo combina los pasos observados del frontmatter: no se fuerza una retícula de múltiplos únicos.

El catálogo usa dos columnas iguales con separación de (24px). Cuando aparece el pedido del personal, el contenedor reserva una columna de (300px) y un espacio de (32px). El resumen se mantiene visible con `position: sticky` y límite superior de (100px). Carrito y confirmación comparten una columna de datos de (320px), separación de (36px), líneas horizontales y el mismo total. La búsqueda ocupa como máximo (600px); los formularios de acceso y nuevo pedido usan máximos de (440px) y (520px).

- **Hasta (1000px):** la columna del resumen baja a (270px), el espacio a (24px) y las fichas del catálogo del personal pasan a una columna. El panel usa relleno de (20px); el detalle junto al resumen también se apila.
- **Hasta (800px):** el marco usa relleno (28px 20px 40px); resumen, carrito y confirmación se apilan y el resumen deja de ser sticky. El catálogo del personal vuelve a dos columnas; el espacio del carrito baja a (28px).
- **Hasta (560px):** el catálogo pasa a una columna con espacio de (18px), los laterales del marco son de (16px), la cabecera mide como mínimo (68px) y el detalle se apila. La navegación oculta el enlace redundante “Catálogo”; marca y carrito siguen en la cabecera fija. Los botones de cabecera usan altura mínima de (38px), relleno (8px 12px); el resto conserva sus dimensiones propias.

Los nombres y contactos largos pueden partirse; los importes permanecen juntos. Las categorías y los grupos de acciones admiten varias líneas. Las fotografías de ficha usan una proporción horizontal de (2.15), con altura mínima de (190px); en teléfono usan proporción (1.9) y mínimo de (180px). El detalle público parte de una imagen cuadrada y pasa a (1.4) en teléfono; el detalle del personal usa (1.7) hasta el corte de (1000px), incluida su vista móvil.

## Elevation & Depth

El sistema no usa sombras ni desenfoque. La cabecera y el resumen son opacos; la primera se fija arriba y el segundo acompaña el trabajo solo en escritorio. El blanco sobre el fondo de trabajo, los bordes de (1px) y los divisores de filas comunican agrupación y profundidad.

### Named Rules

**The Superficie opaca Rule.** La cabecera, las fichas y los paneles conservan fondo opaco y un borde fino. La separación se construye con tono, espacio y líneas.

## Shapes

Las superficies tienen esquinas discretas: `surface` para fichas y paneles, `control` para campos y botones, `category` para filtros y `tag` para etiquetas y contadores. Las fichas recortan la imagen dentro del contorno. Las listas de variantes y líneas de pedido permanecen abiertas, separadas por reglas horizontales en lugar de tarjetas anidadas. Los controles de cantidad se agrupan bajo un único contorno.

## Components

### Buttons

Acciones compactas, legibles y de trabajo. El principal usa verde y texto blanco; el secundario usa blanco, texto verde y borde claro; el de texto reduce relleno y altura sin añadir superficie. Los tres tienen esquinas `control`, peso (650) y separación interna de (8px) entre contenidos. Principal y secundario parten de una altura mínima de (44px); el de texto de (36px).

El principal cambia al verde de respuesta al pasar el puntero. El secundario cambia al verde lavado y marca su borde en verde. El foco global usa un contorno verde de (3px), separado (4px). Los botones deshabilitados muestran opacidad (0.6) y cursor de espera. No hay una animación añadida a los botones.

### Chips / Tags

Los filtros son rectángulos pequeños con esquinas `category`, altura mínima de (40px) y un borde fino. La selección invierte a verde con blanco, además de su estado accesible `aria-pressed`. El hover cambia el borde. Las etiquetas informativas son más compactas y usan verde lavado; “Demo” usa la variante neutral. El contador del carrito comparte ese lenguaje compacto.

### Cards / Containers

La ficha es un enlace completo: imagen o ausencia identificada, nombre y categoría, precio, disponibilidad y acceso a variantes. Usa superficie blanca, borde claro, radio `surface` y relleno de información (22px). El relleno observado pasa a (18px) hasta el corte intermedio y a (20px) en teléfono. Su hover cambia solo el borde a verde, con transición de (120ms ease-out).

Los paneles de resumen y datos conservan el mismo material. Sus rellenos son de (24px), con las reducciones adaptables descritas en Layout. No se añade sombra al hover ni al panel fijo.

### Inputs / Fields

Campos blancos de altura (46px), borde claro de (1px), radio `control` y relleno horizontal de (12px). Una etiqueta visible precede al campo; el placeholder usa gris de apoyo y peso normal. Búsqueda, selectores, contacto y acceso comparten esta forma. El foco usa el contorno global. Los errores se muestran mediante el aviso semántico, no mediante un estilo de campo rojo inventado.

El control de cantidad agrupa dos botones y el valor: altura (40px), botones de ancho (38px) e input de (54px), que se reducen a (30px) y (40px) en teléfono. El foco rodea el grupo con contorno de (3px), separado (3px); no duplica el contorno en el input interior.

### Navigation

Cabecera blanca fija, marca textual a la izquierda y enlaces a la derecha. Los enlaces usan peso (600); el hover y la clase activa usan verde. El estado de sesión y las etapas del pedido aparecen bajo la cabecera para el personal. Las etapas usan numeración, divisores y peso (700) en la actual, sin iconografía ornamental. La adaptación de teléfono conserva el acceso al carrito.

### Order Summary

El resumen mantiene el cliente, las líneas, los subtotales y el total junto al catálogo del personal. Las líneas usan texto auxiliar para variante y cantidad; los importes se alinean a la derecha y permanecen juntos. El total se separa con una línea y espacio, sin un color de fondo propio.

Solo el bloque de líneas y total responde a cambios de contenido: opacidad de (0.72) a (1), durante (180ms), con curva `cubic-bezier(.16,1,.3,1)`. No hay desplazamiento ni ocultación completa. Con `prefers-reduced-motion: reduce` se desactivan animaciones, transiciones y desplazamiento suave. La confirmación reutiliza la jerarquía de líneas y total y comunica el resultado con texto y un SVG de trazo.

### Messages / Empty States

Los avisos informativos usan verde sobre verde lavado; el error usa la pareja roja. El resultado correcto usa un SVG de confirmación y texto, con fondo lavado. Los estados vacíos centran un mensaje breve y una acción cuando procede; la carga muestra texto de estado. La ausencia de fotografía usa un SVG de imagen y una etiqueta explícita.

## Do's and Don'ts

### Do:

- **Do** conservar la jerarquía nombre, información de variante e importe, con cifras tabulares en los precios.
- **Do** mantener etiquetas visibles, foco perceptible y mensajes de estado con texto.
- **Do** usar superficies opacas y el borde de separación definido para fichas y paneles.
- **Do** conservar la adaptación de columnas y la cabecera con acceso al carrito en teléfono.
- **Do** declarar “Sin fotografía” cuando no haya una imagen válida y sustituirlo por la fotografía real cuando exista.
- **Do** respetar la preferencia de movimiento reducido en las animaciones y transiciones.

### Don't:

- **Don't** usar el color como único indicador de disponibilidad, selección o error.
- **Don't** sustituir las fotografías ausentes por imágenes de productos inventados.
- **Don't** convertir una actualización del resumen en una animación de toda la pantalla.
- **Don't** presentar la confirmación visual de un pedido pendiente como un pago.
