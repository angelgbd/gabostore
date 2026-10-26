import { useEffect, useState } from 'react';
import { enlaceWhatsApp } from '../src/negocio/SolicitudConsulta.js';
import type { useSolicitudConsulta } from './useSolicitudConsulta.js';
import { Aviso } from './componentes.js';
import { Icono } from './Icono.js';

export function PantallaMensaje({ consulta, numero }: { consulta: ReturnType<typeof useSolicitudConsulta>; numero: string | null }) {
  const [aperturaFallida, setAperturaFallida] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { if (!consulta.vista) void consulta.preparar().catch(() => {}); }, []);
  useEffect(() => {
    if (!consulta.registro) return;
    const temporizador = setTimeout(() => setAhora(Date.now()), Math.min(Math.max(0, Date.parse(consulta.registro.venceEn) - Date.now()), 2147483647));
    return () => clearTimeout(temporizador);
  }, [consulta.registro]);
  const mensaje = consulta.vista?.mensaje ?? '';
  const enlace = enlaceWhatsApp(numero, consulta.registro?.mensaje ?? '');
  const vencido = consulta.registro?.estado === 'PENDIENTE' && Date.parse(consulta.registro.venceEn) <= ahora;
  async function abrir() {
    if (!numero || consulta.ocupado || vencido) return;
    const ventana = window.open('about:blank', '_blank');
    if (ventana) ventana.opener = null;
    setAperturaFallida(false);
    try {
      const registro = await consulta.registrar();
      if (!registro) { ventana?.close(); return; }
      const destino = enlaceWhatsApp(numero, registro.mensaje);
      try {
        if (ventana && !ventana.closed && destino) ventana.location.href = destino;
        else setAperturaFallida(true);
      } catch { setAperturaFallida(true); }
    } catch { ventana?.close(); }
  }
  return <section className="mensaje-listo">{mensaje && <div className="marca-listo"><Icono nombre="check" tamano={44}/></div>}
    <h1>{consulta.registro ? 'Pedido #' + consulta.registro.id : mensaje ? 'Mensaje listo' : consulta.ocupado ? 'Preparando mensaje' : 'Revisa tu solicitud'}</h1>
    <p className="intro-mensaje">{consulta.registro ? 'Registrado como ' + consulta.registro.estado + '. El mensaje se envía manualmente desde WhatsApp.' : 'Al continuar se guardará un pedido pendiente y se abrirá WhatsApp para que envíes el mensaje.'}</p>
    {consulta.error && <Aviso error>{consulta.error}</Aviso>}
    {vencido && <Aviso error>Terminó el plazo de confirmación. Prepara una nueva solicitud para volver a consultar disponibilidad.</Aviso>}
    {mensaje ? <div className="vista-mensaje"><h2>{consulta.registro ? 'Mensaje del pedido · WhatsApp' : 'Vista previa · WhatsApp'}</h2><pre>{mensaje}</pre></div>
      : consulta.ocupado ? <p role="status" className="nota">Actualizando disponibilidad y precios…</p> : <a className="boton secundario" href="#/solicitud">Revisar mi pedido</a>}
    {consulta.registro && <p className="nota">Plazo para confirmar: {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(consulta.registro.venceEn))}. Los pedidos web pendientes vencen a las 120 horas.</p>}
    <div className="acciones-mensaje">
      <button className="boton whatsapp ancho" type="button" disabled={!numero || !mensaje || consulta.ocupado || vencido} onClick={() => { void abrir(); }}><Icono nombre="whatsapp"/>{consulta.ocupado ? 'Registrando pedido…' : consulta.registro ? 'Abrir WhatsApp del pedido' : 'Registrar pedido y abrir WhatsApp'}</button>
      {!numero && <p className="nota configuracion-pendiente">WhatsApp pendiente de configurar. La vista previa está disponible.</p>}
      {aperturaFallida && enlace && !vencido && <><Aviso>El pedido quedó guardado. El navegador no abrió WhatsApp; utiliza el enlace para continuar.</Aviso><a className="boton whatsapp ancho" href={enlace} target="_blank" rel="noopener noreferrer">Abrir mensaje guardado</a></>}
      {vencido && <button className="boton secundario ancho" onClick={() => { consulta.nueva(); location.hash = '#/solicitud'; }}>Preparar nuevo pedido</button>}
      <a className="boton secundario ancho" href="#/">Volver al catálogo</a><a className="enlace" href="#/solicitud">{consulta.registro ? 'Editar para un nuevo pedido' : 'Editar mi pedido'}</a>
    </div><p className="nota nota-solicitud">{consulta.registro ? 'Abrir WhatsApp no confirma que el mensaje haya sido enviado. El pedido no registra un pago ni reserva unidades.' : 'La vista previa todavía no registra un pedido. El personal tendrá cinco días para confirmarlo una vez registrado.'}</p>
  </section>;
}
