import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import { ErrorDatos } from './errors.js';

export type ClienteSupabase = SupabaseClient<Database>;

export interface ConfiguracionSupabase {
  url: string;
  clavePublica: string;
  /** JWT del empleado para una petición al backend. Sin JWT solo permite catálogo. */
  tokenUsuario?: string;
}

/** Crear una instancia por petición cuando se utiliza tokenUsuario en el backend. */
export function crearClienteSupabase(config: ConfiguracionSupabase): ClienteSupabase {
  if (!config.url.trim() || !config.clavePublica.trim()) {
    throw new ErrorDatos('Faltan la URL o la clave pública de Supabase.', 'CONFIGURACION');
  }
  return createClient<Database>(config.url, config.clavePublica, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(config.tokenUsuario ? { global: { headers: { Authorization: `Bearer ${config.tokenUsuario}` } } } : {}),
  });
}
