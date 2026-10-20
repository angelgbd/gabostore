# GaboStore

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React y TypeScript elegidos por el usuario. Supabase/PostgreSQL y los repositorios TypeScript existentes conservan la persistencia. El usuario eligió construir directamente con código.

## Users

El cliente consulta el catálogo y arma una solicitud temporal para enviarla manualmente por WhatsApp. El administrador o empleado registra el pedido real desde la tienda o bodega.

## Product Purpose

Consultar artículos y preparar una solicitud con variantes, cantidades, precios estimados y correo de contacto. El público completa catálogo, detalle, carrito y mensaje de WhatsApp. El personal conserva su flujo de registro del pedido íntegro en Supabase.

## Operating Context

WhatsApp se abre mediante un enlace con texto precargado, enviado manualmente por el cliente. No hay cuentas de clientes, pagos ni checkout público. La solicitud vive solo en la pestaña del navegador y no crea registros en Supabase. El número comercial es configurable; mientras falte, la vista previa funciona y la apertura queda deshabilitada. La interfaz funciona en computadoras y teléfonos. Esta entrega es local; no publica en Cloudflare/Supabase.

## Capabilities and Constraints

- El público consulta disponibilidad y variantes agotadas de artículos con alguna existencia.
- Solo personal autenticado puede crear o modificar carritos persistentes y generar pedidos. El carrito público es una solicitud independiente en sessionStorage.
- Se conservan los tres controles del diagrama lógico: ControlCatalogo, ControlCarrito y ControlGeneracionPedido.
- Se usa un carrito nuevo por pedido. Cabecera y detalle se guardan en una sola transacción.
- Las cantidades son enteras positivas. Los precios se obtienen desde los datos del servidor; no se aceptan precios del navegador.
- Un pedido pendiente no registra un pago ni descuenta existencias.
- Los productos sobre pedido requieren confirmación manual del proveedor por el personal antes de generar el pedido. El catálogo público no muestra su precio.
- Los cinco estados del último dominio aprobado se conservan. Pagos, anticipos, ventas, apartados, envíos, devoluciones y administración del catálogo quedan fuera de este flujo básico.

## Brand Commitments

Nombre GaboStore. Interfaz en español basada en las seis referencias móviles aprobadas por el usuario el 20 de octubre de 2026: negro, paneles oscuros, rosa, tipografía Roboto Mono y marca rosada de dos líneas con camiseta. Verde para la preparación del mensaje de WhatsApp. Adaptar el mismo estilo a escritorio.

## Evidence on Hand

Documento de visión y diagramas aportados por el usuario. Repositorios y migraciones existentes. Proyecto Supabase GaboStore y registros ficticios identificados como DEMO. No se aportaron logotipo ni fotografías comerciales definitivas.

## Product Principles

- Separar presentación, negocio y datos.
- Conservar el historial y los precios de cada pedido.
- Mostrar el resultado real de cada operación y permitir corregir errores sin perder el carrito.
- No presentar un pedido pendiente como una venta pagada.
