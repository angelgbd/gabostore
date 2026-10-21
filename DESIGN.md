---
name: "GaboStore"
description: "Catálogo oscuro con selección rosa y consulta por WhatsApp."
colors:
  fondo: "#0d1214"
  superficie: "#151c20"
  tinta: "#e9f0f2"
  secundario: "#afbec6"
  rosa: "#ff4297"
  rosa-hover: "#ff72b1"
  verde: "#22d974"
  suave: "#1d282d"
  linea: "#334149"
  error: "#ff8d96"
  error-fondo: "#32191f"
  foco: "#ff72b1"
  cabecera: "#0a0e10"
  marca: "#f4aac8"
  seleccion: "#351626"
  foto-fondo: "#202b30"
  foto-alterno: "#251820"
  foto-iniciales: "#82949d"
  foto-linea: "#425159"
  etiqueta-linea: "#843253"
  whatsapp-tinta: "#07140c"
  whatsapp-hover: "#58e995"
  mensaje-fondo: "#102219"
  mensaje-linea: "#246d43"
  mensaje-tinta: "#c4e7d3"
typography:
  headline:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  headline-mobile:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  catalog-title:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.4
  card-title:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  body-mobile:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.65
    letterSpacing: "0.05em"
  action:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: "0.025em"
  field:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.65
    letterSpacing: "normal"
  category:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.65
    letterSpacing: "normal"
  navigation:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.65
  meta:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.65
  tag:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.65
  price:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.65
  detail-price:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.65
  total:
    fontFamily: "\"Roboto Mono\", monospace"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.65
  brand:
    fontFamily: "\"Public Sans\", sans-serif"
    fontSize: "30px"
    fontWeight: 800
    letterSpacing: "-1px"
rounded:
  none: "0px"
  counter: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  row: "14px"
  lg: "16px"
  control: "18px"
  section: "20px"
  form: "22px"
  panel: "24px"
  block: "28px"
  shell: "32px"
  spacious: "40px"
  detail: "48px"
components:
  button-primary:
    backgroundColor: "{colors.rosa}"
    textColor: "{colors.fondo}"
    rounded: "{rounded.none}"
    padding: "13px 18px"
    typography: "{typography.action}"
  button-primary-hover:
    backgroundColor: "{colors.rosa-hover}"
  button-secondary:
    backgroundColor: "{colors.suave}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "13px 18px"
    typography: "{typography.action}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.secundario}"
    rounded: "{rounded.none}"
    padding: "0"
  button-whatsapp:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.whatsapp-tinta}"
    rounded: "{rounded.none}"
    padding: "13px 18px"
    typography: "{typography.action}"
  button-whatsapp-hover:
    backgroundColor: "{colors.whatsapp-hover}"
  field:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "48px"
    typography: "{typography.field}"
  navigation:
    backgroundColor: "{colors.cabecera}"
    textColor: "{colors.secundario}"
    typography: "{typography.navigation}"
  category:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.secundario}"
    rounded: "{rounded.none}"
    padding: "9px 14px"
    typography: "{typography.category}"
  category-active:
    backgroundColor: "{colors.seleccion}"
    textColor: "{colors.rosa}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.rosa}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
    typography: "{typography.tag}"
  tag-neutral:
    textColor: "{colors.secundario}"
    padding: "0"
  product-card:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
  quantity-control:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.rosa}"
    rounded: "{rounded.none}"
  variant:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  variant-selected:
    backgroundColor: "{colors.seleccion}"
    textColor: "{colors.rosa}"
  order-summary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "22px"
  message-preview:
    backgroundColor: "{colors.mensaje-fondo}"
    textColor: "{colors.mensaje-tinta}"
    rounded: "{rounded.none}"
    padding: "24px"
---

# Design System: GaboStore

## Overview

**Creative North Star: "Catálogo oscuro de Gabo Store"**

El catálogo oscuro reúne la identidad de las seis referencias aprobadas: lienzo casi negro, paneles carbón, bordes finos, selección rosa y marca rosada de dos líneas con camiseta. Es una interfaz directa, compacta y en español; los artículos, las variantes y los importes se comparan dentro de una estructura repetida.

Roboto Mono local sostiene la lectura y los controles; Public Sans local pertenece al logotipo SVG. El rosa señala selección, navegación activa, importes y avance. El verde identifica la preparación del mensaje de WhatsApp y las confirmaciones correctas. Las fotografías comerciales se muestran cuando existen; las imágenes de demo aprobadas se identifican como ilustrativas. Cuando una imagen falta o falla, un bloque de iniciales conserva el lugar del artículo.

**Key Characteristics:**

- Negro y carbón con contornos finos, sin sombras de panel.
- Roboto Mono en la interfaz y Public Sans únicamente en la marca.
- Rosa en selección, importes y acciones; verde en WhatsApp y confirmación.
- Tarjetas de producto con imagen o iniciales, adaptadas a dos, tres o cuatro columnas.
- Controles rectos, foco visible y movimiento breve compatible con movimiento reducido.

La fuente normativa de los valores es web/styles.css; el logotipo y los iconos proceden de web/Icono.tsx. Se contrastaron los componentes de catálogo, detalle, solicitud, mensaje y resumen con PRODUCT.md y el contrato de superficie. La ampliación del personal se contrastó con web/App.tsx, web/PantallaProducto.tsx, web/PantallaPedidos.tsx, web/componentes.tsx y las capturas de alta y pedidos de .impeccable/review/ampliacion/. Conserva los tokens y las decisiones de identidad existentes.

## Colors

Los valores del frontmatter conservan los hexadecimales implementados. Las rampas del sidecar son muestras sintéticas para inspección; no amplían la paleta de la interfaz.

### Primary

Rosa intenso identifica botones principales, precios, totales, enlaces, contador y selección. Rosa de respuesta aclara el hover del botón principal y coincide con el foco de teclado. El rosa suave de la marca conserva su función de identidad. El vino de selección se comparte entre categorías y variantes seleccionadas.

**The Rosa de selección Rule.** Selección, importes y acciones principales comparten el rosa. El estado seleccionado combina texto y borde rosa con fondo vino.

### Secondary

Verde WhatsApp distingue generar y abrir el mensaje, y también aparece en confirmaciones correctas. El botón verde tiene tinta oscura y una respuesta más clara al hover. La vista previa utiliza su propio fondo verde oscuro, borde verde y texto verde claro; no convierte el resto del catálogo en una superficie verde.

### Tertiary

Error y fondo de error forman la pareja reservada para avisos de validación y fallos. Los errores de línea conservan texto explícito además del color.

### Neutral

El lienzo casi negro, la cabecera más oscura, los paneles carbón y el carbón suave forman las capas. Tinta clara sostiene la lectura; gris de apoyo distingue categorías, variantes, disponibilidad y notas. Línea carbón delimita campos, tarjetas y secciones. Los bloques de iniciales alternan carbón azulado y vino oscuro en el catálogo; su texto y contorno tienen grises propios.

## Typography

**Display Font:** Roboto Mono, con respaldo monospace. No existe un rol de hero independiente.
**Body Font:** Roboto Mono, con respaldo monospace.
**Brand Font:** Public Sans, con respaldo sans-serif, dentro del SVG de la marca.

Ambas familias se sirven como WOFF2 locales con licencias OFL y font-display swap. Roboto Mono cubre pesos (400–700) y Public Sans (400–800). La marca usa letras en dos líneas y camiseta; su tamaño tipográfico pertenece al sistema de coordenadas del SVG, no a los títulos de página.

### Hierarchy

- **Headline:** títulos de página y detalle; los encabezados van en mayúsculas, peso (700), interlineado (1.4) y pueden partir palabras largas. La solicitud usa (20px). El detalle móvil baja a (19px); el encabezado de mensaje usa (26px), o (23px) en teléfono.
- **Catalog title / Title / Card title:** el catálogo usa su título compacto y baja a (16px) en teléfono. Los encabezados de sección usan title; el nombre de tarjeta baja a (13px) en teléfono.
- **Body / Field:** lectura general y campos, respectivamente. El campo etiquetado conserva peso (600), mientras que su placeholder usa (400). El cuerpo baja a body-mobile hasta el corte de teléfono. Los párrafos conservan un máximo de (70ch).
- **Label / Action / Navigation:** etiquetas y controles en mayúsculas. Las categorías usan (12px), peso (600) y espaciado normal; los botones usan action. El enlace del personal baja a (10px) en teléfono.
- **Meta / Tag:** contexto, disponibilidad y estados. Los metadatos de tarjeta bajan a (10px) en teléfono; Demo usa (10px), peso (400), sin contorno.
- **Price / Detail price / Total:** importes rosa con cifras tabulares. En teléfono, el precio de tarjeta pasa a (14px), el de detalle a (20px) y el total a (19px).

**The Una interfaz monoespaciada Rule.** Roboto Mono sostiene títulos, texto, controles e importes; Public Sans se reserva para la marca. Precios, cantidades y totales usan cifras tabulares.

## Layout

El marco y el interior de cabecera se centran hasta (1280px). El contenido usa relleno (32px 24px 64px); la cabecera usa (12px 24px), altura mínima (92px) y permanece arriba durante el desplazamiento.

El catálogo tiene dos columnas de tarjetas desde el ancho móvil, tres desde (900px) y cuatro desde (1200px), con espacio (20px). La búsqueda ocupa el ancho disponible. Las categorías forman una fila desplazable horizontalmente, con espacio (8px) y divisor inferior; no fuerzan un salto de línea. La tarjeta reserva una imagen vertical (4:5) encima de la información.

El detalle de escritorio tiene dos columnas iguales separadas (48px), con imagen cuadrada y selección a la derecha. La solicitud pública reserva (360px) para importes y contacto, con espacio (40px). El carrito del personal reserva (320px), con espacio (36px). El resumen del personal usa (280px) cuando acompaña al catálogo y conserva dos columnas de tarjetas; los resúmenes laterales permanecen a (116px) del borde superior.

- Hasta (1024px), la columna de solicitud baja a (320px), con espacio (28px); el resumen del personal baja a (260px), con espacio (24px).
- Hasta (899px), detalle, solicitud, carrito y resumen del personal se apilan. El detalle se limita a (680px), con espacio (28px). Su acción de añadir queda fija al borde inferior, incluye el área segura del dispositivo y reserva (90px) de espacio para el contenido. Los resúmenes dejan de ser sticky.
- Hasta (560px), el marco usa (24px 16px 40px), la cabecera (10px 16px) y altura mínima (76px). La marca pasa de (176 × 64px) a (132 × 48px). Se ocultan el enlace redundante al catálogo y la etiqueta de sesión. Las tarjetas mantienen dos columnas, espacio (12px) y relleno de información (12px), frente a (18px) en escritorio.
- Las líneas de solicitud utilizan miniaturas (3:4), de (88px) de ancho en escritorio y (64px) en teléfono; el importe baja debajo de la descripción cuando corresponde.

Acceso y nuevo pedido conservan máximos de (440px) y (520px). La pantalla del mensaje centra un bloque de hasta (760px). Los nombres y contactos largos se parten; los grupos de variantes y las acciones permiten envolver cuando hace falta.

El editor de producto se limita a (1100px), con ficha y variantes en una columna fluida y fotografía en una columna de (300px); separa columnas (48px) y filas (36px). Hasta (899px), la fotografía ocupa (240px) y el espacio baja a (28px). Hasta (640px), ficha y fotografía se apilan, la vista previa conserva un máximo de (240px) y las acciones pueden envolver y compartir el ancho. Los campos de la ficha mantienen dos columnas con espacio (22px); el nombre ocupa ambas.

Los ajustes de existencias forman una sección separada debajo del editor. Cada fila alinea variante, acción, unidades y aplicación; hasta (640px), la variante y el botón ocupan filas completas y los dos campos comparten una fila. La lista de pedidos alinea número, cliente, fecha, estado y total en cinco columnas. Hasta (1024px) compacta columnas y espacios; hasta (767px) oculta la cabecera y reorganiza cada fila en dos columnas: número y total arriba, cliente a todo el ancho, fecha y estado debajo. La paginación puede envolver.

## Elevation & Depth

La profundidad procede de fondos opacos y bordes de (1px). No hay box-shadow en paneles, tarjetas ni controles. La única sombra es el halo difuso rosado del logotipo, aplicado mediante drop-shadow; pertenece a la marca y no establece una elevación para las superficies.

**The Panel plano Rule.** Paneles, tarjetas y campos se separan con carbón y contornos finos. El halo difuso se conserva únicamente en la marca.

El resumen del personal anima su contenido de opacidad (0.72) a (1) durante (180ms), con curva cubic-bezier(.16,1,.3,1). No hay transición decorativa en los controles. La preferencia de movimiento reducido desactiva animaciones y transiciones.

## Shapes

Botones, campos, categorías, variantes y paneles son rectangulares, con radio none. La excepción circular es el contador del carrito, con radio counter. Las imágenes se recortan sin redondear; los bloques sin fotografía usan iniciales y un rectángulo fino inclinado. La miniatura de solicitud omite ese rectángulo interior.

Los iconos son SVG de trazo y color heredado, con extremos y uniones redondos. El tamaño habitual es (20px), con variantes según su función. La marca es SVG con texto y camiseta, no un raster comercial.

## Components

### Buttons

Controles rectos y compactos, con altura mínima (48px), relleno del frontmatter y mayúsculas. El principal es rosa con tinta del lienzo; el secundario usa carbón suave, tinta clara y borde. El secundario aclara su borde al hover. El botón de texto usa gris de apoyo, altura mínima (36px), sin relleno; al hover pasa a rosa y se subraya. WhatsApp utiliza la pareja verde y tinta oscura.

El foco de teclado usa contorno (2px), separado (4px). Los botones deshabilitados conservan opacidad (0.45) y cursor not-allowed. Las acciones que ocupan el ancho disponible mantienen el mismo lenguaje.

### Categories and Tags

Las categorías son botones con borde completo, altura mínima (44px) y estado aria-pressed. Hover y selección usan rosa; la selección añade fondo vino. Su fila puede desplazarse horizontalmente.

Sobre pedido y las categorías del detalle utilizan una etiqueta de contorno vino, texto rosa y relleno del frontmatter. Demo es una variante neutral sin borde ni relleno. Son información de estado, no botones.

### Product Cards

Cada tarjeta es un enlace completo de borde fino, fondo carbón y disposición vertical. Imagen o iniciales arriba; nombre, categoría, tallas, precio y disponibilidad debajo. El hover cambia el borde a rosa. El pie se desplaza al fondo de la tarjeta y puede envolver. La imagen ocupa el bloque mediante object-fit cover; en el detalle cuadrado utiliza object-fit contain para mostrarla completa. Una ruta ausente o fallida muestra iniciales con nombre accesible.

### Product Imagery

Las imágenes de demo aprobadas llevan «Imagen ilustrativa» en la esquina inferior izquierda, con fondo del lienzo, texto secundario y relleno compacto. El texto alternativo también identifica su condición de demo. La marca visual se omite en la miniatura de solicitud; las fotografías reales cargadas por el personal no reciben esa etiqueta. Esta distinción conserva el carácter comercial de una foto real sin presentar una ilustración como prueba de mercancía disponible.

La entrega actual utiliza tres imágenes nativas de imagegen para cuatro productos semilla; los dos artículos Camisa comparten una imagen. Sus originales PNG, derivados WebP y prompts se conservan en assets/productos-demo/, con procedencia central en assets/productos-demo/procedencia.json y metadatos junto a cada derivado. Esta autorización corresponde a esas imágenes identificadas; no autoriza inventar mercancía ni afirmaciones comerciales.

### Inputs and Variants

Campos y selectores comparten altura (48px), borde fino, fondo carbón y esquinas rectas. El cursor de texto es rosa y el placeholder usa gris de apoyo. La búsqueda incluye un SVG y relleno izquierdo (44px); su etiqueta permanece accesible. Los demás campos conservan etiquetas visibles.

Las variantes son radios dentro de rectángulos de al menos (48 × 44px), reducidos a (44px) de ancho mínimo en teléfono. Seleccionadas usan el mismo vino y rosa que las categorías. El foco rodea la opción; las agotadas que no pueden elegirse quedan deshabilitadas y tachadas.

El control de cantidad es un grupo con botones SVG y campo de (44 × 44px). El borde y el foco engloban el conjunto; el foco del grupo se separa (3px). En las líneas del carrito del personal, los anchos bajan a (36px) para botones y (34px) para el campo en teléfono.

### Product Editor and Stock Adjustments

Alta y edición comparten campos de ficha con etiquetas visibles, controles rectos y fotografía opcional. El alta añade filas de talla o medida y existencia inicial, con acción para añadir o quitar variantes; conserva al menos una. La fotografía presenta vista previa, selector nativo y nombre de archivo que puede partirse. Admite JPEG, PNG o WebP de hasta (5 MiB); una selección inválida muestra un error explícito. Guardar y cancelar aparecen después de un divisor que abarca ambas columnas. Durante la carga o el guardado, el estado se comunica con texto y los controles quedan deshabilitados.

La edición muestra existencias actuales por variante en una sección propia, separada del guardado de ficha por espacio y divisor. Cada fila reúne Añadir/Retirar, unidades y «Aplicar ajuste» como acción secundaria. El resultado o error aparece en esa misma fila y la cantidad actual se actualiza al aplicar. La nota «Cada ajuste se guarda al aplicarlo» hace explícita su independencia de «Guardar cambios»; los ajustes no modifican pedidos anteriores.

### Order List

Los pedidos son filas enlazadas con divisores finos, sin convertir cada registro en una tarjeta. Número rosa, cliente con salto de texto largo, fecha secundaria, estado de contorno e importe con cifras tabulares mantienen la lectura por columnas; el importe se alinea a la derecha. La fila tiene altura mínima (88px), relleno (24px 20px) y fondo carbón al hover; conserva el foco visible compartido. En teléfono usa relleno (20px 0) y el orden descrito en Layout.

La lista presenta hasta (20) registros por página, del más reciente al más antiguo. Anterior, rango visible y Siguiente cierran la lista; los botones de los límites quedan deshabilitados. Cada fila abre el detalle existente. Los estados de carga, error con reintento y lista vacía siguen los mensajes y acciones del sistema.

### Navigation

La cabecera sticky reúne marca, catálogo, carrito con contador y acceso del personal. La página actual y el hover usan rosa. El carrito es un control de borde fino y el contador se superpone en la esquina superior derecha. En teléfono se conservan marca, carrito y acceso o salida; el carrito baja a (40 × 40px).

### Request, Summary and Message

Las líneas de solicitud son paneles de borde completo con miniatura, descripción, cantidad, eliminación e importe. El resumen público utiliza divisores para importes y contacto; el del personal es un panel carbón con relleno. Los totales son rosa y se alinean a la derecha.

La preparación de WhatsApp emplea una marca de confirmación verde dentro de un cuadrado de borde fino y una vista previa verde oscura. El mensaje conserva saltos de línea, interlineado (1.85) y puede partir texto largo. La acción de abrir WhatsApp aparece deshabilitada cuando no puede abrirse; la nota explica el motivo.

### Messages and Empty States

Los avisos usan carbón suave y texto claro; los errores, su pareja dedicada. Los estados vacíos se alinean al contenido y ofrecen la acción de recuperación que corresponda. Los mensajes mantienen roles status o alert y comunican el resultado con texto.

## Do's and Don'ts

### Do:

- **Do** conservar negro, carbón y bordes finos como base de las superficies.
- **Do** mantener Roboto Mono en la interfaz y Public Sans en el logotipo SVG.
- **Do** compartir rosa entre selección, importes y acciones principales.
- **Do** distinguir las acciones de WhatsApp con verde y texto oscuro.
- **Do** mantener dos columnas de catálogo en móvil y las ampliaciones de tres y cuatro columnas documentadas.
- **Do** conservar foco visible, etiquetas accesibles, cifras tabulares y movimiento reducido.
- **Do** mostrar fotografías reales, imágenes de demo aprobadas e identificadas, o el bloque de iniciales cuando no estén disponibles.
- **Do** conservar la etiqueta «Imagen ilustrativa», el texto alternativo y la procedencia de las imágenes demo; las fotografías reales del personal no llevan esa etiqueta.
- **Do** separar el guardado de ficha de los ajustes de existencias y mostrar el resultado junto a la variante afectada.
- **Do** mantener número, cliente, fecha, estado y total en las filas de pedidos, reorganizados según el ancho disponible.

### Don't:

- **Don't** restaurar la identidad anterior de fondo blanco, acciones verde profundo y filas abiertas.
- **Don't** redondear tarjetas, campos o botones; el círculo pertenece al contador.
- **Don't** extender el halo de la marca a paneles, tarjetas o controles.
- **Don't** fabricar mercancía ni afirmaciones comerciales, ni presentar imágenes ilustrativas de demo como fotografías comerciales reales.
- **Don't** presentar la solicitud o la vista previa como un mensaje enviado, un pedido registrado o un pago.
