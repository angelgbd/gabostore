import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Articulo, Carrito } from '../src/models.js';
import { ControlCarrito, type DatosCarritos } from '../src/negocio/ControlCarrito.js';
import { ErrorNegocio } from '../src/negocio/ErrorNegocio.js';

export function escenarioCarrito() {
  const articulo: Articulo = { id: 1, nombre: 'Camisa', categoria: 'Ropa', precioBase: 149.9, fotografia: '', sobrePedido: false,
    variantes: [{ id: 2, tallaMedida: 'M', existencia: 5 }] };
  const carrito: Carrito = { id: 4, clienteId: 3, correoCliente: 'ana@example.com', cerrado: false, items: [] };
  const cliente = { id: 3, nombre: 'Ana', telefono: '6621234567' };
  const escrituras: unknown[][] = [];
  const repositorio: DatosCarritos = {
    crearCliente: async contacto => { escrituras.push(['cliente', contacto]); return { id: 3, ...contacto }; },
    obtenerCliente: async () => cliente, abrir: async () => carrito, obtenerPorId: async () => structuredClone(carrito),
    guardarItem: async (_carritoId, varianteId, cantidad, precio) => {
      escrituras.push(['item', varianteId, cantidad, precio]);
      const anterior = carrito.items.find(i => i.varianteId === varianteId);
      const precioUnitario = precio ?? anterior?.precioUnitario ?? articulo.precioBase;
      carrito.items = [{ varianteId, cantidad, precioUnitario, subtotal: Math.round(cantidad * precioUnitario * 100) / 100 }];
      return carrito;
    },
    quitarItem: async () => { carrito.items = []; return carrito; },
  };
  const control = new ControlCarrito(repositorio, {
    obtenerPorId: async id => id === articulo.id ? articulo : null,
    obtenerPorVariante: async id => id === 2 ? articulo : null,
  });
  return { articulo, carrito, escrituras, control };
}

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
  await assert.rejects(f.control.crear({ nombre: 'Ana', telefono: 'abc', correoCliente: 'ana@example.com' }), /teléfono válido/);
  await assert.rejects(f.control.crear({ nombre: 'Ana', telefono: '6621234567', correoCliente: 'incorrecto' }), /correo válido/);
  assert.equal(f.escrituras.length, 0);
  await f.control.crear({ nombre: ' Ana ', telefono: '6621234567', correoCliente: 'ANA@example.com' });
  assert.deepEqual(f.escrituras[0], ['cliente', { nombre: 'Ana', telefono: '6621234567' }]);
});
