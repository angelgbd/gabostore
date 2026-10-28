import type {Personal} from './useSesion.js';
import {PantallaUsuarios} from './PantallaUsuarios.js';
import {PantallaMaestro} from './PantallaMaestro.js';
import './gestion.css';
export function PantallaGestion({ruta,token,personal}:{ruta:string;token:string;personal:Personal}) {
 return <><a className="volver" href="#/">Volver al catálogo</a><nav className="gestion-enlaces" aria-label="Gestión del negocio">{personal.rol==='ADMIN'&&<><a href="#/gestion/usuarios" aria-current={ruta==='/gestion/usuarios'?'page':undefined}>Usuarios</a><a href="#/gestion/categorias" aria-current={ruta==='/gestion/categorias'?'page':undefined}>Categorías</a></>}</nav>{personal.rol==='ADMIN'?(ruta==='/gestion/categorias'?<PantallaMaestro key={ruta} token={token} tipo="categorias"/>:<PantallaUsuarios token={token} propioId={personal.id}/>):<div className="estado-vacio"><h1>Gestión del negocio</h1><p>La administración de cuentas requiere el rol de administrador.</p></div>}</>;
}
