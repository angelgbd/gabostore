import { solicitar } from './api.js';
export interface ConfiguracionPublica { url: string; clavePublica: string; whatsappNumero: string | null }
let pendiente: Promise<ConfiguracionPublica> | undefined;
export function cargarConfiguracion(): Promise<ConfiguracionPublica> {
  pendiente ??= solicitar<ConfiguracionPublica>('config').catch(error => { pendiente = undefined; throw error; });
  return pendiente;
}
