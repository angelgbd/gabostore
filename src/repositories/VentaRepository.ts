import type {ClienteSupabase} from '../supabase.js';
import {comprobarError,requerido} from '../errors.js';
import type {VentaNueva,DatosVentas,VentaRegistrada} from '../negocio/ControlVentas.js';
export class VentaRepository implements DatosVentas {
 constructor(private readonly db:ClienteSupabase){}
 async registrar(d:VentaNueva){const{data,error}=await this.db.rpc('registrar_venta',{p_clave:d.claveSolicitud,p_pedido_id:(d.pedidoId??null) as number,p_items:d.items,p_importe:d.importePagado,p_metodo:d.metodoPago,p_confirmaciones:d.confirmacionesProveedor});comprobarError(error);return this.obtener(requerido(data,'No se recuperó la venta. Reintenta la misma solicitud.'));}
 async listar(desde:number){const{data,error}=await this.db.from('ventas').select('id,fecha,pedido_id,total').order('fecha',{ascending:false}).order('id',{ascending:false}).range(desde,desde+20);comprobarError(error);return(data??[]).map(r=>({id:r.id,fecha:r.fecha,pedidoId:r.pedido_id,total:Number(r.total)}));}
 async porPedido(id:number){const{data,error}=await this.db.from('ventas').select('id').eq('pedido_id',id).maybeSingle();comprobarError(error);return data?this.obtener(data.id):null;}
 async obtener(id:number):Promise<VentaRegistrada>{const{data,error}=await this.db.from('ventas').select('*,detalle_venta(*)').eq('id',id).single();comprobarError(error);const r=requerido(data,'Venta no encontrada.');return{id:r.id,fecha:r.fecha,pedidoId:r.pedido_id,total:Number(r.total),importePagado:Number(r.importe_pagado),metodoPago:r.metodo_pago,items:r.detalle_venta.map(i=>({varianteId:i.variante_id,articuloId:i.articulo_id,nombre:i.nombre,tallaMedida:i.talla_medida,cantidad:i.cantidad,precioUnitario:Number(i.precio_unitario),subtotal:Number(i.subtotal)}))};}
}
