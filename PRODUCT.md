# GaboStore

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React y TypeScript elegidos por el usuario. Supabase/PostgreSQL y los repositorios TypeScript existentes conservan la persistencia. El usuario eligió construir directamente con código.

## Users

El cliente consulta un catálogo público de solo lectura. El administrador o empleado registra pedidos recibidos por WhatsApp desde la tienda o bodega.

## Product Purpose

Consultar artículos y preparar un pedido con sus variantes, cantidades, precios y datos de contacto. El éxito de este alcance es completar catálogo, detalle, carrito y confirmación, dejando el pedido íntegro en Supabase.

## Operating Context

WhatsApp continúa fuera del sistema. No hay cuentas de clientes ni checkout público. La interfaz debe funcionar en computadoras y teléfonos. Esta entrega se prueba localmente; la publicación en Cloudflare/Supabase se mantiene como decisión de despliegue y no se realiza automáticamente.

## Capabilities and Constraints

- El público consulta disponibilidad y variantes agotadas de artículos con alguna existencia.
- Solo personal autenticado puede crear o modificar carritos y generar pedidos.
- Se conservan los tres controles del diagrama lógico: ControlCatalogo, ControlCarrito y ControlGeneracionPedido.
- Se usa un carrito nuevo por pedido. Cabecera y detalle se guardan en una sola transacción.
- Las cantidades son enteras positivas. Los precios se obtienen desde los datos del servidor; no se aceptan precios del navegador.
- Un pedido pendiente no registra un pago ni descuenta existencias.
- Los productos sobre pedido requieren confirmación manual del proveedor por el personal antes de generar el pedido. El catálogo público no muestra su precio.
- Los cinco estados del último dominio aprobado se conservan. Pagos, anticipos, ventas, apartados, envíos, devoluciones y administración del catálogo quedan fuera de este flujo básico.

## Brand Commitments

Nombre GaboStore. Interfaz sencilla, en español y orientada a completar la tarea.

## Evidence on Hand

Documento de visión y diagramas aportados por el usuario. Repositorios y migraciones existentes. Proyecto Supabase GaboStore y registros ficticios identificados como DEMO. No se aportaron logotipo ni fotografías comerciales definitivas.

## Product Principles

- Separar presentación, negocio y datos.
- Conservar el historial y los precios de cada pedido.
- Mostrar el resultado real de cada operación y permitir corregir errores sin perder el carrito.
- No presentar un pedido pendiente como una venta pagada.
