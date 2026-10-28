# GaboStore

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React y TypeScript elegidos por el usuario. Supabase/PostgreSQL y los repositorios TypeScript existentes conservan la persistencia. El usuario eligió construir directamente con código.

## Users

El cliente consulta el catálogo, prepara una selección local y registra un pedido pendiente al abrir WhatsApp. ADMIN gestiona cuentas, categorías y proveedores. ADMIN y EMPLEADO mantienen artículos, variantes, compras por lote y ventas, además de registrar y confirmar pedidos.

## Product Purpose

Consultar artículos y preparar una solicitud con variantes, cantidades, precios estimados. El público completa catálogo, detalle, carrito y mensaje de WhatsApp. El público se identifica por el número de pedido, sin datos de contacto; el personal conserva nombre y teléfono.

## Operating Context

WhatsApp se abre mediante un enlace con texto precargado, enviado manualmente por el cliente. No hay cuentas de clientes, pagos ni checkout público. La vista previa vive en la pestaña y no escribe en Supabase. Registrar pedido y abrir WhatsApp persiste cabecera y detalles, con reintentos sin duplicados. El número comercial es configurable; mientras falte, la vista previa funciona y la apertura queda deshabilitada. La interfaz funciona en computadoras y teléfonos. Esta entrega es local; no publica en Cloudflare/Supabase.

## Capabilities and Constraints

- El público consulta disponibilidad y variantes agotadas de artículos con alguna existencia.
- El carrito público permanece en sessionStorage hasta registrarse mediante el backend. Solo el personal puede consultar los pedidos privados y modificar productos o carritos internos.
- Se conservan ControlCatalogo, ControlCarrito y ControlGeneracionPedido, ampliados con controles de usuarios, maestros, compras y ventas mediante repositorios inyectados.
- Se usa un carrito nuevo por pedido. Cabecera y detalle se guardan en una sola transacción.
- Las cantidades son enteras positivas. Los precios se obtienen desde los datos del servidor; no se aceptan precios del navegador.
- Un pedido pendiente no registra un pago ni descuenta existencias.
- El catálogo público oculta precios sobre pedido. Un pedido público puede quedar pendiente; el personal debe confirmar disponibilidad del proveedor para pasarlo a CONFIRMADO. El registro interno conserva su comprobación previa.
- El personal da de alta y edita artículos, carga fotografías, gestiona variantes/recargos y aplica bajas lógicas y ajustes. Categorías y proveedores se registran y editan, se desactivan y reactivan; sus historiales se conservan. Los pedidos mantienen búsqueda y filtros y confirmación.
- Cada compra registra un lote de un proveedor, costos, cantidades y artículos nuevos opcionales, y suma existencias atómicamente. La venta directa o desde pedido confirmado exige el importe completo, obtiene precios del servidor, descuenta existencias y conserva detalle e importes inmutables. Registrar una venta no procesa cobros bancarios.
- Las cuentas usan Supabase Auth; solo ADMIN administra usuarios y no puede quitar su propio acceso. La autorización SQL verifica el rol y estado actuales de la cuenta para bloquear también JWT anteriores a una baja. Se conserva auditoría privada de operaciones, sin interfaz de bitácora.
- El Release 1 comprende CU-01,02,03,04,05,06,08 y10. Los cinco estados del pedido se conservan. Apartados, anticipos, envíos, devoluciones y reportes específicos de existencias y lotes siguen fuera de esta entrega; no hay hosting ni checkout/pagos públicos.

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
