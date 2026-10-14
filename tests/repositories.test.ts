import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {
  crearCapaDatos, crearClienteSupabase, ErrorDatos, EstadoPedido, type Database,
} from '../src/index.js';

type Peticion = { url: URL; opciones: RequestInit | undefined };
function simulacion(responder: (peticion: Peticion) => Response | Promise<Response>) {
  const peticiones: Peticion[] = [];
  const cliente = createClient<Database>('https://prueba.supabase.co', 'sb_publishable_prueba', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (entrada, opciones) => {
      const url = new URL(entrada instanceof Request ? entrada.url : String(entrada));
      const peticion = { url, opciones };
      peticiones.push(peticion);
      return responder(peticion);
    } },
  });
  return { datos: crearCapaDatos(cliente), peticiones };
}
function respuesta(valor: unknown, status = 200) {
  return new Response(JSON.stringify(valor), { status, headers: { 'Content-Type': 'application/json' } });
}
const linea = { variante_id: 2, cantidad: 3, precio_unitario: 0.1, subtotal: 0.3 };

test('el catálogo mapea campos y conserva tallas agotadas, sin consultar tablas privadas', async () => {
  const { datos, peticiones } = simulacion(() => respuesta([{
    articulo_id: 1, nombre: 'Camisa', categoria: 'Ropa', precio_base: 149.9,
    fotografia: '', sobre_pedido: false,
    variantes: [{ id: 2, talla_medida: 'M', existencia: 5 }, { id: 3, talla_medida: 'L', existencia: 0 }],
  }]));
  const articulos = await datos.articulos.listarCatalogo(10, 20);
  assert.equal(articulos[0]?.precioBase, 149.9);
  assert.equal(articulos[0]?.variantes[1]?.existencia, 0);
  assert.equal(peticiones[0]?.url.pathname, '/rest/v1/rpc/obtener_catalogo');
  assert.deepEqual(JSON.parse(String(peticiones[0]?.opciones?.body)), { p_limite: 10, p_desde: 20 });
});

test('guardar una línea omite el precio cuando se quiere conservar el existente', async () => {
  const { datos, peticiones } = simulacion(({ url }) => url.pathname.endsWith('guardar_item_carrito')
    ? new Response(null, { status: 204 })
    : respuesta({ id: 4, cliente_id: 5, correo_cliente: 'cliente@example.com', cerrado: false, items_carrito: [linea] }));
  const carrito = await datos.carritos.guardarItem(4, 2, 3);
  assert.deepEqual(JSON.parse(String(peticiones[0]?.opciones?.body)), { p_carrito_id: 4, p_variante_id: 2, p_cantidad: 3 });
  assert.equal(carrito.items[0]?.subtotal, 0.3);
});

test('generar un pedido usa la operación atómica y recupera la copia persistida', async () => {
  const { datos, peticiones } = simulacion(({ url }) => url.pathname.endsWith('crear_pedido_desde_carrito')
    ? respuesta(6)
    : respuesta({ id: 6, cliente_id: 5, carrito_id: 4, correo_cliente: 'cliente@example.com',
      estado: 'PENDIENTE', fecha_creacion: '2026-10-13T12:00:00Z', items_pedido: [linea] }));
  const pedido = await datos.pedidos.crearDesdeCarrito(4);
  assert.equal(pedido.estado, EstadoPedido.PENDIENTE);
  assert.equal(pedido.items[0]?.precioUnitario, 0.1);
  assert.equal(peticiones[0]?.url.pathname, '/rest/v1/rpc/crear_pedido_desde_carrito');
  assert.equal(peticiones[1]?.url.searchParams.get('id'), 'eq.6');
});

test('errores de base de datos se propagan sin devolver éxitos vacíos', async () => {
  const { datos } = simulacion(() => respuesta({ code: '55000', message: 'Carrito cerrado', details: '', hint: null }, 400));
  await assert.rejects(datos.carritos.guardarItem(4, 2, 1),
    (error: unknown) => error instanceof ErrorDatos && error.codigo === '55000');
});

test('valores inválidos se rechazan antes de enviar una petición', async () => {
  const { datos, peticiones } = simulacion(() => { throw new Error('No debe consultar la red'); });
  const esValidacion = (error: unknown) => error instanceof ErrorDatos && error.codigo === 'VALIDACION';
  await assert.rejects(datos.articulos.crear({ nombre: 'X', categoria: 'Y', precioBase: 0.125 }), esValidacion);
  await assert.rejects(datos.carritos.guardarItem(1, 2, 0), esValidacion);
  await assert.rejects(datos.carritos.abrir(1, 'sin-correo'), esValidacion);
  await assert.rejects(datos.pedidos.obtenerPorId(Number.MAX_SAFE_INTEGER + 1), esValidacion);
  await assert.rejects(datos.articulos.listarCatalogo(101), esValidacion);
  assert.equal(peticiones.length, 0);
});

test('un registro no encontrado devuelve null en una consulta', async () => {
  const { datos } = simulacion(() => respuesta([]));
  assert.equal(await datos.pedidos.obtenerPorId(100), null);
});

test('el ajuste de existencia solicita una fila de la función SQL', async () => {
  const { datos, peticiones } = simulacion(() => respuesta({ id: 2, articulo_id: 1, talla_medida: 'M', existencia: 8 }));
  assert.deepEqual(await datos.articulos.ajustarExistencia(2, 3), { id: 2, tallaMedida: 'M', existencia: 8 });
  assert.equal(peticiones[0]?.url.pathname, '/rest/v1/rpc/ajustar_existencia');
  assert.equal(new Headers(peticiones[0]?.opciones?.headers).get('Accept'), 'application/vnd.pgrst.object+json');
});

test('la conexión envía el JWT de cada empleado y mantiene la clave pública en apikey', async (t) => {
  const cabeceras: Headers[] = [];
  t.mock.method(globalThis, 'fetch', async (_entrada: unknown, opciones?: RequestInit) => {
    cabeceras.push(new Headers(opciones?.headers));
    return respuesta([]);
  });
  const primero = crearCapaDatos(crearClienteSupabase({
    url: 'https://prueba.supabase.co', clavePublica: 'sb_publishable_prueba', tokenUsuario: 'jwt-empleado-uno',
  }));
  const segundo = crearCapaDatos(crearClienteSupabase({
    url: 'https://prueba.supabase.co', clavePublica: 'sb_publishable_prueba', tokenUsuario: 'jwt-empleado-dos',
  }));
  await primero.articulos.listarCatalogo();
  await segundo.articulos.listarCatalogo();
  assert.equal(cabeceras[0]?.get('Authorization'), 'Bearer jwt-empleado-uno');
  assert.equal(cabeceras[1]?.get('Authorization'), 'Bearer jwt-empleado-dos');
  assert.equal(cabeceras[0]?.get('apikey'), 'sb_publishable_prueba');
});
