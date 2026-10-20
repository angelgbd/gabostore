import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { crearServidor } from '../src/servidor/aplicacion.js';
import type { Database } from '../src/database.types.js';

const clave = 'sb_publishable_prueba';
const servidor = crearServidor({ url: 'https://prueba.supabase.co', clavePublica: clave, carpetaWeb: 'web-dist',
  conectar: token => createClient<Database>('https://prueba.supabase.co', clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async entrada => {
      const url = String(entrada);
      if (url.includes('/auth/v1/user')) return Response.json({ id: 'usuario', email: 'cliente@example.com', app_metadata: {} });
      if (url.includes('obtener_catalogo')) return Response.json([]);
      throw new Error(`Petición inesperada: ${url} ${Boolean(token)}`);
    } },
  }),
});
let base: string;
before(async () => {
  await new Promise<void>(resolver => servidor.listen(0, '127.0.0.1', resolver));
  const direccion = servidor.address();
  assert.ok(direccion && typeof direccion === 'object');
  base = `http://127.0.0.1:${direccion.port}`;
});
after(async () => { await new Promise<void>((resolver, rechazar) => servidor.close(error => error ? rechazar(error) : resolver())); });

test('la configuración pública entrega solo URL, clave pública y destino WhatsApp', async () => {
  const respuesta = await fetch(`${base}/api/config`);
  assert.deepEqual(await respuesta.json(), { url: 'https://prueba.supabase.co', clavePublica: clave, whatsappNumero: null });
  assert.match(respuesta.headers.get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
});

test('el catálogo es público y todas las operaciones de carritos y pedidos requieren sesión', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/catalogo`)).json(), []);
  for (const ruta of ['/api/personal/carritos/1', '/api/personal/pedidos/1', '/api/personal/catalogo']) {
    assert.equal((await fetch(base + ruta)).status, 401);
  }
  assert.equal((await fetch(`${base}/api/personal/carritos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
});

test('una cuenta autenticada sin app_metadata de personal no accede al registro de pedidos', async () => {
  const respuesta = await fetch(`${base}/api/personal/sesion`, { headers: { Authorization: 'Bearer token-sin-rol' } });
  assert.equal(respuesta.status, 403);
});

test('no se sirven archivos privados ni rutas de API inexistentes', async () => {
  assert.equal((await fetch(`${base}/.env`)).status, 404);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  assert.equal((await fetch(`${base}/api/pedidos`)).status, 404);
});
