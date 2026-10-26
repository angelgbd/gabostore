import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { crearServidor } from '../src/servidor/aplicacion.js';
import type { Database } from '../src/database.types.js';

const uid = '00000000-0000-4000-8000-000000000001';
const fila = { id: 8, nombre: 'Camisa', categoria: 'Ropa', precio_base: 100, fotografia: '', sobre_pedido: false,
  variantes: [{ id: 9, articulo_id: 8, talla_medida: 'Única', existencia: 3 }] };
const subidas: string[] = [];
const servidor = crearServidor({ url: 'https://prueba.supabase.co', clavePublica: 'sb_publishable_prueba', carpetaWeb: 'web-dist',
  conectar: () => createClient<Database>('https://prueba.supabase.co', 'sb_publishable_prueba', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (entrada, opciones) => {
      const url = new URL(String(entrada)); const headers = new Headers(opciones?.headers);
      if (url.pathname.includes('/auth/v1/user')) return Response.json({ id: uid, email: 'personal@example.com',
        app_metadata: headers.get('Authorization') === 'Bearer empleado' ? { rol: 'EMPLEADO' } : {} });
      const datos = typeof opciones?.body === 'string' ? JSON.parse(opciones.body) as Record<string, unknown> : {};
      if (url.pathname.endsWith('/rpc/crear_articulo')) {
        Object.assign(fila, { nombre: datos.p_nombre, categoria: datos.p_categoria, precio_base: datos.p_precio_base });
        return Response.json(8);
      }
      if (url.pathname.endsWith('/articulos')) {
        if (opciones?.method === 'PATCH') { Object.assign(fila, datos); return Response.json({ id: 8 }); }
        return Response.json(fila);
      }
      if (url.pathname.endsWith('/rpc/ajustar_existencia')) {
        const nueva = fila.variantes[0]!.existencia + Number(datos.p_cambio);
        if (nueva < 0) return Response.json({ message: 'La existencia no puede ser negativa.', code: '23514', details: '' }, { status: 400 });
        fila.variantes[0]!.existencia = nueva; return Response.json(fila.variantes[0]);
      }
      if (url.pathname.endsWith('/pedidos')) {
        const desde = Number(url.searchParams.get('offset') ?? 0);
        return Response.json(Array.from({ length: Math.max(0, 21 - desde) }, (_, i) => ({ id: 30 - desde - i,
          fecha_creacion: '2026-10-21T00:00:00Z', estado: 'PENDIENTE', carrito: { cliente: { id: 4, nombre: 'Ana' } },
          items_pedido: [{ subtotal: '0.10' }, { subtotal: '0.20' }] })));
      }
      if (url.pathname.startsWith('/storage/v1/object/catalogo/')) { subidas.push(url.pathname); return Response.json({ Key: url.pathname }); }
      throw new Error(`Petición inesperada: ${url.pathname}`);
    } },
  }),
});
let base = '';
before(async () => {
  await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
  const direccion = servidor.address(); assert.ok(direccion && typeof direccion === 'object'); base = `http://127.0.0.1:${direccion.port}/api/personal/`;
});
after(async () => { await new Promise<void>(r => servidor.close(() => r())); });
async function api(ruta: string, metodo = 'GET', datos?: unknown) {
  return fetch(base + ruta, { method: metodo, headers: { Authorization: 'Bearer empleado', 'Content-Type': 'application/json' },
    ...(datos !== undefined ? { body: JSON.stringify(datos) } : {}) });
}

test('nuevas operaciones rechazan anónimos y cuentas sin rol de personal', async () => {
  for (const [ruta, metodo] of [['catalogo', 'POST'], ['catalogo/8', 'PATCH'], ['catalogo/8/variantes/9/existencias', 'POST'],
    ['imagenes', 'POST'], ['pedidos', 'GET'], ['pedidos/20/confirmar', 'POST']] as const) {
    assert.equal((await fetch(base + ruta, { method: metodo })).status, 401);
    assert.equal((await fetch(base + ruta, { method: metodo, headers: { Authorization: 'Bearer cliente' } })).status, 403);
  }
});

test('empleado crea, edita y ajusta existencias mediante la API, con validación de negocio', async () => {
  const nuevo = { nombre: 'Camisa', categoria: 'Ropa', precioBase: 140, variantes: [{ tallaMedida: 'Única', existencia: 3 }] };
  assert.equal((await api('catalogo', 'POST', { ...nuevo, variantes: [] })).status, 400);
  const creado = await api('catalogo', 'POST', nuevo); assert.equal(creado.status, 201);
  assert.equal((await creado.json() as { precioBase: number }).precioBase, 140);
  assert.equal((await api('catalogo/8', 'PATCH', { precioBase: -1 })).status, 400);
  const editado = await api('catalogo/8', 'PATCH', { precioBase: 175 }); assert.equal(editado.status, 200);
  assert.equal((await editado.json() as { precioBase: number }).precioBase, 175);
  assert.equal((await api('catalogo/8', 'PATCH', { variantes: [] })).status, 400);
  assert.equal((await api('catalogo/8/variantes/99/existencias', 'POST', { cambio: 2 })).status, 404);
  assert.equal((await api('catalogo/8/variantes/9/existencias', 'POST', { cambio: -99 })).status, 400);
  const stock = await api('catalogo/8/variantes/9/existencias', 'POST', { cambio: 2 });
  assert.equal((await stock.json() as { existenciaTotal: number }).existenciaTotal, 5);
});

test('listado devuelve 20 resúmenes, importes exactos y señal de siguiente página', async () => {
  const primera = await (await api('pedidos')).json() as { pedidos: { id: number; total: number; cliente: { nombre: string } }[]; hayMas: boolean };
  assert.equal(primera.pedidos.length, 20); assert.equal(primera.hayMas, true);
  assert.equal(primera.pedidos[0]?.cliente.nombre, 'Ana'); assert.equal(primera.pedidos[0]?.total, 0.3);
  const segunda = await (await api('pedidos?desde=20')).json() as { pedidos: unknown[]; hayMas: boolean };
  assert.equal(segunda.pedidos.length, 1); assert.equal(segunda.hayMas, false);
  assert.equal((await api('pedidos?desde=-1')).status, 400);
});

test('subida rechaza formatos falsos y exceso de tamaño; cada imagen obtiene ruta nueva del empleado', async () => {
  const subir = (tipo: string, bytes: Uint8Array) => fetch(base + 'imagenes', { method: 'POST',
    headers: { Authorization: 'Bearer empleado', 'Content-Type': tipo }, body: new Uint8Array(bytes).buffer });
  assert.equal((await subir('image/svg+xml', new Uint8Array([1]))).status, 415);
  assert.equal((await subir('image/png', new Uint8Array([1]))).status, 400);
  assert.equal((await subir('image/png', new Uint8Array(5 * 1024 * 1024 + 1))).status, 413);
  for (let i = 0; i < 2; i++) {
    const respuesta = await subir('image/png', new Uint8Array([137,80,78,71,13,10,26,10]));
    assert.equal(respuesta.status, 201);
    assert.match((await respuesta.json() as { fotografia: string }).fotografia, /storage\/v1\/object\/public\/catalogo\/productos\//);
  }
  assert.equal(subidas.length, 2); assert.notEqual(subidas[0], subidas[1]); assert.ok(subidas.every(r => r.includes(uid)));
});
