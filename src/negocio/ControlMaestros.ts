import {ErrorNegocio} from './ErrorNegocio.js';
export interface RegistroMaestro {id:number;nombre:string;activo:boolean;descripcion?:string;contacto?:string;telefono?:string;direccion?:string}
export interface DatosMaestros {listar(desde:number,limite:number):Promise<RegistroMaestro[]>;guardar(id:number|null,datos:Omit<RegistroMaestro,'id'>):Promise<RegistroMaestro>}
export class ControlMaestros {
 constructor(private readonly datos:DatosMaestros,private readonly proveedor=false){}
 async listar(desde=0,opciones=false){if(!Number.isSafeInteger(desde)||desde<0||desde>2147482600)throw new ErrorNegocio('Página inválida.');
  const registros=await this.datos.listar(desde,opciones?1000:21);return opciones?{registros,desde,hayMas:registros.length===1000}:{registros:registros.slice(0,20),desde,hayMas:registros.length>20};}
 async guardar(id:number|null,entrada:Omit<RegistroMaestro,'id'>){
  if(id!==null&&(!Number.isSafeInteger(id)||id<1))throw new ErrorNegocio('Identificador inválido.');
  if(typeof entrada.nombre!=='string'||!entrada.nombre.trim()||entrada.nombre.trim().length>120||typeof entrada.activo!=='boolean')throw new ErrorNegocio('Introduce un nombre válido y el estado del registro.');
  const datos:Omit<RegistroMaestro,'id'>={nombre:entrada.nombre.trim(),activo:entrada.activo};
  for(const campo of (this.proveedor?['contacto','telefono','direccion']:['descripcion']) as ('contacto'|'telefono'|'direccion'|'descripcion')[]){const v=entrada[campo]??'';if(typeof v!=='string'||v.trim().length>500)throw new ErrorNegocio('Revisa los campos de texto (máximo 500 caracteres).');datos[campo]=v.trim();}
  if(this.proveedor&&(!datos.telefono||!/^\+?[\d ()-]{7,30}$/.test(datos.telefono)))throw new ErrorNegocio('Introduce un teléfono válido del proveedor.');
  return this.datos.guardar(id,datos);
 }
}
