import { useState, type ReactNode } from 'react';

export function dinero(valor: number | null): string {
  return valor === null ? 'Consultar precio' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

export function nombreArticulo(nombre: string): string {
  return nombre.replace(/^DEMO TS \S+ - /, '').replace(/^DEMO GaboStore - /, '');
}

export function Fotografia({ ruta, nombre }: { ruta: string; nombre: string }) {
  const [fallo, setFallo] = useState(false);
  const valida = /^https:\/\//.test(ruta) || /^\/(?!\/)/.test(ruta);
  return <div className="fotografia">{valida && !fallo
    ? <img src={ruta} alt={nombre} loading="lazy" onError={() => setFallo(true)} />
    : <span className="sin-foto"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg><span>Sin fotografía</span></span>}</div>;
}

export function Aviso({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? 'aviso error' : 'aviso'} role={error ? 'alert' : 'status'}>{children}</div>;
}

export function Cargando() { return <div className="estado-vacio" role="status"><p>Consultando información…</p></div>; }
export function ErrorCarga({ mensaje }: { mensaje: string }) {
  return <div className="estado-vacio"><Aviso error>{mensaje}</Aviso><button className="boton secundario" onClick={() => location.reload()}>Volver a intentar</button></div>;
}
