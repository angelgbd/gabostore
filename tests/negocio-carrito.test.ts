import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escenarioCarrito } from './fixtures/carrito.js';
import { ErrorNegocio } from '../src/negocio/ErrorNegocio.js';

test('agregar acumula cantidades y conserva el precio ya capturado aunque cambie el catálogo', async () => {
  const f = escenarioCarrito();
  assert.equal((await f.control.agregar(4, 1, 2, 2)).total, 299.8);
  f.articulo.precioBase = 199;
  const resumen = await f.control.agregar(4, 1, 2, 1);
  assert.equal(resumen.items[0]?.cantidad, 3);
  assert.equal(resumen.items[0]?.precioUnitario, 149.9);
  assert.equal(resumen.total, 449.7);
});

test('no se escribe si falta stock, la cantidad es inválida o la variante pertenece a otro artículo', async () => {
  const f = escenarioCarrito();
  await assert.rejects(f.control.agregar(4, 1, 2, 6), /Solo hay 5/);
  await assert.rejects(f.control.agregar(4, 1, 9, 1), /no pertenece/);
  await assert.rejects(f.control.agregar(4, 1, 2, 1.5), ErrorNegocio);
  assert.equal(f.escrituras.length, 0);
  f.carrito.cerrado = true;
  await assert.rejects(f.control.agregar(4, 1, 2, 1), /carrito ya pertenece/);
});

test('cambiar cantidad valida stock actual, quitar deja el carrito vacío y un sobre pedido admite consulta previa', async () => {
  const f = escenarioCarrito();
  await f.control.agregar(4, 1, 2, 2);
  assert.equal((await f.control.cambiarCantidad(4, 2, 1)).total, 149.9);
  await assert.rejects(f.control.cambiarCantidad(4, 2, 7), /Solo hay 5/);
  assert.equal((await f.control.quitar(4, 2)).total, 0);
  f.articulo.sobrePedido = true;
  f.articulo.variantes[0]!.existencia = 0;
  assert.equal((await f.control.agregar(4, 1, 2, 1)).items[0]?.cantidad, 1);
});

test('los datos de contacto se validan antes de crear registros', async () => {
  const f = escenarioCarrito();
  await assert.rejects(f.control.crear({ nombre: 'Ana', telefono: 'abc' }), /teléfono válido/);
  assert.equal(f.escrituras.length, 0);
  await f.control.crear({ nombre: ' Ana ', telefono: '6621234567' });
  assert.deepEqual(f.escrituras[0], ['cliente', { nombre: 'Ana', telefono: '6621234567' }]);
});
