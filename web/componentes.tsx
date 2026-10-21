import { useEffect, useState, type ReactNode } from 'react';

export function dinero(valor: number | null): string {
  return valor === null ? 'Consultar precio' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

export function nombreArticulo(nombre: string): string {
  return nombre.replace(/^DEMO TS \S+ - /, '').replace(/^DEMO GaboStore - /, '');
}

export function Fotografia({ ruta, nombre }: { ruta: string; nombre: string }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => { setFallo(false); }, [ruta]);
  const valida = /^https:\/\//.test(ruta) || /^\/(?!\/)/.test(ruta) || ruta.startsWith('blob:');
  const ilustrativa = ruta.includes('/storage/v1/object/public/catalogo/demo/');
  return <div className={`fotografia${valida && !fallo ? '' : ' sin-imagen'}`}>{valida && !fallo
    ? <img src={ruta} alt={`${nombre}${ilustrativa ? ', imagen ilustrativa de demo' : ''}`} loading="lazy" onError={() => setFallo(true)} />
    : <span className="sin-foto" role="img" aria-label={`${nombre}, sin fotografía`}><span aria-hidden="true">{iniciales(nombre)}</span></span>}{ilustrativa && !fallo && <span className="marca-ilustrativa">Imagen ilustrativa</span>}</div>;
}

function iniciales(nombre: string) { const palabras = nombre.trim().split(/\s+/); return (palabras.length > 1 ? `${palabras[0]?.[0] ?? ''}${palabras[1]?.[0] ?? ''}` : nombre.slice(0, 2)).toLocaleUpperCase('es'); }

export function Aviso({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? 'aviso error' : 'aviso'} role={error ? 'alert' : 'status'}>{children}</div>;
}

export function Cargando() { return <div className="estado-vacio" role="status"><p>Consultando información…</p></div>; }
export function ErrorCarga({ mensaje }: { mensaje: string }) {
  return <div className="estado-vacio"><Aviso error>{mensaje}</Aviso><button className="boton secundario" onClick={() => location.reload()}>Volver a intentar</button></div>;
}
