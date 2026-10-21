import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ControlCatalogo } from '../src/negocio/ControlCatalogo.js';
import { ErrorDatos } from '../src/errors.js';
import { limiteFotografia, validarFotografia } from '../src/fotografias.js';
import type { Articulo, ArticuloNuevo } from '../src/models.js';

function escenario() {
  let articulo: Articulo = { id: 1, nombre: 'Camisa', categoria: 'Ropa', precioBase: 100, fotografia: '', sobrePedido: false,
    variantes: [{ id: 2, tallaMedida: 'M', existencia: 3 }] };
  let escrituras = 0;
  const control = new ControlCatalogo({ listar: async () => [articulo], listarCatalogo: async () => [articulo],
    obtenerPorId: async () => articulo, obtenerPublicoPorId: async () => articulo }, {
    crear: async nuevo => { escrituras++; articulo = { ...articulo, ...nuevo, variantes: nuevo.variantes!.map((v, i) => ({ ...v, id: i + 2 })) }; return articulo; },
    actualizar: async (_id, cambios) => { escrituras++; articulo = { ...articulo, ...cambios }; return articulo; },
    ajustarExistencia: async (_id, cambio) => {
      const variante = articulo.variantes[0]!;
      if (variante.existencia + cambio < 0) throw new ErrorDatos('La existencia no puede ser negativa.', '23514');
      escrituras++; variante.existencia += cambio; return variante;
    },
    subirFotografia: async () => 'https://prueba.supabase.co/foto.png',
  });
  const nuevo: ArticuloNuevo = { nombre: ' Camisa ', categoria: ' Ropa ', precioBase: 120.25,
    variantes: [{ tallaMedida: ' Única ', existencia: 0 }] };
  return { control, nuevo, escrituras: () => escrituras };
}

test('alta normaliza ficha y requiere variantes únicas con existencias enteras no negativas', async () => {
  const f = escenario();
  for (const cambio of [{ variantes: [] }, { variantes: [{ tallaMedida: 'M', existencia: -1 }] },
    { variantes: [{ tallaMedida: ' M ', existencia: 1 }, { tallaMedida: 'm', existencia: 2 }] },
    { precioBase: -1 }, { nombre: ' ' }, { variantes: [{ tallaMedida: 'M', existencia: 1.5 }] }]) {
    await assert.rejects(f.control.crear({ ...f.nuevo, ...cambio }));
  }
  assert.equal(f.escrituras(), 0);
  const creado = await f.control.crear(f.nuevo);
  assert.equal(creado.nombre, 'Camisa'); assert.equal(creado.variantes[0]?.tallaMedida, 'Única');
  assert.equal(creado.precioBase, 120.25); assert.equal(creado.existenciaTotal, 0);
});

test('edición y ajustes comprueban asociación y no permiten stock negativo', async () => {
  const f = escenario();
  const editado = await f.control.actualizar(1, { precioBase: 150, sobrePedido: true });
  assert.equal(editado.precioBase, 150); assert.equal(editado.sobrePedido, true);
  await assert.rejects(f.control.actualizar(1, { fotografia: 'javascript:alert(1)' }));
  await assert.rejects(f.control.ajustarExistencia(1, 99, 1));
  await assert.rejects(f.control.ajustarExistencia(1, 2, 0));
  await assert.rejects(f.control.ajustarExistencia(1, 2, -4));
  assert.equal((await f.control.ajustarExistencia(1, 2, 2)).existenciaTotal, 5);
  assert.equal((await f.control.ajustarExistencia(1, 2, -5)).existenciaTotal, 0);
});

test('fotografías verifican tipo, contenido, archivo vacío y límite de 5 MiB', () => {
  validarFotografia(new Uint8Array([137,80,78,71,13,10,26,10]), 'image/png');
  validarFotografia(new Uint8Array([255,216,255]), 'image/jpeg');
  validarFotografia(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]), 'image/webp');
  for (const [contenido, tipo] of [[new Uint8Array(), 'image/png'], [new Uint8Array([255,216,255]), 'image/png'],
    [new Uint8Array([1]), 'image/svg+xml'], [new Uint8Array(limiteFotografia + 1), 'image/png']] as const) {
    assert.throws(() => validarFotografia(contenido, tipo));
  }
});
