import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {crearServidor} from '../src/servidor/aplicacion.js';
import type {ArticuloCatalogo,PedidoDetalle} from '../src/index.js';
import type {UsuarioPersonal} from '../src/negocio/ControlUsuarios.js';
import type {RegistroMaestro} from '../src/negocio/ControlMaestros.js';
import type {CompraRegistrada} from '../src/negocio/ControlCompras.js';
import type {VentaRegistrada} from '../src/negocio/ControlVentas.js';

async function main(){
 const url=process.env.SUPABASE_URL,clave=process.env.SUPABASE_PUBLISHABLE_KEY,secreto=process.env.SUPABASE_SECRET_KEY;
 const emailAdmin=process.env.GABOSTORE_ADMIN_EMAIL,passAdmin=process.env.GABOSTORE_ADMIN_PASSWORD,emailPersonal=process.env.GABOSTORE_PERSONAL_EMAIL,passPersonal=process.env.GABOSTORE_PERSONAL_PASSWORD;
 assert.ok(url&&clave&&secreto&&emailAdmin&&passAdmin&&emailPersonal&&passPersonal,'Configura .env, .env.admin.local y .env.personal.local.');
 const admin=createClient(url,clave,{auth:{persistSession:false,autoRefreshToken:false}}),empleado=createClient(url,clave,{auth:{persistSession:false,autoRefreshToken:false}});
 const aa=await admin.auth.signInWithPassword({email:emailAdmin,password:passAdmin}),ee=await empleado.auth.signInWithPassword({email:emailPersonal,password:passPersonal});assert.ifError(aa.error);assert.ifError(ee.error);assert.ok(aa.data.session&&ee.data.session);
 const tokens={admin:aa.data.session.access_token,empleado:ee.data.session.access_token};
 const servidor=crearServidor({url,clavePublica:clave,claveServidor:secreto,carpetaWeb:'web-dist'});await new Promise<void>(r=>servidor.listen(0,'127.0.0.1',r));const direccion=servidor.address();assert.ok(direccion&&typeof direccion==='object');const base=`http://127.0.0.1:${direccion.port}/api/`;
 async function peticion(ruta:string,metodo='GET',datos?:unknown,rol:'admin'|'empleado'='admin'){return fetch(base+`personal/${ruta}`,{method:metodo,headers:{Authorization:`Bearer ${tokens[rol]}`,...(datos!==undefined?{'Content-Type':'application/json'}:{})},...(datos!==undefined?{body:JSON.stringify(datos)}:{})});}
 async function api<T>(ruta:string,metodo='GET',datos?:unknown,rol:'admin'|'empleado'='admin'):Promise<T>{const r=await peticion(ruta,metodo,datos,rol);const d=await r.json() as T&{error?:string};assert.ok(r.ok,`${metodo} ${ruta}: ${r.status} ${d.error??''}`);return d;}
 const sello=new Date().toISOString(),ids:number[]=[];let categoria:RegistroMaestro|undefined,proveedor:RegistroMaestro|undefined,usuario:UsuarioPersonal|undefined;
 try{
  const previos=await api<{pedidos:{id:number;total:number}[]}>('pedidos');
  assert.equal((await peticion('usuarios','GET',undefined,'empleado')).status,403);
  assert.equal((await peticion('categorias','POST',{nombre:'No permitido',activo:true},'empleado')).status,403);
  assert.equal((await peticion(`usuarios/${aa.data.user!.id}`,'PATCH',{nombre:'Administrador de prueba GaboStore',rol:'ADMIN',activo:false})).status,400);
  usuario=await api<UsuarioPersonal>('usuarios','POST',{nombre:`DEMO Release1 ${sello}`,email:`demo.release1.${Date.now()}@gabostore.local`,password:randomBytes(18).toString('hex')+'aA1!',rol:'EMPLEADO'});
  await api(`usuarios/${usuario.id}`,'PATCH',{nombre:usuario.nombre,rol:'EMPLEADO',activo:false});
  categoria=await api<RegistroMaestro>('categorias','POST',{nombre:`DEMO Release1 ${sello}`,descripcion:'Prueba de integración',activo:true});
  proveedor=await api<RegistroMaestro>('proveedores','POST',{nombre:`DEMO Proveedor ${sello}`,contacto:'Proveedor ficticio',telefono:'6620000000',direccion:'Datos de prueba',activo:true});
  let articulo=await api<ArticuloCatalogo>('catalogo','POST',{nombre:`DEMO RELEASE1 ${sello}`,categoria:categoria.nombre,precioBase:100,variantes:[{tallaMedida:'Única',existencia:0}]},'empleado');ids.push(articulo.id);
  articulo=await api<ArticuloCatalogo>(`catalogo/${articulo.id}/variantes/${articulo.variantes[0]!.id}`,'PATCH',{tallaMedida:'Única',recargo:25,activo:true},'empleado');const variante=articulo.variantes[0]!;
  assert.equal((await peticion(`catalogo/${articulo.id}/variantes`,'POST',{tallaMedida:' única ',recargo:0,activo:true},'empleado')).status,400);
  await api(`categorias/${categoria.id}`,'PATCH',{nombre:categoria.nombre+' editada',descripcion:'Se propagó el nombre',activo:true});
  const dia=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Hermosillo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const datosCompra={claveSolicitud:crypto.randomUUID(),proveedorId:proveedor.id,fechaRecepcion:dia,referencia:`DEMO Release1 ${sello}`,items:[{varianteId:variante.id,cantidad:5,costoUnitario:20.5},{nuevoArticulo:{nombre:`DEMO NUEVO EN COMPRA ${sello}`,categoriaId:categoria.id,precioBase:50,tallaMedida:'M'},cantidad:2,costoUnitario:10}]};
  const compra=await api<CompraRegistrada>('compras','POST',datosCompra,'empleado');assert.equal(compra.total,122.5);ids.push(...compra.items.map(i=>i.articuloId).filter(id=>!ids.includes(id)));
  const repetida=await api<CompraRegistrada>('compras','POST',datosCompra,'empleado');assert.equal(repetida.id,compra.id);
  const ver=()=>api<ArticuloCatalogo>(`catalogo/${articulo.id}`);assert.equal((await ver()).variantes.find(v=>v.id===variante.id)?.existencia,5);
  const datosVenta={claveSolicitud:crypto.randomUUID(),items:[{varianteId:variante.id,cantidad:1}],importePagado:125,metodoPago:'EFECTIVO',confirmacionesProveedor:[]};
  assert.equal((await peticion('ventas','POST',{...datosVenta,importePagado:1},'empleado')).status,400);
  const venta=await api<VentaRegistrada>('ventas','POST',datosVenta,'empleado');assert.equal(venta.total,125);assert.equal((await api<VentaRegistrada>('ventas','POST',datosVenta,'empleado')).id,venta.id);assert.equal((await ver()).variantes.find(v=>v.id===variante.id)?.existencia,4);
  const carrera=await Promise.all([1,2].map(()=>peticion('ventas','POST',{...datosVenta,claveSolicitud:crypto.randomUUID(),items:[{varianteId:variante.id,cantidad:4}],importePagado:500},'empleado')));assert.deepEqual(carrera.map(r=>r.status).sort(),[201,400]);assert.equal((await ver()).variantes.find(v=>v.id===variante.id)?.existencia,0);
  await api('compras','POST',{...datosCompra,claveSolicitud:crypto.randomUUID(),items:[{varianteId:variante.id,cantidad:1,costoUnitario:20.5}]},'empleado');
  const carrito=await api<{id:number}>('carritos','POST',{nombre:`DEMO Venta de pedido ${sello}`,telefono:'6620000000'},'empleado');await api(`carritos/${carrito.id}/items`,'POST',{articuloId:articulo.id,varianteId:variante.id,cantidad:1},'empleado');
  const pedido=await api<PedidoDetalle>('pedidos','POST',{carritoId:carrito.id,confirmacionesProveedor:[]},'empleado');await api(`pedidos/${pedido.id}/confirmar`,'POST',{confirmacionesProveedor:[]},'empleado');
  await api(`catalogo/${articulo.id}`,'PATCH',{precioBase:200},'empleado');
  const ventaPedido=await api<VentaRegistrada>('ventas','POST',{claveSolicitud:crypto.randomUUID(),pedidoId:pedido.id,items:[],importePagado:125,metodoPago:'TRANSFERENCIA',confirmacionesProveedor:[]},'empleado');assert.equal(ventaPedido.total,125);assert.equal(ventaPedido.pedidoId,pedido.id);
  assert.equal((await api<VentaRegistrada>(`ventas/${venta.id}`)).items[0]?.precioUnitario,125);
  for(const anterior of previos.pedidos){const p=await api<PedidoDetalle>(`pedidos/${anterior.id}`);assert.equal(p.total,anterior.total);}
  console.log(JSON.stringify({compra:compra.id,ventaDirecta:venta.id,ventaDePedido:ventaPedido.id,pedido:pedido.id,reintentosSinDuplicados:true,concurrenciaSinSobreventa:true,historialAnteriorConservado:true}));
 }finally{
  for(const id of ids)await peticion(`catalogo/${id}`,'PATCH',{activo:false});
  if(proveedor)await peticion(`proveedores/${proveedor.id}`,'PATCH',{...proveedor,activo:false});
  if(categoria)await peticion(`categorias/${categoria.id}`,'PATCH',{...categoria,activo:false});
  if(usuario)await peticion(`usuarios/${usuario.id}`,'PATCH',{nombre:usuario.nombre,rol:'EMPLEADO',activo:false});
  await Promise.allSettled([admin.auth.signOut({scope:'local'}),empleado.auth.signOut({scope:'local'})]);await new Promise<void>(r=>servidor.close(()=>r()));
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Falló la verificación Release 1.');process.exitCode=1;});
