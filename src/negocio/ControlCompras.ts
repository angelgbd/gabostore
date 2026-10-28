import {ErrorNegocio} from './ErrorNegocio.js';
import {identificador,entero,importe} from '../validation.js';
import {validarFiltrosPedidos} from '../filtrosPedidos.js';
export interface ArticuloCompraNuevo {nombre:string;categoriaId:number;precioBase:number;tallaMedida:string}
export interface LineaCompra {varianteId?:number;nuevoArticulo?:ArticuloCompraNuevo;cantidad:number;costoUnitario:number}
export interface CompraNueva {claveSolicitud:string;proveedorId:number;fechaRecepcion:string;referencia:string;items:LineaCompra[]}
export interface CompraResumen {id:number;proveedorNombre:string;fechaRecepcion:string;total:number}
export interface CompraRegistrada extends CompraResumen {referencia:string;fechaRegistro:string;items:{varianteId:number;articuloId:number;nombre:string;tallaMedida:string;cantidad:number;costoUnitario:number;subtotal:number}[]}
export interface DatosCompras {registrar(datos:CompraNueva):Promise<CompraRegistrada>;listar(desde:number):Promise<CompraResumen[]>;obtener(id:number):Promise<CompraRegistrada>}
export function claveValida(clave:unknown):asserts clave is string {if(typeof clave!=='string'||!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(clave))throw new ErrorNegocio('Clave de solicitud inválida.');}
export class ControlCompras {
 constructor(private readonly datos:DatosCompras){}
 async listar(desde=0){entero(desde,0,'Página');const r=await this.datos.listar(desde);return{registros:r.slice(0,20),desde,hayMas:r.length>20};}
 obtener(id:number){identificador(id);return this.datos.obtener(id);}
 async registrar(d:CompraNueva){
  if(Object.keys(d).some(k=>!['claveSolicitud','proveedorId','fechaRecepcion','referencia','items'].includes(k))||typeof d.fechaRecepcion!=='string')throw new ErrorNegocio('Datos de compra inválidos.');
  claveValida(d.claveSolicitud);identificador(d.proveedorId);validarFiltrosPedidos({fechaDesde:d.fechaRecepcion});
  if(typeof d.referencia!=='string'||d.referencia.length>200||!Array.isArray(d.items)||!d.items.length||d.items.length>100)throw new ErrorNegocio('Revisa los datos y artículos de la compra.');
  const usados=new Set<number>();let centavos=0;
  for(const i of d.items){if(!i||typeof i!=='object'||Object.keys(i).some(k=>!['varianteId','nuevoArticulo','cantidad','costoUnitario'].includes(k)))throw new ErrorNegocio('Detalle de compra inválido.');entero(i.cantidad,1,'Cantidad');importe(i.costoUnitario);centavos+=Math.round(i.costoUnitario*100)*i.cantidad;
   if(i.nuevoArticulo){if(i.varianteId!==undefined)throw new ErrorNegocio('Selecciona un artículo existente o uno nuevo.');const n=i.nuevoArticulo;identificador(n.categoriaId);importe(n.precioBase);if(typeof n.nombre!=='string'||!n.nombre.trim()||n.nombre.trim().length>120||typeof n.tallaMedida!=='string'||!n.tallaMedida.trim()||n.tallaMedida.trim().length>80)throw new ErrorNegocio('Completa la ficha del artículo nuevo.');}
   else{identificador(i.varianteId!);if(usados.has(i.varianteId!))throw new ErrorNegocio('Una variante no puede repetirse en la compra.');usados.add(i.varianteId!);}
  }
  if(!Number.isSafeInteger(centavos)||centavos>99999999999999)throw new ErrorNegocio('El total de la compra supera el importe permitido.');
  return this.datos.registrar(d);
 }
}
