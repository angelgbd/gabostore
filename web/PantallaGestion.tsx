import type {Personal} from './useSesion.js';
import {PantallaUsuarios} from './PantallaUsuarios.js';
import {PantallaMaestro} from './PantallaMaestro.js';
import {PantallaCompras} from './PantallaCompras.js';
import {PantallaVentas} from './PantallaVentas.js';
import './gestion.css';
export function PantallaGestion({ruta,token,personal}:{ruta:string;token:string;personal:Personal}) {
 const maestro=ruta==='/gestion/categorias'?'categorias':ruta==='/gestion/proveedores'?'proveedores':null;
 return <><a className="volver" href="#/">Volver al catálogo</a><nav className="gestion-enlaces" aria-label="Gestión del negocio">{personal.rol==='ADMIN'&&<>{[['usuarios','Usuarios'],['categorias','Categorías'],['proveedores','Proveedores']].map(([r,n])=><a key={r} href={`#/gestion/${r}`} aria-current={ruta===`/gestion/${r}`?'page':undefined}>{n}</a>)}</>}<a href="#/gestion/compras" aria-current={ruta==='/gestion/compras'?'page':undefined}>Compras</a><a href="#/gestion/ventas" aria-current={ruta.startsWith('/gestion/ventas')?'page':undefined}>Ventas</a></nav>{ruta.startsWith('/gestion/ventas')?<PantallaVentas key={ruta} token={token} personalId={personal.id} {...(ruta.match(/\/pedido\/(\d+)$/)?.[1]?{pedidoId:Number(ruta.match(/\/pedido\/(\d+)$/)![1])}:{})}/>:ruta==='/gestion/compras'?<PantallaCompras token={token} personalId={personal.id}/>:personal.rol==='ADMIN'?(maestro?<PantallaMaestro key={ruta} token={token} tipo={maestro}/>:<PantallaUsuarios token={token} propioId={personal.id}/>):<div className="estado-vacio"><h1>Gestión del negocio</h1><p>Selecciona Compras para registrar mercancía recibida. La administración de cuentas requiere el rol de administrador.</p></div>}</>;
}
