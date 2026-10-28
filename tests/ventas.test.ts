import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ControlVentas,type DatosVentas,type VentaNueva} from '../src/negocio/ControlVentas.js';
test('venta rechaza precios manipulados, pago inválido, variantes duplicadas y pedido con detalle enviado',async()=>{
 let llamadas=0;const datos:DatosVentas={listar:async()=>[],obtener:async()=>{throw new Error('No usado');},porPedido:async()=>null,registrar:async()=>{llamadas++;throw new Error('No debe escribir');}};
 const c=new ControlVentas(datos),base:VentaNueva={claveSolicitud:crypto.randomUUID(),items:[{varianteId:1,cantidad:1}],importePagado:100,metodoPago:'EFECTIVO',confirmacionesProveedor:[]};
 for(const d of [{...base,total:1},{...base,items:[]},{...base,pedidoId:1},{...base,items:[...base.items,...base.items]},{...base,importePagado:-1},{...base,items:[{varianteId:1,cantidad:1,precioUnitario:1}]}])await assert.rejects(c.registrar(d));
 assert.equal(llamadas,0);
});
