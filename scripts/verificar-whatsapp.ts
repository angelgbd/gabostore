import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { crearServidor } from '../src/servidor/aplicacion.js';
import type { ArticuloCatalogo, PedidoDetalle } from '../src/negocio/index.js';
import type { PedidoPublicoRegistrado } from '../src/negocio/ControlPedidoPublico.js';

async function main() {
  const url=process.env.SUPABASE_URL, clave=process.env.SUPABASE_PUBLISHABLE_KEY, secreta=process.env.SUPABASE_SECRET_KEY;
  const email=process.env.GABOSTORE_PERSONAL_EMAIL, password=process.env.GABOSTORE_PERSONAL_PASSWORD;
  assert.ok(url&&clave&&secreta&&email&&password,'Configura .env y .env.personal.local.');
  const personal=createClient(url,clave,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await personal.auth.signInWithPassword({email,password});assert.ifError(error);assert.ok(data.session);
  // Destino sintáctico de prueba: este script no abre WhatsApp ni envía mensajes.
  const servidor=crearServidor({url,clavePublica:clave,claveServidor:secreta,whatsappNumero:'526620000000',carpetaWeb:resolve('web-dist')});
  await new Promise<void>(r=>servidor.listen(0,'127.0.0.1',r));const dir=servidor.address();assert.ok(dir&&typeof dir==='object');
  const base=`http://127.0.0.1:${dir.port}/api/`;
  async function api<T>(ruta:string,metodo='GET',datos?:unknown,protegida=false):Promise<T> {
    const r=await fetch(base+ruta,{method:metodo,headers:{...(datos!==undefined?{'Content-Type':'application/json'}:{}),
      ...(protegida?{Authorization:`Bearer ${data.session!.access_token}`}:{})},...(datos!==undefined?{body:JSON.stringify(datos)}:{})});
    const resultado=await r.json() as T&{error?:string};assert.ok(r.ok,resultado.error??`Falló ${ruta}: ${r.status}`);return resultado;
  }
  try {
    const catalogo=await api<ArticuloCatalogo[]>('catalogo');const articulo=catalogo.find(a=>!a.sobrePedido&&a.variantes.some(v=>v.existencia>0));
    assert.ok(articulo);const variante=articulo.variantes.find(v=>v.existencia>0)!;
    const solicitud={claveSolicitud:crypto.randomUUID(),items:[{varianteId:variante.id,cantidad:1}]};
    const registro=await api<PedidoPublicoRegistrado>('pedidos/publicos','POST',solicitud);
    const repeticiones=await Promise.all([api<PedidoPublicoRegistrado>('pedidos/publicos','POST',solicitud),api<PedidoPublicoRegistrado>('pedidos/publicos','POST',solicitud)]);
    assert.ok(repeticiones.every(r=>r.id===registro.id));assert.match(registro.mensaje,new RegExp(`Pedido #${registro.id}`));
    const pendiente=await api<PedidoDetalle>(`personal/pedidos/${registro.id}`,'GET',undefined,true);
    assert.equal(pendiente.cliente,null);assert.equal(pendiente.estado,'PENDIENTE');assert.equal(pendiente.items[0]?.precioUnitario,articulo.precioBase);
    assert.equal(Date.parse(registro.venceEn)-Date.parse(registro.fechaCreacion),120*3600000);
    const confirmados=await Promise.all([api<PedidoDetalle>(`personal/pedidos/${registro.id}/confirmar`,'POST',{},true),api<PedidoDetalle>(`personal/pedidos/${registro.id}/confirmar`,'POST',{},true)]);
    assert.ok(confirmados.every(p=>p.id===registro.id&&p.estado==='CONFIRMADO'));assert.deepEqual(confirmados[0]!.items,pendiente.items);
    const actual=await api<ArticuloCatalogo>(`catalogo/${articulo.id}`);assert.equal(actual.variantes.find(v=>v.id===variante.id)?.existencia,variante.existencia);
    const {error:denegado}=await createClient(url,clave,{auth:{persistSession:false}}).rpc('registrar_pedido_publico',{p_clave:crypto.randomUUID(),p_items:[{variante_id:variante.id,cantidad:1}]});
    assert.ok(denegado,'La clave pública no debe ejecutar el registro directamente.');
    console.log(JSON.stringify({resultado:'OK',pedidoId:registro.id,estado:'CONFIRMADO',sinDatosContacto:true,precioDelServidor:pendiente.items[0]?.precioUnitario,
      reintentosSinDuplicados:true,confirmacionesConcurrentes:true,existenciasConservadas:true,registroDirectoAnonimoDenegado:true},null,2));
  } finally {await personal.auth.signOut({scope:'local'});await new Promise<void>(r=>servidor.close(()=>r()));}
}
main().catch((e:unknown)=>{console.error(e instanceof Error?e.message:'Falló la verificación de WhatsApp.');process.exitCode=1;});
