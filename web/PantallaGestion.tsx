import type {Personal} from './useSesion.js';
import {PantallaUsuarios} from './PantallaUsuarios.js';
import {PantallaMaestro} from './PantallaMaestro.js';
import './gestion.css';
export function PantallaGestion({ruta,token,personal}:{ruta:string;token:string;personal:Personal}) {
 const maestro=ruta==='/gestion/categorias'?'categorias':ruta==='/gestion/proveedores'?'proveedores':null;
 return <><a className="volver" href="#/">Volver al catálogo</a><nav className="gestion-enlaces" aria-label="Gestión del negocio">{personal.rol==='ADMIN'&&<>{[['usuarios','Usuarios'],['categorias','Categorías'],['proveedores','Proveedores']].map(([r,n])=><a key={r} href={`#/gestion/${r}`} aria-current={ruta===`/gestion/${r}`?'page':undefined}>{n}</a>)}</>}</nav>{personal.rol==='ADMIN'?(maestro?<PantallaMaestro key={ruta} token={token} tipo={maestro}/>:<PantallaUsuarios token={token} propioId={personal.id}/>):<div className="estado-vacio"><h1>Gestión del negocio</h1><p>La administración de cuentas requiere el rol de administrador.</p></div>}</>;
}
