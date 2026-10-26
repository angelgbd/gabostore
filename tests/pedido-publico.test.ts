import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/database.types.js';
import { crearServidor } from '../src/servidor/aplicacion.js';
import { ControlPedidoPublico } from '../src/negocio/ControlPedidoPublico.js';
import { nuevoIntento, restaurarIntento } from '../web/registroSolicitud.js';

const clave = '00000000-0000-4000-8000-000000000001';
const linea = { articuloId: 1, varianteId: 2, cantidad: 2, nombre: 'Camisa', categoria: 'Ropa', tallaMedida: 'M', fotografia: '',
  precioUnitario: 100, existencia: 3, sobrePedido: false, problema: '' };
const registro = { id: 20, estado: 'PENDIENTE' as const, fechaCreacion: '2026-10-26T12:00:00Z', venceEn: '2026-10-31T12:00:00Z', items: [linea] };

test('control público valida selección y genera mensaje del recibo del servidor sin datos de contacto', async () => {
  const entradas: unknown[] = [];
  const control = new ControlPedidoPublico({ registrarPublico: async s => { entradas.push(s); return registro; } });
  for (const s of [{claveSolicitud:'incorrecta',items:[{varianteId:2,cantidad:1}]},{claveSolicitud:clave,items:[]},
    {claveSolicitud:clave,items:[{varianteId:2,cantidad:0}]},{claveSolicitud:clave,items:[{varianteId:2,cantidad:1},{varianteId:2,cantidad:1}]}]) await assert.rejects(control.registrar(s));
  assert.equal(entradas.length,0);
  const r=await control.registrar({claveSolicitud:clave,items:[{varianteId:2,cantidad:2}]});
  assert.match(r.mensaje,/Pedido #20/); assert.match(r.mensaje,/200\.00/); assert.doesNotMatch(r.mensaje,/Correo:/); assert.equal('items' in r,false);
  const especial = new ControlPedidoPublico({registrarPublico: async()=>({...registro,items:[{...linea,precioUnitario:null,sobrePedido:true}]})});
  const e=await especial.registrar({claveSolicitud:clave,items:[{varianteId:2,cantidad:2}]});
  assert.match(e.mensaje,/Total parcial/); assert.match(e.mensaje,/Precio y disponibilidad por confirmar/); assert.doesNotMatch(e.mensaje,/100\.00/);
});

test('recarga conserva clave y recibo; cambiar artículos genera una nueva solicitud', () => {
  const items=[{articuloId:1,varianteId:2,cantidad:2}]; const intento=nuevoIntento(items);
  assert.equal(restaurarIntento(JSON.stringify(intento),items).claveSolicitud,intento.claveSolicitud);
  assert.notEqual(restaurarIntento(JSON.stringify(intento),[{...items[0]!,cantidad:3}]).claveSolicitud,intento.claveSolicitud);
  assert.equal(restaurarIntento('{roto',items).registro,null);
});

async function conServidor(ejecutar:(base:string,entradas:unknown[])=>Promise<void>, configurado=true) {
  const entradas: unknown[]=[];
  const cliente = () => createClient<Database>('https://prueba.supabase.co','sb_secret_solo_servidor',{
    auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(entrada,opciones)=>{
      const url=new URL(String(entrada));
      if(url.pathname.endsWith('/rpc/registrar_pedido_publico')) { entradas.push(JSON.parse(String(opciones?.body)));return Response.json(registro); }
      throw new Error('Petición inesperada: '+url.pathname);
    }},
  });
  const servidor=crearServidor({url:'https://prueba.supabase.co',clavePublica:'sb_publishable_prueba',carpetaWeb:'web-dist',
    ...(configurado?{whatsappNumero:'526621234567',conectarServidor:cliente}:{})});
  await new Promise<void>(r=>servidor.listen(0,'127.0.0.1',r)); const dir=servidor.address(); assert.ok(dir&&typeof dir==='object');
  try {await ejecutar(`http://127.0.0.1:${dir.port}/api/`,entradas);}finally{await new Promise<void>(r=>servidor.close(()=>r()));}
}
const enviar=(base:string,datos:unknown,headers:Record<string,string>={})=>fetch(base+'pedidos/publicos',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(datos)});

test('API pública solo acepta clave y cantidades; no expone consultas privadas ni claves del servidor',async()=>conServidor(async(base,entradas)=>{
  const datos={claveSolicitud:clave,items:[{varianteId:2,cantidad:2}]};
  assert.equal((await enviar(base,{...datos,precio:0})).status,400);
  assert.equal((await enviar(base,{...datos,items:[{varianteId:2,cantidad:2,precioUnitario:0}]})).status,400);
  assert.equal((await enviar(base,datos,{Origin:'https://otro.example'})).status,403);
  assert.equal(entradas.length,0);
  const r=await enviar(base,datos); assert.equal(r.status,201); const texto=await r.text(); assert.match(texto,/Pedido #20/); assert.doesNotMatch(texto,/sb_secret/);
  assert.deepEqual(entradas,[{p_clave:clave,p_items:[{variante_id:2,cantidad:2}]}]);
  assert.equal((await fetch(base+'pedidos/publicos/20')).status,404);
  assert.equal((await fetch(base+'personal/pedidos/20')).status,401);
  assert.doesNotMatch(await (await fetch(base+'config')).text(),/sb_secret/);
}));
test('sin configuración no registra; la API limita intentos por dirección',async()=>{
  await conServidor(async(base,entradas)=>{assert.equal((await enviar(base,{})).status,503);assert.equal(entradas.length,0);},false);
  await conServidor(async(base,entradas)=>{
    for(let i=0;i<10;i++) assert.equal((await enviar(base,{})).status,400);
    assert.equal((await enviar(base,{})).status,429);assert.equal(entradas.length,0);
  });
});
