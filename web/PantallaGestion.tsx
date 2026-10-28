import type {Personal} from './useSesion.js';
import {PantallaUsuarios} from './PantallaUsuarios.js';
import './gestion.css';
export function PantallaGestion({ruta,token,personal}:{ruta:string;token:string;personal:Personal}) {
 return <><a className="volver" href="#/">Volver al catálogo</a><nav className="gestion-enlaces" aria-label="Gestión del negocio">{personal.rol==='ADMIN'&&<a href="#/gestion/usuarios" aria-current={ruta==='/gestion/usuarios'?'page':undefined}>Usuarios</a>}</nav>{personal.rol==='ADMIN'?<PantallaUsuarios token={token} propioId={personal.id}/>:<div className="estado-vacio"><h1>Gestión del negocio</h1><p>La administración de cuentas requiere el rol de administrador.</p></div>}</>;
}
