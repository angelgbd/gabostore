import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Articulo } from '../src/models.js';
import { ControlCatalogo, type ConsultaArticulos } from '../src/negocio/ControlCatalogo.js';
import { ErrorNegocio } from '../src/negocio/ErrorNegocio.js';

const articulo: Articulo = {
  id: 1, nombre: 'Camisa', categoria: 'Ropa', precioBase: 149.9,
  fotografia: '', sobrePedido: true,
  variantes: [{ id: 2, tallaMedida: 'M', existencia: 5 }, { id: 3, tallaMedida: 'L', existencia: 0 }],
};

test('el catálogo oculta el precio sobre pedido al público y conserva las variantes agotadas', async () => {
  const consultas: string[] = [];
  const repositorio: ConsultaArticulos = {
    listarCatalogo: async () => { consultas.push('publico'); return [articulo]; },
    listar: async () => { consultas.push('personal'); return [articulo]; },
    obtenerPublicoPorId: async () => articulo,
    obtenerPorId: async () => articulo,
  };
  const control = new ControlCatalogo(repositorio);
  const publico = await control.listar();
  const personal = await control.listar(true);
  assert.equal(publico[0]?.precioBase, null);
  assert.equal(personal[0]?.precioBase, 149.9);
  assert.equal(publico[0]?.existenciaTotal, 5);
  assert.equal(publico[0]?.variantes[1]?.existencia, 0);
  assert.deepEqual(consultas, ['publico', 'personal']);
  assert.equal(articulo.precioBase, 149.9, 'La proyección pública no modifica el artículo de origen.');
});

test('un artículo fuera del catálogo público no se recupera con la consulta interna por accidente', async () => {
  const repositorio: ConsultaArticulos = {
    listarCatalogo: async () => [], listar: async () => [articulo],
    obtenerPublicoPorId: async () => null, obtenerPorId: async () => articulo,
  };
  const control = new ControlCatalogo(repositorio);
  await assert.rejects(control.detalle(1), (error: unknown) => error instanceof ErrorNegocio && error.codigo === 'NO_ENCONTRADO');
  assert.equal((await control.detalle(1, true)).id, 1);
  await assert.rejects(control.detalle(0), ErrorNegocio);
});
