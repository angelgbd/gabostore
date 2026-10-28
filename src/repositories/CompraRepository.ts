import type {ClienteSupabase} from '../supabase.js';
import type {Json} from '../database.types.js';
import {comprobarError,requerido} from '../errors.js';
import type {CompraNueva,DatosCompras,CompraRegistrada} from '../negocio/ControlCompras.js';
export class CompraRepository implements DatosCompras {
 constructor(private readonly db:ClienteSupabase){}
 async registrar(d:CompraNueva){const{data,error}=await this.db.rpc('registrar_compra',{p_clave:d.claveSolicitud,p_proveedor_id:d.proveedorId,p_fecha:d.fechaRecepcion,p_referencia:d.referencia,p_items:d.items as unknown as Json});comprobarError(error);return this.obtener(requerido(data,'No se recuperó la compra. Reintenta la misma solicitud.'));}
 async listar(desde:number){const{data,error}=await this.db.from('compras').select('id,proveedor_nombre,fecha_recepcion,total').order('fecha_registro',{ascending:false}).order('id',{ascending:false}).range(desde,desde+20);comprobarError(error);return(data??[]).map(r=>({id:r.id,proveedorNombre:r.proveedor_nombre,fechaRecepcion:r.fecha_recepcion,total:Number(r.total)}));}
 async obtener(id:number):Promise<CompraRegistrada>{const{data,error}=await this.db.from('compras').select('*,detalle_compra(*)').eq('id',id).single();comprobarError(error);const r=requerido(data,'Compra no encontrada.');return{id:r.id,proveedorNombre:r.proveedor_nombre,fechaRecepcion:r.fecha_recepcion,fechaRegistro:r.fecha_registro,referencia:r.referencia,total:Number(r.total),items:r.detalle_compra.map(i=>({varianteId:i.variante_id,articuloId:i.articulo_id,nombre:i.nombre,tallaMedida:i.talla_medida,cantidad:i.cantidad,costoUnitario:Number(i.costo_unitario),subtotal:Number(i.subtotal)}))};}
}
