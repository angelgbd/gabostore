import {ErrorNegocio} from './ErrorNegocio.js';
import {claveValida} from './ControlCompras.js';
import {identificador,entero} from '../validation.js';
export interface VentaNueva {claveSolicitud:string;pedidoId?:number;items:{varianteId:number;cantidad:number}[];importePagado:number;metodoPago:'EFECTIVO'|'TRANSFERENCIA'|'OTRO';confirmacionesProveedor:number[]}
export interface VentaResumen {id:number;fecha:string;pedidoId:number|null;total:number}
export interface VentaRegistrada extends VentaResumen {importePagado:number;metodoPago:string;items:{varianteId:number;articuloId:number;nombre:string;tallaMedida:string;cantidad:number;precioUnitario:number;subtotal:number}[]}
export interface DatosVentas {registrar(d:VentaNueva):Promise<VentaRegistrada>;listar(desde:number):Promise<VentaResumen[]>;obtener(id:number):Promise<VentaRegistrada>;porPedido(id:number):Promise<VentaRegistrada|null>}
export class ControlVentas {
 constructor(private readonly datos:DatosVentas){}
 async listar(desde=0){entero(desde,0,'Página');const r=await this.datos.listar(desde);return{registros:r.slice(0,20),desde,hayMas:r.length>20};}
 obtener(id:number){identificador(id);return this.datos.obtener(id);}
 porPedido(id:number){identificador(id);return this.datos.porPedido(id);}
 async registrar(d:VentaNueva){
  if(Object.keys(d).some(k=>!['claveSolicitud','pedidoId','items','importePagado','metodoPago','confirmacionesProveedor'].includes(k)))throw new ErrorNegocio('Envía únicamente los datos de registro de venta.');
  claveValida(d.claveSolicitud);if(d.pedidoId!==undefined)identificador(d.pedidoId);
  if(typeof d.importePagado!=='number'||!Number.isFinite(d.importePagado)||d.importePagado<0||d.importePagado>999999999999.99||Math.abs(d.importePagado*100-Math.round(d.importePagado*100))>.001||!['EFECTIVO','TRANSFERENCIA','OTRO'].includes(d.metodoPago))throw new ErrorNegocio('Revisa el importe pagado y el método de pago.');
  if(!Array.isArray(d.items)||d.items.length>100||(!d.pedidoId&&!d.items.length)||(d.pedidoId&&d.items.length))throw new ErrorNegocio('Selecciona artículos o un pedido confirmado.');
  const usados=new Set<number>();for(const i of d.items){if(!i||typeof i!=='object'||Object.keys(i).some(k=>!['varianteId','cantidad'].includes(k)))throw new ErrorNegocio('El servidor obtiene los precios de la venta.');identificador(i.varianteId);entero(i.cantidad,1,'Cantidad');if(usados.has(i.varianteId))throw new ErrorNegocio('No repitas variantes en la venta.');usados.add(i.varianteId);}
  if(!Array.isArray(d.confirmacionesProveedor)||d.confirmacionesProveedor.length>100)throw new ErrorNegocio('Confirmaciones del proveedor inválidas.');d.confirmacionesProveedor.forEach(v=>identificador(v));
  return this.datos.registrar(d);
 }
}
