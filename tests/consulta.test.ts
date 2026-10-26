import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerSolicitud, seleccionarConsulta, resumirConsulta, generarMensajeConsulta, numeroWhatsApp, enlaceWhatsApp } from '../src/negocio/SolicitudConsulta.js';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
const articulo: ArticuloCatalogo = { id: 1, nombre: 'Playera', categoria: 'Ropa', precioBase: 169.9, fotografia: '', sobrePedido: false, existenciaTotal: 5, variantes: [{ id: 2, tallaMedida: 'M', existencia: 5 }, { id: 3, tallaMedida: 'L', existencia: 0 }] };
test('restaura selección sin correo sin confiar en precios almacenados, y tolera datos dañados', () => {
  assert.deepEqual(leerSolicitud('{roto'), { items: [] });
  assert.deepEqual(leerSolicitud(JSON.stringify({items: [], correoContacto: 'legado@example.com'})), {items: []});
  assert.deepEqual(leerSolicitud(JSON.stringify({ items: [{ articuloId: 1, varianteId: 2, cantidad: 1, precio: 0 }, { articuloId: 1, varianteId: 2, cantidad: 2 }, { articuloId: 1, varianteId: 3, cantidad: -1 }] })), { items: [{ articuloId: 1, varianteId: 2, cantidad: 3 }] });
});
test('acumula variantes y rechaza agotadas, cantidades inválidas y exceso de existencia', () => {
  const items = seleccionarConsulta([], articulo, 2, 2);
  assert.equal(seleccionarConsulta(items, articulo, 2, 1)[0]?.cantidad, 3);
  for (const cantidad of [0, -1, 1.2, Infinity, 6]) assert.throws(() => seleccionarConsulta([], articulo, 2, cantidad));
  assert.throws(() => seleccionarConsulta([], articulo, 3, 1));
});
test('resuelve precios actuales en centavos y detecta cambios de existencia o variantes retiradas', () => {
  const items = [{ articuloId: 1, varianteId: 2, cantidad: 3 }];
  assert.equal(resumirConsulta(items, [articulo]).subtotal, 509.7);
  assert.equal(resumirConsulta(items, [{ ...articulo, precioBase: 200 }]).subtotal, 600);
  assert.equal(resumirConsulta(items, [{ ...articulo, variantes: [{ id: 2, tallaMedida: 'M', existencia: 1 }] }]).problemas.length, 1);
  assert.equal(resumirConsulta(items, []).problemas.length, 1);
});
test('un artículo sobre pedido nunca revela precio público ni se suma como precio cero', () => {
  const especial = { ...articulo, sobrePedido: true, precioBase: 999, variantes: [{ id: 2, tallaMedida: 'M', existencia: 0 }] };
  const solicitud = { items: seleccionarConsulta([], especial, 2, 1) };
  const resumen = resumirConsulta(solicitud.items, [especial]);
  const mensaje = generarMensajeConsulta(solicitud, resumen);
  assert.equal(resumen.parcial, true); assert.equal(resumen.items[0]?.precioUnitario, null);
  assert.match(mensaje, /Total parcial estimado/); assert.match(mensaje, /Precio y disponibilidad por confirmar/); assert.doesNotMatch(mensaje, /999/);
});
test('valida carrito vacío y problemas antes de generar el texto', () => {
  const items = [{ articuloId: 1, varianteId: 2, cantidad: 1 }];
  assert.throws(() => generarMensajeConsulta({ items: [] }, resumirConsulta([], [])));
  assert.throws(() => generarMensajeConsulta({ items }, resumirConsulta(items, [])));
});
test('WhatsApp solo usa un destino válido y codifica el mensaje sin enviarlo', () => {
  for (const numero of [undefined, '', '123', 'abc', '0000000000', '52 662 1234567']) assert.equal(numeroWhatsApp(numero), null);
  assert.equal(numeroWhatsApp('+526621234567'), '526621234567');
  assert.equal(enlaceWhatsApp(null, 'hola'), null);
  const mensaje = 'Hola\nTalla M & L · $169.90';
  const url = new URL(enlaceWhatsApp('526621234567', mensaje)!);
  assert.equal(url.host, 'wa.me'); assert.equal(url.searchParams.get('text'), mensaje);
});
