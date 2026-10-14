import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL temporal: utiliza las migraciones y funciones del proyecto.
// No lee .env ni realiza conexiones a Supabase.
const pg = new PGlite();
const pasoAPaso = process.argv.includes('--paso-a-paso');
const terminal = pasoAPaso && stdin.isTTY ? createInterface({ input: stdin, output: stdout }) : null;
const pesos = valor => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor));

async function mostrar(titulo, filas) {
  console.log(`\n${titulo}`);
  if (filas) console.table(filas);
  if (terminal) await terminal.question('Presiona Enter para continuar... ');
}

async function id(sql, parametros = []) {
  const { rows } = await pg.query(sql, parametros);
  assert.ok(rows[0], 'La operación debe devolver un registro.');
  return Number(rows[0].id);
}

const codigo = esperado => error => error?.code === esperado;

async function ejecutarDemo() {
  console.log('GABOSTORE: DEMO EN TERMINAL');
  console.log('Datos ficticios en memoria. No modifica tu Supabase real.');
  if (pasoAPaso && !terminal) console.log('Sin terminal interactiva: se ejecutará de forma automática.');

  // Simula los roles y la identidad interna que Supabase aporta normalmente.
  await pg.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(auth.jwt() ->> 'sub', '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
  `);
  const carpeta = new URL('../supabase/migrations/', import.meta.url);
  const archivos = (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort();
  for (const archivo of archivos) await pg.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  await pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({
    sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', app_metadata: { rol: 'ADMIN' },
  })]);
  await pg.exec('set role authenticated');

  const camisa = await id("select public.crear_articulo($1,$2,$3,'',false,$4::jsonb) as id", [
    'Camisa básica (demo)', 'Ropa', 149.9,
    JSON.stringify([{ talla_medida: 'M', existencia: 5 }, { talla_medida: 'L', existencia: 0 }]),
  ]);
  const gorra = await id("select public.crear_articulo($1,$2,$3,'',false,$4::jsonb) as id", [
    'Gorra (demo)', 'Accesorios', 199,
    JSON.stringify([{ talla_medida: 'Única', existencia: 3 }]),
  ]);
  const varianteCamisa = await id("select id from public.variantes where articulo_id=$1 and talla_medida='M'", [camisa]);
  const varianteGorra = await id('select id from public.variantes where articulo_id=$1', [gorra]);
  const catalogo = await pg.query('select * from public.obtener_catalogo()');
  assert.equal(catalogo.rows.length, 2);
  await mostrar('1. Productos y variantes creados', catalogo.rows.map(a => ({
    producto: a.nombre, precio: pesos(a.precio_base),
    variantes: a.variantes.map(v => `${v.talla_medida}: ${v.existencia} unidades`).join(' | '),
  })));

  const cliente = await id("insert into public.clientes(nombre,telefono) values ($1,$2) returning id", ['Cliente Demo', '0000000000']);
  const carrito = await id('select public.abrir_carrito($1,$2) as id', [cliente, 'demo@example.com']);
  await pg.query('select public.guardar_item_carrito($1,$2,2)', [carrito, varianteCamisa]);
  await pg.query('select public.guardar_item_carrito($1,$2,1)', [carrito, varianteGorra]);
  const lineas = await pg.query(`
    select a.nombre, v.talla_medida, i.cantidad, i.precio_unitario, i.subtotal
    from public.items_carrito i join public.variantes v on v.id=i.variante_id
    join public.articulos a on a.id=v.articulo_id where i.carrito_id=$1 order by v.id
  `, [carrito]);
  const total = await pg.query('select sum(subtotal) as total from public.items_carrito where carrito_id=$1', [carrito]);
  assert.equal(Number(total.rows[0].total), 498.8);
  await mostrar(`2. Cliente #${cliente}, carrito #${carrito}. Total: ${pesos(total.rows[0].total)}`, lineas.rows.map(i => ({
    producto: i.nombre, talla: i.talla_medida, cantidad: i.cantidad,
    precio: pesos(i.precio_unitario), subtotal: pesos(i.subtotal),
  })));

  await assert.rejects(pg.query('select public.guardar_item_carrito($1,$2,0)', [carrito, varianteCamisa]), codigo('23514'));
  await mostrar('3. Validación correcta: una cantidad de cero fue rechazada.');

  const pedido = await id('select public.crear_pedido_desde_carrito($1) as id', [carrito]);
  const repetido = await id('select public.crear_pedido_desde_carrito($1) as id', [carrito]);
  assert.equal(repetido, pedido);
  const registro = await pg.query('select id,carrito_id,estado,correo_cliente from public.pedidos where id=$1', [pedido]);
  await mostrar('4. Pedido generado. Repetir la operación devuelve el mismo pedido.', registro.rows);

  await pg.query("update public.pedidos set estado='CONFIRMADO' where id=$1", [pedido]);
  const estado = await pg.query('select id,estado from public.pedidos where id=$1', [pedido]);
  assert.equal(estado.rows[0].estado, 'CONFIRMADO');
  await mostrar('5. Estado actualizado a CONFIRMADO.', estado.rows);

  await pg.query('update public.articulos set precio_base=169.90 where id=$1', [camisa]);
  const historico = await pg.query('select precio_unitario from public.items_pedido where pedido_id=$1 and variante_id=$2', [pedido, varianteCamisa]);
  assert.equal(Number(historico.rows[0].precio_unitario), 149.9);
  await mostrar('6. El precio del catálogo cambia; el pedido conserva el precio original.', [{
    producto: 'Camisa básica (demo)', precioActual: pesos(169.9), precioEnElPedido: pesos(historico.rows[0].precio_unitario),
  }]);

  await assert.rejects(pg.query('select public.guardar_item_carrito($1,$2,3)', [carrito, varianteCamisa]), codigo('55000'));
  const nuevo = await id('select public.abrir_carrito($1,$2) as id', [cliente, 'demo@example.com']);
  assert.notEqual(nuevo, carrito);
  const carritos = await pg.query('select id,cerrado from public.carritos where cliente_id=$1 order by id', [cliente]);
  await mostrar('7. El carrito anterior está protegido. La siguiente compra tiene uno nuevo.', carritos.rows);

  await pg.exec('reset role; set role anon');
  await assert.rejects(pg.query('select * from public.clientes'), codigo('42501'));
  const publico = await pg.query('select * from public.obtener_catalogo()');
  assert.equal(publico.rows.length, 2);
  await mostrar('8. El acceso público consulta el catálogo, pero no puede leer clientes.');
  console.log('\nDEMO COMPLETADA: todas las comprobaciones pasaron.');
  console.log('La base temporal se cierra ahora. Puedes repetir la demo desde cero.');
}

try {
  await ejecutarDemo();
} catch (error) {
  console.error('\nLa demo falló:', error.message);
  process.exitCode = 1;
} finally {
  terminal?.close();
  await pg.close();
}
