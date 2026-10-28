import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ControlCompras,type CompraNueva,type DatosCompras} from '../src/negocio/ControlCompras.js';
test('compras rechaza cantidades, costos, variantes duplicadas y datos manipulados antes de escribir',async()=>{
 let llamadas=0;const datos:DatosCompras={listar:async()=>[],obtener:async()=>{throw new Error('No usado');},registrar:async()=>{llamadas++;throw new Error('No debe escribir');}};
 const c=new ControlCompras(datos);const base:CompraNueva={claveSolicitud:crypto.randomUUID(),proveedorId:1,fechaRecepcion:'2026-10-28',referencia:'',items:[{varianteId:2,cantidad:1,costoUnitario:5}]};
 for(const d of [{...base,total:1},{...base,items:[]},{...base,items:[base.items[0]!,base.items[0]!]},{...base,fechaRecepcion:'2026-02-30'},{...base,items:[{varianteId:2,cantidad:-1,costoUnitario:5}]},{...base,items:[{varianteId:2,cantidad:1,costoUnitario:0.125}]}])await assert.rejects(c.registrar(d));
 assert.equal(llamadas,0);
});
