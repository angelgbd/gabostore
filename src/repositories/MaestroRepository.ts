import type {ClienteSupabase} from '../supabase.js';
import {comprobarError,requerido,ErrorDatos} from '../errors.js';
import type {DatosMaestros,RegistroMaestro} from '../negocio/ControlMaestros.js';
export class MaestroRepository implements DatosMaestros {
 constructor(private readonly db:ClienteSupabase,private readonly tabla:'categorias'|'proveedores'){}
 async listar(desde:number,limite:number):Promise<RegistroMaestro[]>{const{data,error}=await this.db.from(this.tabla).select('*').order('nombre').order('id').range(desde,desde+limite-1);comprobarError(error);return data??[];}
 async guardar(id:number|null,datos:Omit<RegistroMaestro,'id'>):Promise<RegistroMaestro>{
  const categoria={nombre:datos.nombre,activo:datos.activo,descripcion:datos.descripcion??''};
  const proveedor={nombre:datos.nombre,activo:datos.activo,contacto:datos.contacto??'',telefono:datos.telefono??'',direccion:datos.direccion??''};
  const consulta=this.tabla==='categorias'?(id===null?this.db.from('categorias').insert(categoria):this.db.from('categorias').update(categoria).eq('id',id))
   :(id===null?this.db.from('proveedores').insert(proveedor):this.db.from('proveedores').update(proveedor).eq('id',id));
  const{data,error}=await consulta.select('*').single();if(error?.code==='23505')throw new ErrorDatos('Ya existe un registro con ese nombre.','VALIDACION');comprobarError(error);return requerido(data,'No se encontró el registro.');
 }
}
