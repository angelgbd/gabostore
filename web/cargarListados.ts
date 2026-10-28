import type {ArticuloCatalogo} from '../src/negocio/ControlCatalogo.js';
import type {RegistroMaestro} from '../src/negocio/ControlMaestros.js';
import {solicitar} from './api.js';
export async function cargarCatalogoCompleto(personal:boolean,token?:string):Promise<ArticuloCatalogo[]>{
 const todos=new Map<number,ArticuloCatalogo>();
 for(let desde=0;;desde+=100){const pagina=await solicitar<ArticuloCatalogo[]>(`${personal?'personal/':''}catalogo?limite=100&desde=${desde}`,token);for(const a of pagina)todos.set(a.id,a);if(pagina.length<100)break;}
 return [...todos.values()];
}
export async function cargarMaestros(tipo:'categorias'|'proveedores',token:string):Promise<RegistroMaestro[]>{
 const todos:RegistroMaestro[]=[];for(let desde=0;;){const p=await solicitar<{registros:RegistroMaestro[];hayMas:boolean}>(`personal/${tipo}?opciones=1&desde=${desde}`,token);todos.push(...p.registros);if(!p.hayMas||!p.registros.length)break;desde+=p.registros.length;}return todos;
}
