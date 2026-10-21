import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { crearServidor } from '../src/servidor/aplicacion.js';
import type { ArticuloCatalogo, PedidoDetalle, PedidoResumen } from '../src/index.js';

async function main() {
  const url = process.env.SUPABASE_URL; const clave = process.env.SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.GABOSTORE_PERSONAL_EMAIL; const password = process.env.GABOSTORE_PERSONAL_PASSWORD;
  assert.ok(url && clave && email && password, 'Configura .env y .env.personal.local.');
  const publico = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const personal = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await personal.auth.signInWithPassword({ email, password }); assert.ifError(error); assert.ok(data.session);
  const servidor = crearServidor({ url, clavePublica: clave, carpetaWeb: resolve('web-dist') });
  await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
  const direccion = servidor.address(); assert.ok(direccion && typeof direccion === 'object');
  const base = `http://127.0.0.1:${direccion.port}/api/`;
  async function api<T>(ruta: string, metodo = 'GET', contenido?: unknown): Promise<T> {
    const respuesta = await fetch(base + 'personal/' + ruta, { method: metodo, headers: { Authorization: `Bearer ${data.session!.access_token}`,
      ...(contenido !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(contenido !== undefined ? { body: JSON.stringify(contenido) } : {}) });
    const resultado = await respuesta.json() as T & { error?: string };
    assert.ok(respuesta.ok, `${metodo} ${ruta}: ${respuesta.status} ${resultado.error ?? ''}`); return resultado;
  }
  try {
    assert.equal((await fetch(base + 'personal/pedidos')).status, 401);
    const listado = await api<{ pedidos: PedidoResumen[] }>('pedidos');
    const anterior = listado.pedidos[0] ? await api<PedidoDetalle>(`pedidos/${listado.pedidos[0].id}`) : null;
    const archivo = await readFile(new URL('../assets/productos-demo/camisa.webp', import.meta.url));
    const denegada = await publico.storage.from('catalogo').upload(`productos/${data.user.id}/${crypto.randomUUID()}.webp`, archivo, { contentType: 'image/webp' });
    assert.ok(denegada.error, 'Una sesión pública no debe subir fotografías.');
    const carga = await fetch(base + 'personal/imagenes', { method: 'POST', headers: {
      Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'image/webp' }, body: archivo });
    assert.equal(carga.status, 201); const { fotografia } = await carga.json() as { fotografia: string };
    assert.equal((await fetch(fotografia, { method: 'HEAD' })).status, 200);
    const creado = await api<ArticuloCatalogo>('catalogo', 'POST', { nombre: `DEMO CATALOGO ${new Date().toISOString()} - Camisa de prueba`,
      categoria: 'Pruebas internas', precioBase: 45.5, fotografia, variantes: [{ tallaMedida: 'Única', existencia: 0 }] });
    const variante = creado.variantes[0]!;
    assert.equal((await fetch(base + `catalogo/${creado.id}`)).status, 404);
    const editado = await api<ArticuloCatalogo>(`catalogo/${creado.id}`, 'PATCH', { precioBase: 60.25 });
    assert.equal(editado.precioBase, 60.25); assert.equal(editado.fotografia, fotografia);
    const aumentado = await api<ArticuloCatalogo>(`catalogo/${creado.id}/variantes/${variante.id}/existencias`, 'POST', { cambio: 2 });
    assert.equal(aumentado.existenciaTotal, 2); assert.equal((await fetch(base + `catalogo/${creado.id}`)).status, 200);
    const reducido = await api<ArticuloCatalogo>(`catalogo/${creado.id}/variantes/${variante.id}/existencias`, 'POST', { cambio: -2 });
    assert.equal(reducido.existenciaTotal, 0);
    const invalido = await fetch(base + `personal/catalogo/${creado.id}/variantes/${variante.id}/existencias`, { method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ cambio: -1 }) });
    assert.equal(invalido.status, 400);
    assert.equal((await api<ArticuloCatalogo>(`catalogo/${creado.id}`)).existenciaTotal, 0);
    if (anterior) assert.deepEqual(await api<PedidoDetalle>(`pedidos/${anterior.id}`), anterior);
    console.log(JSON.stringify({ resultado: 'OK', articuloId: creado.id, varianteId: variante.id, imagenPublica: true, cargaAnonimaDenegada: true,
      precioPersistido: 60.25, existenciaFinal: 0, pedidosConsultados: listado.pedidos.length, pedidoAnteriorConservado: true }, null, 2));
  } finally {
    await personal.auth.signOut({ scope: 'local' }); await new Promise<void>(r => servidor.close(() => r()));
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Falló la prueba del catálogo.'); process.exitCode = 1; });
