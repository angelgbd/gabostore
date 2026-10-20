import { useEffect } from 'react';
import { enlaceWhatsApp } from '../src/negocio/SolicitudConsulta.js';
import type { useSolicitudConsulta } from './useSolicitudConsulta.js';
import { Aviso } from './componentes.js';
import { Icono } from './Icono.js';

export function PantallaMensaje({ consulta, numero }: { consulta: ReturnType<typeof useSolicitudConsulta>; numero: string | null }) {
  useEffect(() => { if (!consulta.vista) void consulta.preparar().catch(() => {}); }, []);
  const mensaje = consulta.vista?.mensaje ?? '';
  const enlace = enlaceWhatsApp(numero, mensaje);
  return <section className="mensaje-listo">{mensaje && <div className="marca-listo"><Icono nombre="check" tamano={44}/></div>}<h1>{mensaje ? 'Mensaje listo' : consulta.ocupado ? 'Preparando mensaje' : 'Revisa tu solicitud'}</h1><p className="intro-mensaje">Revisa tu solicitud. El siguiente paso es abrir WhatsApp y enviar el mensaje a Gabo Store.</p>
    {consulta.error && <Aviso error>{consulta.error}</Aviso>}
    {mensaje ? <div className="vista-mensaje"><h2>Vista previa · WhatsApp</h2><pre>{mensaje}</pre></div> : consulta.ocupado ? <p role="status" className="nota">Actualizando disponibilidad y precios…</p> : <a className="boton secundario" href="#/solicitud">Revisar mi pedido</a>}
    <div className="acciones-mensaje">{enlace ? <a className="boton whatsapp ancho" href={enlace} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp"/>Abrir WhatsApp</a> : <><button className="boton whatsapp ancho" type="button" disabled>Abrir WhatsApp</button><p className="nota configuracion-pendiente">{numero ? 'Prepara un mensaje válido para continuar.' : 'WhatsApp pendiente de configurar. La vista previa está disponible.'}</p></>}
      <a className="boton secundario ancho" href="#/">Volver al catálogo</a><a className="enlace" href="#/solicitud">Editar mi pedido</a></div><p className="nota nota-solicitud">El mensaje aún no se ha enviado. El personal confirmará tu solicitud por WhatsApp.</p>
  </section>;
}
