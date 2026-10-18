import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { solicitar, mensajeError } from './api.js';

export interface Personal { id: string; email: string; rol: 'ADMIN' | 'EMPLEADO' }

export function useSesion() {
  const [cliente, setCliente] = useState<SupabaseClient | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [personal, setPersonal] = useState<Personal | null>(null);
  const [iniciando, setIniciando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    let cancelar = () => {};
    void solicitar<{ url: string; clavePublica: string }>('config').then(async config => {
      if (!vigente) return;
      const conexion = createClient(config.url, config.clavePublica, {
        auth: { storageKey: 'gabostore-personal', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
      const { data: escucha } = conexion.auth.onAuthStateChange((_evento, sesion) => {
        if (vigente) { setToken(sesion?.access_token); if (!sesion) setPersonal(null); }
      });
      cancelar = () => escucha.subscription.unsubscribe();
      setCliente(conexion);
      const { data, error: fallo } = await conexion.auth.getSession();
      if (!vigente) return;
      if (fallo) throw fallo;
      setToken(data.session?.access_token);
      if (!data.session) setIniciando(false);
    }).catch(e => { if (vigente) { setError(mensajeError(e)); setIniciando(false); } });
    return () => { vigente = false; cancelar(); };
  }, []);
  useEffect(() => {
    let vigente = true;
    if (!token) { setPersonal(null); return; }
    void solicitar<Personal>('personal/sesion', token).then(usuario => {
      if (vigente) { setPersonal(usuario); setError(''); }
    }).catch(e => { if (vigente) { setPersonal(null); setError(mensajeError(e)); } })
      .finally(() => { if (vigente) setIniciando(false); });
    return () => { vigente = false; };
  }, [token]);

  async function iniciar(email: string, password: string): Promise<void> {
    if (!cliente) throw new Error('La conexión aún no está lista. Intenta nuevamente.');
    setError('');
    const { data, error: fallo } = await cliente.auth.signInWithPassword({ email, password });
    if (fallo) throw new Error('No se pudo iniciar sesión. Revisa tu correo y contraseña.');
    if (!data.session) throw new Error('No se obtuvo una sesión válida.');
    const usuario = await solicitar<Personal>('personal/sesion', data.session.access_token);
    setPersonal(usuario); setToken(data.session.access_token);
  }

  async function salir(): Promise<void> {
    if (cliente) {
      const { error: fallo } = await cliente.auth.signOut({ scope: 'local' });
      if (fallo) throw new Error('No se pudo cerrar la sesión. Intenta nuevamente.');
    }
    setPersonal(null); setToken(undefined); setError('');
  }
  return { personal, token: personal ? token : undefined, iniciando, error, iniciar, salir };
}
