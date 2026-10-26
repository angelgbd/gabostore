# GaboStore

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React y TypeScript elegidos por el usuario. Supabase/PostgreSQL y los repositorios TypeScript existentes conservan la persistencia. El usuario eligió construir directamente con código.

## Users

El cliente consulta el catálogo, prepara una selección local y registra un pedido pendiente al abrir WhatsApp. El personal registra pedidos propios y confirma los pedidos recibidos.

## Product Purpose

Consultar artículos y preparar una solicitud con variantes, cantidades, precios estimados. El público completa catálogo, detalle, carrito y mensaje de WhatsApp. El público se identifica por el número de pedido, sin datos de contacto; el personal conserva nombre y teléfono.

## Operating Context

WhatsApp se abre mediante un enlace con texto precargado, enviado manualmente por el cliente. No hay cuentas de clientes, pagos ni checkout público. La vista previa vive en la pestaña y no escribe en Supabase. Registrar pedido y abrir WhatsApp persiste cabecera y detalles, con reintentos sin duplicados. El número comercial es configurable; mientras falte, la vista previa funciona y la apertura queda deshabilitada. La interfaz funciona en computadoras y teléfonos. Esta entrega es local; no publica en Cloudflare/Supabase.

## Capabilities and Constraints

- El público consulta disponibilidad y variantes agotadas de artículos con alguna existencia.
- El carrito público permanece en sessionStorage hasta registrarse mediante el backend. Solo el personal puede consultar los pedidos privados y modificar productos o carritos internos.
- Se conservan los tres controles del diagrama lógico: ControlCatalogo, ControlCarrito y ControlGeneracionPedido.
- Se usa un carrito nuevo por pedido. Cabecera y detalle se guardan en una sola transacción.
- Las cantidades son enteras positivas. Los precios se obtienen desde los datos del servidor; no se aceptan precios del navegador.
- Un pedido pendiente no registra un pago ni descuenta existencias.
- El catálogo público oculta precios sobre pedido. Un pedido público puede quedar pendiente; el personal debe confirmar disponibilidad del proveedor para pasarlo a CONFIRMADO. El registro interno conserva su comprobación previa.
- El personal puede dar de alta artículos con variantes, editar su ficha, subir una fotografía y ajustar existencias; también consulta los pedidos registrados. No elimina artículos o variantes y confirma pendientes desde su detalle.
- Los cinco estados del último dominio aprobado se conservan. Pagos, anticipos, ventas, apartados, envíos, devoluciones y administración de cuentas quedan fuera de este flujo básico.

## Brand Commitments

Nombre GaboStore. Interfaz en español basada en las seis referencias móviles aprobadas por el usuario el 20 de octubre de 2026: negro, paneles oscuros, rojo coral #ff5264, tipografía Roboto Mono y marca roja clara #ffb0b4 de dos líneas con camiseta. Verde para la preparación del mensaje de WhatsApp. Adaptar el mismo estilo a escritorio.

## Evidence on Hand

Documento de visión y diagramas aportados por el usuario. Repositorios y migraciones existentes. Proyecto Supabase GaboStore y registros ficticios identificados como DEMO. Tres imágenes generadas con imagegen, aprobadas como ilustrativas para los cuatro artículos actuales; no representan fotografías comerciales definitivas. Las nuevas fotografías del personal se cargan en Supabase Storage.

## Product Principles

- Separar presentación, negocio y datos.
- Conservar precios e historial, excepto los nuevos públicos que sigan pendientes al vencer sus 120 horas.
- La limpieza privada de Supabase Cron elimina esos pedidos y sus carritos cada minuto; el historial anterior y del personal queda excluido.
- No pedir correo de contacto; conservar solo sus valores históricos opcionales. El correo de acceso del personal sigue vigente.
- Mostrar el resultado real de cada operación y permitir corregir errores sin perder el carrito.
- No presentar un pedido pendiente como una venta pagada.
