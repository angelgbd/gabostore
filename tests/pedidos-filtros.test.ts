import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { validarFiltrosPedidos, type FiltrosListadoPedidos } from '../src/filtrosPedidos.js';
import { crearServidor } from '../src/servidor/aplicacion.js';
import { crearCapaDatos } from '../src/index.js';
import type { Database } from '../src/database.types.js';

const filas = Array.from({ length: 45 }, (_, i) => ({ id: i + 1,
  estado: i % 2 ? 'CONFIRMADO' : 'PENDIENTE', fecha_creacion: '2026-10-27T12:00:00.000000Z' }));
filas.push({ id: 90, estado: 'CONFIRMADO', fecha_creacion: '2026-10-28T06:59:59.999999Z' },
  { id: 91, estado: 'CONFIRMADO', fecha_creacion: '2026-10-28T07:00:00.000000Z' });
const consultas: URL[] = [];
function conectar() {
  return createClient<Database>('https://prueba.supabase.co', 'sb_publishable_prueba', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (entrada, opciones) => {
      const url = new URL(String(entrada));
      if (url.pathname === '/auth/v1/user') {
        const token = new Headers(opciones?.headers).get('Authorization');
        return Response.json({ id: '00000000-0000-4000-8000-000000000001',
          app_metadata: token === 'Bearer empleado' ? { rol: 'EMPLEADO' } : token === 'Bearer admin' ? { rol: 'ADMIN' } : {} });
      }
      assert.equal(url.pathname, '/rest/v1/pedidos');
      assert.equal(opciones?.method, 'GET', 'La búsqueda solo realiza lecturas.');
      consultas.push(url);
      const p = url.searchParams;
      const numero = p.get('id')?.slice(3);
      const estado = p.get('estado')?.slice(3);
      // Comparación de los instantes expresados en UTC, conservando microsegundos en el extremo final.
      const inicio = p.getAll('fecha_creacion').find(v => v.startsWith('gte.'))?.slice(4);
      const fin = p.getAll('fecha_creacion').find(v => v.startsWith('lte.'))?.slice(4);
      const desde = Number(p.get('offset') ?? 0); const limite = Number(p.get('limit') ?? 100);
      const filtradas = filas.filter(f => (!numero || f.id === Number(numero)) && (!estado || f.estado === estado)
        && (!inicio || Date.parse(f.fecha_creacion) >= Date.parse(inicio))
        && (!fin || Date.parse(f.fecha_creacion) <= Date.parse(fin)))
        .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion) || b.id - a.id);
      return Response.json(filtradas.slice(desde, desde + limite).map(f => ({ ...f, origen: 'PUBLICO', vence_en: '2026-11-01T12:00:00Z',
        carrito: { cliente: null }, items_pedido: [{ subtotal: '0.10' }, { subtotal: '0.20' }] })));
    } },
  });
}
const servidor = crearServidor({ url: 'https://prueba.supabase.co', clavePublica: 'sb_publishable_prueba', carpetaWeb: 'web-dist', conectar });
let base = '';
before(async () => {
  await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
  const direccion = servidor.address(); assert.ok(direccion && typeof direccion === 'object');
  base = `http://127.0.0.1:${direccion.port}/api/personal/pedidos`;
});
after(async () => { await new Promise<void>(r => servidor.close(() => r())); });
const api = (parametros = '', token = 'empleado') => fetch(base + parametros, { headers: { Authorization: `Bearer ${token}` } });
type Pagina = { pedidos: { id: number; estado: string; cliente: null; total: number }[]; desde: number; hayMas: boolean };

test('fechas estrictas, años bisiestos y orden del rango se validan antes de consultar', async () => {
  assert.deepEqual(validarFiltrosPedidos({ fechaDesde: '2024-02-29', fechaHasta: '2024-02-29' }), {
    inicio: '2024-02-29T00:00:00-07:00', fin: '2024-02-29T23:59:59.999999-07:00',
  });
  const datos = crearCapaDatos(conectar()); const anteriores = consultas.length;
  for (const filtro of [{ numero: 0 }, { numero: 1.5 }, { numero: Number.MAX_SAFE_INTEGER + 1 }, { estado: 'PAGADO' },
    { fechaDesde: '2026-02-29' }, { fechaHasta: '2026-04-31' }, { fechaDesde: '0000-01-01' },
    { fechaDesde: '2026-1-01' }, { fechaDesde: '2026-10-29', fechaHasta: '2026-10-28' }] as FiltrosListadoPedidos[]) {
    await assert.rejects(datos.pedidos.listarResumen(0, 21, filtro));
  }
  assert.equal(consultas.length, anteriores);
});

test('la API combina número, estado y ambos extremos del día de Hermosillo', async () => {
  const respuesta = await api('?numero=90&estado=CONFIRMADO&fechaDesde=2026-10-27&fechaHasta=2026-10-27');
  assert.equal(respuesta.status, 200);
  const pagina = await respuesta.json() as Pagina;
  assert.deepEqual(pagina.pedidos.map(p => p.id), [90]);
  assert.equal(pagina.pedidos[0]?.cliente, null); assert.equal(pagina.pedidos[0]?.total, 0.3);
  assert.equal(pagina.hayMas, false);
  const p = consultas.at(-1)!.searchParams;
  assert.equal(p.get('id'), 'eq.90'); assert.equal(p.get('estado'), 'eq.CONFIRMADO');
  assert.deepEqual(p.getAll('fecha_creacion'), ['gte.2026-10-27T00:00:00-07:00', 'lte.2026-10-27T23:59:59.999999-07:00']);
  assert.equal(p.get('order'), 'fecha_creacion.desc,id.desc');
  const fuera = await (await api('?numero=91&fechaHasta=2026-10-27')).json() as Pagina;
  assert.equal(fuera.pedidos.length, 0);
});

test('los filtros se aplican antes de paginar y se mantienen en las páginas siguientes', async () => {
  const primera = await (await api('?estado=CONFIRMADO')).json() as Pagina;
  const segunda = await (await api('?estado=CONFIRMADO&desde=20')).json() as Pagina;
  assert.equal(primera.pedidos.length, 20); assert.equal(primera.hayMas, true);
  assert.equal(segunda.pedidos.length, 4); assert.equal(segunda.hayMas, false); assert.equal(segunda.desde, 20);
  const ids = [...primera.pedidos, ...segunda.pedidos].map(p => p.id);
  assert.equal(new Set(ids).size, 24); assert.equal(ids[0], 91);
  assert.ok([...primera.pedidos, ...segunda.pedidos].every(p => p.estado === 'CONFIRMADO'));
  assert.equal((await (await api('?numero=2&estado=PENDIENTE')).json() as Pagina).pedidos.length, 0);
});

test('filtros manipulados devuelven 400 sin consultar las tablas', async () => {
  const anteriores = consultas.length;
  for (const filtro of ['numero=0', 'numero=1.2', 'numero=1e2', 'numero=9007199254740992', 'numero=eq.1',
    'numero=1&numero=2', 'estado=PAGADO', 'estado=', 'fechaDesde=', 'fechaDesde=2026-02-30',
    'fechaHasta=2026-10-27T00:00:00Z', 'fechaDesde=2026-10-28&fechaHasta=2026-10-27', 'desde=-1']) {
    assert.equal((await api(`?${filtro}`)).status, 400, filtro);
  }
  assert.equal(consultas.length, anteriores);
});

test('listado filtrado conserva acceso exclusivo de ADMIN y EMPLEADO', async () => {
  assert.equal((await fetch(base + '?numero=90')).status, 401);
  assert.equal((await api('?numero=90', 'cliente')).status, 403);
  assert.equal((await api('?numero=90', 'admin')).status, 200);
});
