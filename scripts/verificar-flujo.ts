import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { crearServidor } from '../src/servidor/aplicacion.js';
import type { ArticuloCatalogo, CarritoDetalle, PedidoDetalle } from '../src/negocio/index.js';
import type { Database } from '../src/database.types.js';

async function main() {
  const url = process.env.SUPABASE_URL;
  const clavePublica = process.env.SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.GABOSTORE_PERSONAL_EMAIL;
  const password = process.env.GABOSTORE_PERSONAL_PASSWORD;
  assert.ok(url && clavePublica && email && password, 'Configura .env y ejecuta npm run preparar:personal.');
  const conexion = createClient<Database>(url, clavePublica, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await conexion.auth.signInWithPassword({ email, password });
  if (error) throw new Error('No se pudo autenticar el personal de prueba.');
  assert.ok(data.session);
  const servidor = crearServidor({ url, clavePublica, carpetaWeb: resolve('web-dist') });
  await new Promise<void>(resolver => servidor.listen(0, '127.0.0.1', resolver));
  const direccion = servidor.address();
  assert.ok(direccion && typeof direccion === 'object');
  const base = `http://127.0.0.1:${direccion.port}/api/`;
  async function api<T>(ruta: string, metodo = 'GET', datos?: unknown): Promise<T> {
    const respuesta = await fetch(base + ruta, { method: metodo, headers: {
      Authorization: `Bearer ${data.session!.access_token}`,
      ...(datos !== undefined ? { 'Content-Type': 'application/json' } : {}),
    }, ...(datos !== undefined ? { body: JSON.stringify(datos) } : {}) });
    assert.ok(respuesta.ok, `${metodo} ${ruta}: ${respuesta.status}`);
    return respuesta.json() as Promise<T>;
  }
  try {
    assert.equal((await fetch(base + 'personal/carritos/1')).status, 401);
    const articulos = await api<ArticuloCatalogo[]>('personal/catalogo');
    const disponibles = articulos.filter(a => !a.sobrePedido && a.precioBase !== null && a.variantes.some(v => v.existencia >= 2));
    assert.ok(disponibles.length >= 2, 'La prueba requiere dos artículos con al menos dos unidades disponibles.');
    const primero = disponibles[0]!;
    const segundo = disponibles[1]!;
    const v1 = primero.variantes.find(v => v.existencia >= 2)!;
    const v2 = segundo.variantes.find(v => v.existencia >= 2)!;
    const carrito = await api<CarritoDetalle>('personal/carritos', 'POST', {
      nombre: `DEMO FLUJO ${new Date().toISOString()}`, telefono: '0000000000', correoCliente: 'demo.flujo@example.com',
    });
    const ruta = `personal/carritos/${carrito.id}/items`;
    // Un precio enviado por el navegador se ignora; el negocio usa el catálogo del servidor.
    let actualizado = await api<CarritoDetalle>(ruta, 'POST', { articuloId: primero.id, varianteId: v1.id, cantidad: 2, precioUnitario: 0.01 });
    assert.equal(actualizado.items[0]?.precioUnitario, primero.precioBase);
    actualizado = await api<CarritoDetalle>(ruta, 'POST', { articuloId: segundo.id, varianteId: v2.id, cantidad: 1 });
    assert.equal(actualizado.items.length, 2);
    await api(`${ruta}/${v1.id}`, 'PATCH', { cantidad: 1 });
    await api(`${ruta}/${v1.id}`, 'PATCH', { cantidad: 2 });
    await api(`${ruta}/${v2.id}`, 'DELETE');
    await api(ruta, 'POST', { articuloId: segundo.id, varianteId: v2.id, cantidad: 1 });
    const pedido = await api<PedidoDetalle>('personal/pedidos', 'POST', { carritoId: carrito.id });
    assert.equal(pedido.estado, 'PENDIENTE');
    assert.equal(pedido.items.length, 2);
    assert.equal(pedido.total, (Math.round(primero.precioBase! * 100) * 2 + Math.round(segundo.precioBase! * 100)) / 100);
    assert.equal((await api<PedidoDetalle>('personal/pedidos', 'POST', { carritoId: carrito.id })).id, pedido.id);
    assert.deepEqual(await api<PedidoDetalle>(`personal/pedidos/${pedido.id}`), pedido);
    assert.equal((await api<CarritoDetalle>(`personal/carritos/${carrito.id}`)).cerrado, true);
    const autor = await conexion.from('pedidos').select('creado_por').eq('id', pedido.id).single();
    assert.ifError(autor.error);
    assert.equal(autor.data?.creado_por, data.user.id);
    const vigente = await api<ArticuloCatalogo>(`personal/catalogo/${primero.id}`);
    assert.equal(vigente.variantes.find(v => v.id === v1.id)?.existencia, v1.existencia);
    console.log(JSON.stringify({ resultado: 'OK', pedidoId: pedido.id, carritoId: carrito.id, detalles: pedido.items.length,
      total: pedido.total, precioDelServidor: true, autorRegistrado: true, reintentoSinDuplicados: true, existenciasConservadas: true }, null, 2));
  } finally {
    await conexion.auth.signOut({ scope: 'local' });
    await new Promise<void>(resolver => servidor.close(() => resolver()));
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Falló la prueba del flujo.'); process.exitCode = 1; });
