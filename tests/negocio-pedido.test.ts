import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pedido, PedidoNuevo } from '../src/models.js';
import { ControlGeneracionPedido } from '../src/negocio/ControlGeneracionPedido.js';
import { escenarioCarrito } from './fixtures/carrito.js';

function escenarioPedido() {
  const f = escenarioCarrito();
  let persistido: Pedido | null = null;
  const entradas: PedidoNuevo[] = [];
  const control = new ControlGeneracionPedido(f.control, {
    guardar: async pedido => {
      entradas.push(pedido);
      persistido = { ...pedido, id: 8, estado: pedido.estado ?? 'PENDIENTE', fechaCreacion: '2026-10-18T12:00:00Z', origen: 'PERSONAL', venceEn: null,
        items: pedido.items.map(i => ({ ...i, subtotal: Math.round(i.cantidad * i.precioUnitario * 100) / 100 })) };
      f.carrito.cerrado = true;
      return persistido;
    },
    obtenerPorId: async () => persistido, obtenerPorCarrito: async () => persistido, listarResumen: async () => [],
    confirmar: async () => { if (!persistido) throw new Error('No existe'); persistido.estado = 'CONFIRMADO'; return persistido; },
  });
  return { ...f, controlPedido: control, entradas };
}

test('la generación entrega un objeto completo al repositorio y el reintento recupera el mismo pedido', async () => {
  const f = escenarioPedido();
  await f.control.agregar(4, 1, 2, 2);
  const pedido = await f.controlPedido.generar(4);
  assert.deepEqual(f.entradas, [{ clienteId: 3, carritoId: 4, estado: 'PENDIENTE',
    items: [{ varianteId: 2, cantidad: 2, precioUnitario: 149.9 }] }]);
  assert.equal(pedido.id, 8);
  assert.equal(pedido.total, 299.8);
  assert.equal(pedido.items[0]?.nombre, 'Camisa');
  assert.equal((await f.controlPedido.generar(4)).id, pedido.id);
  assert.equal(f.entradas.length, 1);
  assert.equal(f.articulo.variantes[0]?.existencia, 5, 'Un pedido pendiente no descuenta existencias.');
});

test('un carrito vacío o con disponibilidad reducida se rechaza antes de guardar el pedido', async () => {
  const f = escenarioPedido();
  await assert.rejects(f.controlPedido.generar(4), /al menos un artículo/);
  await f.control.agregar(4, 1, 2, 2);
  f.articulo.variantes[0]!.existencia = 1;
  await assert.rejects(f.controlPedido.generar(4), /disponibilidad.*cambió/);
  assert.equal(f.entradas.length, 0);
  assert.equal(f.carrito.cerrado, false);
});

test('los artículos sobre pedido requieren una confirmación manual del proveedor para esa variante', async () => {
  const f = escenarioPedido();
  f.articulo.sobrePedido = true;
  f.articulo.variantes[0]!.existencia = 0;
  await f.control.agregar(4, 1, 2, 2);
  await assert.rejects(f.controlPedido.generar(4), /Confirma con el proveedor/);
  await assert.rejects(f.controlPedido.generar(4, [99]), /Confirma con el proveedor/);
  assert.equal(f.entradas.length, 0);
  assert.equal((await f.controlPedido.generar(4, [2])).estado, 'PENDIENTE');
});


test('confirmación del personal recupera el pedido actualizado sin cambiar sus importes', async()=>{
  const f=escenarioPedido(); await f.control.agregar(4,1,2,1); const anterior=await f.controlPedido.generar(4);
  const confirmado=await f.controlPedido.confirmar(anterior.id); assert.equal(confirmado.estado,'CONFIRMADO');
  assert.deepEqual(confirmado.items,anterior.items); assert.equal(confirmado.total,anterior.total);
});

test('dar de baja un artículo conserva la consulta de un pedido ya registrado',async()=>{
 const f=escenarioPedido();await f.control.agregar(4,1,2,1);const p=await f.controlPedido.generar(4);
 Object.assign(f.articulo,{activo:false});Object.assign(f.articulo.variantes[0]!,{activo:false,recargo:50});
 const historico=await f.controlPedido.obtener(p.id);assert.equal(historico.total,p.total);assert.equal(historico.items[0]?.precioUnitario,p.items[0]?.precioUnitario);
});
