import { useState, type FormEvent } from 'react';
import { Aviso } from './componentes.js';
import { mensajeError } from './api.js';

export function AccesoPersonal({ iniciar, errorSesion }: { iniciar: (email: string, password: string) => Promise<void>; errorSesion: string }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError(''); setEnviando(true);
    const formulario = new FormData(evento.currentTarget);
    try {
      await iniciar(String(formulario.get('email')).trim(), String(formulario.get('password')));
      location.hash = '#/';
    } catch (e) { setError(mensajeError(e)); }
    finally { setEnviando(false); }
  }
  return <div className="acceso"><a className="volver" href="#/">Volver al catálogo</a><h1>Acceso del personal</h1><p>Inicia sesión para preparar y registrar los pedidos recibidos por WhatsApp.</p>
    <form onSubmit={e => { void enviar(e); }} className="formulario">
      <label>Correo<input name="email" type="email" autoComplete="username" required maxLength={254} autoFocus /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
      {(error || errorSesion) && <Aviso error>{error || errorSesion}</Aviso>}
      <button className="boton ancho" disabled={enviando} type="submit">{enviando ? 'Validando acceso…' : 'Iniciar sesión'}</button>
    </form>
    <p className="nota">El catálogo se puede consultar sin iniciar sesión.</p>
  </div>;
}
