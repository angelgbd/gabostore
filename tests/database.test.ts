import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db: PGlite;
const personal = { sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', app_metadata: { rol: 'ADMIN' } };
type FilaId = { id: number };

before(async () => {
  db = new PGlite();
  // Solo en las pruebas: Supabase ya proporciona estos roles y auth.jwt().
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(auth.jwt() ->> 'sub', '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.jwt() to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean default false,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
    $$;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  `);
  const carpeta = new URL('../supabase/migrations/', import.meta.url);
  const archivos = (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort();
  for (const archivo of archivos) await db.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
});

after(async () => { await db?.close(); });

async function claims(valor: object) {
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(valor)]);
}

async function conRol<T>(rol: 'anon' | 'authenticated' | 'service_role', jwt: object, ejecutar: () => Promise<T>): Promise<T> {
  await claims(jwt);
  await db.exec(`set role ${rol}`);
  try { return await ejecutar(); }
  finally { await db.exec('reset role'); await claims({}); }
}

async function id(sql: string, parametros: unknown[] = []): Promise<number> {
  const { rows } = await db.query<FilaId>(sql, parametros);
  assert.ok(rows[0]);
  return Number(rows[0].id);
}

async function fixture() {
  const articulo = await id("insert into public.articulos(nombre,categoria,precio_base) values ('Camisa','Ropa',149.90) returning id");
  const variante = await id("insert into public.variantes(articulo_id,talla_medida,existencia) values ($1,'M',5) returning id", [articulo]);
  await db.query("insert into public.variantes(articulo_id,talla_medida,existencia) values ($1,'L',0)", [articulo]);
  const cliente = await id("insert into public.clientes(nombre,telefono) values ('Cliente de prueba','6621234567') returning id");
  const carrito = await conRol('authenticated', personal,
    () => id("select public.abrir_carrito($1,'cliente@example.com') as id", [cliente]));
  return { articulo, variante, cliente, carrito };
}

function codigoEsperado(codigo: string) {
  return (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === codigo;
}

test('Storage solo permite cargas del personal en su propia carpeta y no sobrescrituras', async () => {
  const archivo = `productos/${personal.sub}/prueba.png`;
  const insertar = (ruta: string) => db.query("insert into storage.objects(bucket_id,name) values ('catalogo',$1)", [ruta]);
  await conRol('anon', {}, () => assert.rejects(insertar(archivo), codigoEsperado('42501')));
  await conRol('authenticated', { sub: personal.sub, app_metadata: {} }, () => assert.rejects(insertar(archivo), codigoEsperado('42501')));
  await conRol('authenticated', personal, async () => {
    await insertar(archivo);
    await assert.rejects(insertar('demo/no-permitido.png'), codigoEsperado('42501'));
    await assert.rejects(insertar('productos/otro-usuario/archivo.png'), codigoEsperado('42501'));
    const actualizado = await db.query("update storage.objects set name='cambio.png' returning id");
    assert.equal(actualizado.rows.length, 0);
  });
  const bucket = await db.query<{ public: boolean; file_size_limit: number }>("select public,file_size_limit from storage.buckets where id='catalogo'");
  assert.equal(bucket.rows[0]?.public, true); assert.equal(Number(bucket.rows[0]?.file_size_limit), 5242880);
});

test('precio y existencia inválidos se rechazan; una creación compuesta fallida se revierte', async () => {
  await assert.rejects(db.query("insert into public.articulos(nombre,categoria,precio_base) values ('Mal','X',-1)"), codigoEsperado('23514'));
  const f = await fixture();
  await assert.rejects(db.query('update public.variantes set existencia = -1 where id=$1', [f.variante]), codigoEsperado('23514'));
  await conRol('authenticated', personal, async () => {
    await assert.rejects(db.query("select public.crear_articulo('Precio inválido','X',0.125)"), codigoEsperado('22023'));
    await assert.rejects(db.query("select public.crear_articulo('Artículo a revertir','X',10,'',false,$1::jsonb)",
      [JSON.stringify([{ talla_medida: 'Única', existencia: 1 }, { talla_medida: 'Única', existencia: 2 }])]), codigoEsperado('23505'));
    await assert.rejects(db.query("select public.crear_articulo('Fracción inválida','X',10,'',false,$1::jsonb)",
      [JSON.stringify([{ talla_medida: 'M', existencia: 1.5 }])]), codigoEsperado('22023'));
  });
  const revertidos = await db.query("select id from public.articulos where nombre = 'Artículo a revertir'");
  assert.equal(revertidos.rows.length, 0);
});

test('el catálogo público muestra todas las tallas de un artículo disponible y oculta agotados', async () => {
  const f = await fixture();
  const agotado = await id("insert into public.articulos(nombre,categoria,precio_base) values ('Agotado','X',12) returning id");
  await db.query("insert into public.variantes(articulo_id,talla_medida,existencia) values ($1,'Única',0)", [agotado]);
  await conRol('anon', {}, async () => {
    const disponible = await db.query<{ variantes: { existencia: number }[] }>('select * from public.obtener_catalogo($1)', [f.articulo]);
    assert.equal(disponible.rows.length, 1);
    assert.deepEqual(disponible.rows[0]?.variantes.map(v => v.existencia), [5, 0]);
    const oculto = await db.query('select * from public.obtener_catalogo($1)', [agotado]);
    assert.equal(oculto.rows.length, 0);
    await assert.rejects(db.query('select * from public.clientes'), codigoEsperado('42501'));
    await assert.rejects(db.query('select * from public.pedidos'), codigoEsperado('42501'));
    await assert.rejects(db.query("insert into public.articulos(nombre,categoria,precio_base) values ('Intruso','X',0)"), codigoEsperado('42501'));
    await assert.rejects(db.query('select public.crear_pedido_desde_carrito($1)', [f.carrito]), codigoEsperado('42501'));
  });
});

test('authenticated sin rol interno no lee ni escribe clientes; user_metadata no concede permisos', async () => {
  await fixture();
  for (const jwt of [{}, { sub: personal.sub, user_metadata: { rol: 'ADMIN' } }, { app_metadata: { rol: 'ADMIN' } }]) {
    await conRol('authenticated', jwt, async () => {
      const clientes = await db.query('select * from public.clientes');
      assert.equal(clientes.rows.length, 0);
      await assert.rejects(db.query("insert into public.clientes(nombre,telefono) values ('Intruso','1')"), codigoEsperado('42501'));
      await assert.rejects(db.query('select public.crear_pedido_desde_carrito(1)'), codigoEsperado('42501'));
    });
  }
  await conRol('authenticated', { sub: personal.sub, app_metadata: { rol: 'EMPLEADO' } }, async () => {
    const clientes = await db.query('select * from public.clientes');
    assert.ok(clientes.rows.length > 0);
  });
});

test('cada carrito genera un solo pedido, conserva precios y se cierra; el siguiente carrito es nuevo', async () => {
  const f = await fixture();
  await conRol('authenticated', personal, async () => {
    await db.query('select public.guardar_item_carrito($1,$2,3,0.10)', [f.carrito, f.variante]);
    const pedido = await id('select public.crear_pedido_desde_carrito($1) as id', [f.carrito]);
    const repetido = await id('select public.crear_pedido_desde_carrito($1) as id', [f.carrito]);
    assert.equal(repetido, pedido);
    const lineas = await db.query<{ cantidad: number; precio_unitario: string; subtotal: string }>(
      'select cantidad,precio_unitario,subtotal from public.items_pedido where pedido_id=$1', [pedido]);
    assert.equal(lineas.rows[0]?.cantidad, 3);
    assert.equal(Number(lineas.rows[0]?.precio_unitario), 0.1);
    assert.equal(Number(lineas.rows[0]?.subtotal), 0.3);
    await db.query('update public.articulos set precio_base = 199 where id=$1', [f.articulo]);
    const copia = await db.query<{ subtotal: string }>('select subtotal from public.items_pedido where pedido_id=$1', [pedido]);
    assert.equal(Number(copia.rows[0]?.subtotal), 0.3);
    await assert.rejects(db.query('select public.guardar_item_carrito($1,$2,4)', [f.carrito, f.variante]), codigoEsperado('55000'));
    await assert.rejects(db.query('delete from public.items_carrito where carrito_id=$1', [f.carrito]), codigoEsperado('55000'));
    await assert.rejects(db.query('update public.carritos set cerrado=false where id=$1', [f.carrito]), codigoEsperado('55000'));
    await assert.rejects(db.query('insert into public.items_pedido(pedido_id,variante_id,cantidad,precio_unitario) values ($1,$2,1,1)',
      [pedido, f.variante]), codigoEsperado('42501'));
    await assert.rejects(db.query('update public.pedidos set correo_cliente=$1 where id=$2', ['otra@example.com', pedido]), codigoEsperado('42501'));
    const nuevo = await id("select public.abrir_carrito($1,'cliente@example.com') as id", [f.cliente]);
    assert.notEqual(nuevo, f.carrito);
    const mismoAbierto = await id("select public.abrir_carrito($1,'cliente@example.com') as id", [f.cliente]);
    assert.equal(mismoAbierto, nuevo);
    await db.query('select public.guardar_item_carrito($1,$2,1)', [nuevo, f.variante]);
    const segundoPedido = await id('select public.crear_pedido_desde_carrito($1) as id', [nuevo]);
    assert.notEqual(segundoPedido, pedido);
    const historial = await db.query('select id from public.pedidos where cliente_id=$1', [f.cliente]);
    assert.equal(historial.rows.length, 2);
    const stock = await db.query<{ existencia: number }>('select existencia from public.variantes where id=$1', [f.variante]);
    assert.equal(stock.rows[0]?.existencia, 5, 'crear un pedido pendiente no equivale a una venta');
  });
});

test('un pedido vacío o una cantidad inválida no dejan registros parciales', async () => {
  const f = await fixture();
  await conRol('authenticated', personal, async () => {
    await assert.rejects(db.query('select public.crear_pedido_desde_carrito($1)', [f.carrito]), codigoEsperado('22023'));
    await assert.rejects(db.query('select public.guardar_item_carrito($1,$2,0)', [f.carrito, f.variante]), codigoEsperado('23514'));
    await assert.rejects(db.query('select public.guardar_item_carrito($1,$2,1,1.234)', [f.carrito, f.variante]), codigoEsperado('22023'));
    const pedidos = await db.query('select id from public.pedidos where carrito_id=$1', [f.carrito]);
    const carritos = await db.query<{ cerrado: boolean }>('select cerrado from public.carritos where id=$1', [f.carrito]);
    assert.equal(pedidos.rows.length, 0);
    assert.equal(carritos.rows[0]?.cerrado, false);
  });
});

test('el subtotal es calculado por PostgreSQL y las líneas históricas tampoco son editables por el propietario', async () => {
  const f = await fixture();
  await conRol('authenticated', personal, async () => {
    await db.query('select public.guardar_item_carrito($1,$2,2)', [f.carrito, f.variante]);
    await assert.rejects(db.query('update public.items_carrito set subtotal=1 where carrito_id=$1', [f.carrito]), codigoEsperado('428C9'));
  });
  await claims(personal);
  const pedido = await id('select public.crear_pedido_desde_carrito($1) as id', [f.carrito]);
  await claims({});
  await assert.rejects(db.query('update public.items_pedido set cantidad=99 where pedido_id=$1', [pedido]), codigoEsperado('55000'));
  await assert.rejects(db.query('delete from public.pedidos where id=$1', [pedido]), codigoEsperado('55000'));
});

test('los ajustes de existencia son atómicos y no permiten saldo negativo', async () => {
  const f = await fixture();
  await conRol('authenticated', personal, async () => {
    await db.query('select public.ajustar_existencia($1,3)', [f.variante]);
    await db.query('select public.ajustar_existencia($1,-2)', [f.variante]);
    await assert.rejects(db.query('select public.ajustar_existencia($1,-7)', [f.variante]), codigoEsperado('23514'));
    const resultado = await db.query<{ existencia: number }>('select existencia from public.variantes where id=$1', [f.variante]);
    assert.equal(resultado.rows[0]?.existencia, 6);
  });
});

test('solo se guardan estados del modelo aprobado y se conserva la fecha de creación', async () => {
  const f = await fixture();
  await conRol('authenticated', personal, async () => {
    await db.query('select public.guardar_item_carrito($1,$2,1)', [f.carrito, f.variante]);
    const pedido = await id('select public.crear_pedido_desde_carrito($1) as id', [f.carrito]);
    const anterior = await db.query<{ estado: string; fecha_creacion: Date }>('select estado,fecha_creacion from public.pedidos where id=$1', [pedido]);
    assert.equal(anterior.rows[0]?.estado, 'PENDIENTE');
    await db.query("update public.pedidos set estado='CONFIRMADO' where id=$1", [pedido]);
    await assert.rejects(db.query("update public.pedidos set estado='DESCONOCIDO' where id=$1", [pedido]), codigoEsperado('22P02'));
    const posterior = await db.query<{ fecha_creacion: Date }>('select fecha_creacion from public.pedidos where id=$1', [pedido]);
    assert.deepEqual(posterior.rows[0]?.fecha_creacion, anterior.rows[0]?.fecha_creacion);
  });
});

test('la demo persistente deja sus datos y repetir la carga no los duplica', async () => {
  const sql = await readFile(new URL('../supabase/demo/cargar.sql', import.meta.url), 'utf8');
  const anteriores = await db.query<{ total: number }>('select count(*)::integer as total from public.articulos');
  await db.exec(sql);
  await db.exec(sql);
  const articulos = await db.query<{ total: number }>('select count(*)::integer as total from public.articulos');
  assert.equal(articulos.rows[0]?.total, Number(anteriores.rows[0]?.total) + 2);
  const resumen = await db.query<{ id: number; estado: string; total: string }>(`
    select p.id,p.estado,sum(i.subtotal) as total from public.pedidos p
    join public.clientes c on c.id=p.cliente_id join public.items_pedido i on i.pedido_id=p.id
    where c.nombre='DEMO GaboStore - Cliente' group by p.id
  `);
  assert.equal(resumen.rows.length, 1);
  assert.equal(resumen.rows[0]?.estado, 'CONFIRMADO');
  assert.equal(Number(resumen.rows[0]?.total), 498.8);
  const carritos = await db.query<{ cerrado: boolean }>(`
    select ca.cerrado from public.carritos ca join public.clientes c on c.id=ca.cliente_id
    where c.nombre='DEMO GaboStore - Cliente' order by ca.id
  `);
  assert.deepEqual(carritos.rows.map(c => c.cerrado), [true, false]);
});

test('guardar el objeto persiste toda la cabecera y el detalle, calcula subtotales y admite reintentos', async () => {
  const f = await fixture();
  const otra = await id("insert into public.variantes(articulo_id,talla_medida,existencia) values ($1,'XL',2) returning id", [f.articulo]);
  const items = JSON.stringify([
    { variante_id: f.variante, cantidad: 2, precio_unitario: 149.9 },
    { variante_id: otra, cantidad: 1, precio_unitario: 159.9 },
  ]);
  await conRol('authenticated', personal, async () => {
    // El carrito inicialmente no tiene líneas; el pedido aporta el detalle completo.
    const parametros = [f.cliente, f.carrito, items];
    const sql = "select public.guardar_pedido($1,$2,'  CLIENTE@example.com  ',$3::jsonb,'PENDIENTE') as id";
    const pedido = await id(sql, parametros);
    assert.equal(await id(sql, parametros), pedido);
    const cabecera = await db.query<{ cliente_id: string; carrito_id: string; correo_cliente: string; estado: string; fecha_creacion: Date }>(
      'select * from public.pedidos where id=$1', [pedido]);
    assert.equal(Number(cabecera.rows[0]?.cliente_id), f.cliente);
    assert.equal(Number(cabecera.rows[0]?.carrito_id), f.carrito);
    assert.equal(cabecera.rows[0]?.correo_cliente, 'cliente@example.com');
    assert.equal(cabecera.rows[0]?.estado, 'PENDIENTE');
    const autor = await db.query<{ creado_por: string }>('select creado_por from public.pedidos where id=$1', [pedido]);
    assert.equal(autor.rows[0]?.creado_por, personal.sub);
    assert.ok(cabecera.rows[0]?.fecha_creacion instanceof Date);
    const detalle = await db.query<{ variante_id: string; cantidad: number; precio_unitario: string; subtotal: string }>(
      'select variante_id,cantidad,precio_unitario,subtotal from public.items_pedido where pedido_id=$1 order by variante_id', [pedido]);
    assert.deepEqual(detalle.rows.map(i => ({ variante: Number(i.variante_id), cantidad: i.cantidad,
      precio: Number(i.precio_unitario), subtotal: Number(i.subtotal) })), [
      { variante: f.variante, cantidad: 2, precio: 149.9, subtotal: 299.8 },
      { variante: otra, cantidad: 1, precio: 159.9, subtotal: 159.9 },
    ]);
    assert.equal((await db.query<{ cerrado: boolean }>('select cerrado from public.carritos where id=$1', [f.carrito])).rows[0]?.cerrado, true);
    const cambiado = JSON.stringify([{ variante_id: f.variante, cantidad: 9, precio_unitario: 1 }]);
    await assert.rejects(id(sql, [f.cliente, f.carrito, cambiado]), codigoEsperado('55000'));
    await db.query("update public.pedidos set estado='CONFIRMADO' where id=$1", [pedido]);
    assert.equal(await id(sql, parametros), pedido, 'El reintento no revierte un cambio de estado posterior.');
    assert.equal((await db.query<{ estado: string }>('select estado from public.pedidos where id=$1', [pedido])).rows[0]?.estado, 'CONFIRMADO');
    assert.equal((await db.query('select id from public.pedidos where carrito_id=$1', [f.carrito])).rows.length, 1);
  });
});

test('si un detalle no existe se revierte el pedido completo y se conserva el carrito anterior', async () => {
  const f = await fixture();
  await conRol('authenticated', personal, async () => {
    await db.query('select public.guardar_item_carrito($1,$2,3,10)', [f.carrito, f.variante]);
    const items = [{ variante_id: f.variante, cantidad: 2, precio_unitario: 149.9 },
      { variante_id: 9007199254740991, cantidad: 1, precio_unitario: 1 }];
    await assert.rejects(db.query("select public.guardar_pedido($1,$2,'otro@example.com',$3::jsonb)",
      [f.cliente, f.carrito, JSON.stringify(items)]), codigoEsperado('23503'));
    assert.equal((await db.query('select id from public.pedidos where carrito_id=$1', [f.carrito])).rows.length, 0);
    const carrito = await db.query<{ cerrado: boolean; correo_cliente: string }>('select cerrado,correo_cliente from public.carritos where id=$1', [f.carrito]);
    assert.deepEqual(carrito.rows[0], { cerrado: false, correo_cliente: 'cliente@example.com' });
    const detalle = await db.query<{ cantidad: number; precio_unitario: string }>('select cantidad,precio_unitario from public.items_carrito where carrito_id=$1', [f.carrito]);
    assert.equal(detalle.rows.length, 1);
    assert.equal(detalle.rows[0]?.cantidad, 3);
    assert.equal(Number(detalle.rows[0]?.precio_unitario), 10);
  });
});

test('guardar rechaza datos inválidos, variantes repetidas y un cliente ajeno al carrito', async () => {
  const f = await fixture();
  const linea = { variante_id: f.variante, cantidad: 1, precio_unitario: 149.9 };
  await conRol('authenticated', personal, async () => {
    for (const items of [[], null, {}, [null], [linea, linea], [{ ...linea, cantidad: 0 }],
      [{ ...linea, cantidad: 1.5 }], [{ ...linea, precio_unitario: 1.234 }],
      [{ ...linea, precio_unitario: '10' }], [{ ...linea, precio_unitario: -1 }]]) {
      await assert.rejects(db.query("select public.guardar_pedido($1,$2,'cliente@example.com',$3::jsonb)",
        [f.cliente, f.carrito, JSON.stringify(items)]), codigoEsperado('22023'));
    }
    await assert.rejects(db.query("select public.guardar_pedido($1,$2,'cliente@example.com',$3::jsonb)",
      [f.cliente + 1, f.carrito, JSON.stringify([linea])]), codigoEsperado('22023'));
    assert.equal((await db.query('select id from public.pedidos where carrito_id=$1', [f.carrito])).rows.length, 0);
  });
});

test('guardar solo admite personal autenticado o el rol SQL real del backend', async () => {
  const f = await fixture();
  const parametros = [f.cliente, f.carrito, JSON.stringify([{ variante_id: f.variante, cantidad: 1, precio_unitario: 10 }])];
  const sql = "select public.guardar_pedido($1,$2,'cliente@example.com',$3::jsonb) as id";
  await conRol('anon', {}, () => assert.rejects(db.query(sql, parametros), codigoEsperado('42501')));
  for (const jwt of [{}, { sub: personal.sub, user_metadata: { rol: 'ADMIN' } },
    { app_metadata: { rol: 'ADMIN' } }, { role: 'service_role' }]) {
    await conRol('authenticated', jwt, () => assert.rejects(db.query(sql, parametros), codigoEsperado('42501')));
  }
  await conRol('service_role', { role: 'service_role' }, async () => {
    const pedido = await id(sql, parametros);
    assert.equal((await db.query('select * from public.items_pedido where pedido_id=$1', [pedido])).rows.length, 1);
  });
});


test('los contratos nuevos guardan sin correo y conservan los valores históricos', async () => {
  const f = await fixture();
  const antes = await db.query<{correo_cliente: string}>('select correo_cliente from public.carritos where id=$1', [f.carrito]);
  const pedido = await conRol('authenticated', personal, () => id('select public.guardar_pedido($1,$2,$3::jsonb) as id',
    [f.cliente, f.carrito, JSON.stringify([{variante_id: f.variante, cantidad: 1, precio_unitario: 149.9}])]));
  const filas = await db.query<{correo_cliente: string | null}>('select correo_cliente from public.pedidos where id=$1', [pedido]);
  assert.equal(filas.rows[0]?.correo_cliente, null);
  assert.equal((await db.query<{correo_cliente: string}>('select correo_cliente from public.carritos where id=$1', [f.carrito])).rows[0]?.correo_cliente, antes.rows[0]?.correo_cliente);
  const otro = await conRol('authenticated', personal, () => id('select public.abrir_carrito($1) as id', [f.cliente]));
  assert.equal((await db.query<{correo_cliente: string | null}>('select correo_cliente from public.carritos where id=$1', [otro])).rows[0]?.correo_cliente, null);
});


test('pedido público atómico: sin cliente, precio del servidor, sin descuento y reintento idéntico', async () => {
  const f=await fixture(); const clave=crypto.randomUUID(); const items=JSON.stringify([{variante_id:f.variante,cantidad:2}]);
  const contar=async()=> (await db.query<{n:number}>('select count(*)::int n from public.clientes')).rows[0]!.n;
  const clientes=await contar();
  const registrar=()=>conRol('service_role', {}, async()=> (await db.query<{r:{id:number;venceEn:string;fechaCreacion:string;items:{precioUnitario:number}[]}}>('select public.registrar_pedido_publico($1,$2::jsonb) r',[clave,items])).rows[0]!.r);
  await conRol('anon',{},()=>assert.rejects(db.query('select public.registrar_pedido_publico($1,$2::jsonb)',[clave,items]),codigoEsperado('42501')));
  await conRol('authenticated',personal,()=>assert.rejects(db.query('select public.registrar_pedido_publico($1,$2::jsonb)',[clave,items]),codigoEsperado('42501')));
  const r=await registrar(); assert.equal(r.items[0]?.precioUnitario,149.9); assert.equal(Date.parse(r.venceEn)-Date.parse(r.fechaCreacion),120*3600000);
  const fila=(await db.query<{cliente_id:null;creado_por:null;cerrado:boolean;correo_cliente:null}>(
    'select p.cliente_id,p.creado_por,p.correo_cliente,c.cerrado from public.pedidos p join public.carritos c on c.id=p.carrito_id where p.id=$1',[r.id])).rows[0]!;
  assert.equal(fila.cliente_id,null); assert.equal(fila.creado_por,null); assert.equal(fila.correo_cliente,null); assert.equal(fila.cerrado,true);
  await db.query('update public.articulos set precio_base=300 where id=$1',[f.articulo]); assert.deepEqual(await registrar(),r);
  assert.equal(await contar(),clientes); assert.equal((await db.query<{existencia:number}>('select existencia from public.variantes where id=$1',[f.variante])).rows[0]?.existencia,5);
  await conRol('service_role',{},()=>assert.rejects(db.query('select public.registrar_pedido_publico($1,$2::jsonb)',[clave,JSON.stringify([{variante_id:f.variante,cantidad:3}])]),codigoEsperado('55000')));
});

test('registro público rechaza datos manipulados y no deja filas parciales; sobre pedido oculta precio', async()=>{
  const f=await fixture();
  const n=()=>db.query<{n:number}>('select count(*)::int n from public.pedidos'); const antes=(await n()).rows[0]!.n;
  for(const items of [[],[{variante_id:f.variante,cantidad:0}],[{variante_id:f.variante,cantidad:6}],[{variante_id:f.variante,cantidad:1,precio_unitario:0}], [{variante_id:f.variante,cantidad:1},{variante_id:f.variante,cantidad:1}]]) {
    await conRol('service_role',{},()=>assert.rejects(db.query('select public.registrar_pedido_publico($1,$2::jsonb)',[crypto.randomUUID(),JSON.stringify(items)])));
  }
  assert.equal((await n()).rows[0]?.n,antes);
  await db.query('update public.articulos set sobre_pedido=true,precio_base=999 where id=$1',[f.articulo]);
  const resultado=await conRol('service_role',{},()=>db.query<{r:{id:number;items:{precioUnitario:null;sobrePedido:boolean}[]}}>('select public.registrar_pedido_publico($1,$2::jsonb) r',[crypto.randomUUID(),JSON.stringify([{variante_id:f.variante,cantidad:20}])]));
  assert.equal(resultado.rows[0]?.r.items[0]?.precioUnitario,null); assert.equal(resultado.rows[0]?.r.items[0]?.sobrePedido,true);
  assert.equal((await db.query<{precio_unitario:number}>('select precio_unitario from public.items_pedido where pedido_id=$1',[resultado.rows[0]!.r.id])).rows[0]?.precio_unitario,'999.00');
});
