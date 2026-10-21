import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import type { VarianteNueva } from '../src/models.js';
import { limiteFotografia, extensionesFotografia } from '../src/fotografias.js';
import { solicitar, subirFotografia, mensajeError } from './api.js';
import { Aviso, Cargando, ErrorCarga, Fotografia, nombreArticulo } from './componentes.js';
import { Icono } from './Icono.js';

export function PantallaProducto({ token, id }: { token: string; id?: number }) {
  const [articulo, setArticulo] = useState<ArticuloCatalogo | null>(null);
  const [cargando, setCargando] = useState(Boolean(id));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    let actual = true;
    void solicitar<ArticuloCatalogo>(`personal/catalogo/${id}`, token).then(a => { if (actual) setArticulo(a); })
      .catch(e => { if (actual) setError(mensajeError(e)); }).finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, [id, token]);
  return cargando ? <Cargando/> : error ? <ErrorCarga mensaje={error}/> : <FormularioProducto token={token} articulo={articulo}/>;
}

function FormularioProducto({ token, articulo }: { token: string; articulo: ArticuloCatalogo | null }) {
  const [nombre, setNombre] = useState(articulo?.nombre ?? '');
  const [categoria, setCategoria] = useState(articulo?.categoria ?? '');
  const [precio, setPrecio] = useState(String(articulo?.precioBase ?? ''));
  const [sobrePedido, setSobrePedido] = useState(articulo?.sobrePedido ?? false);
  const [variantes, setVariantes] = useState<VarianteNueva[]>([{ tallaMedida: 'Única', existencia: 0 }]);
  const [fotografia, setFotografia] = useState(articulo?.fotografia ?? '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState('');
  const [subida, setSubida] = useState('');
  const [fase, setFase] = useState('');
  const [error, setError] = useState('');
  const [existencias, setExistencias] = useState(articulo);
  const [ajustando, setAjustando] = useState(false);
  const enCurso = useRef(false);
  const selector = useRef<HTMLInputElement>(null);
  const ocupado = Boolean(fase) || ajustando;
  useEffect(() => {
    if (!archivo) { setPrevia(''); return; }
    const ruta = URL.createObjectURL(archivo); setPrevia(ruta);
    return () => URL.revokeObjectURL(ruta);
  }, [archivo]);
  function elegir(elegido?: File) {
    if (!elegido) return;
    if (!extensionesFotografia[elegido.type] || !elegido.size || elegido.size > limiteFotografia) {
      setError('Elige una imagen JPEG, PNG o WebP de hasta 5 MiB.');
      if (selector.current) selector.current.value = '';
      return;
    }
    setArchivo(elegido); setSubida(''); setError('');
  }
  function quitarFoto() { setArchivo(null); setSubida(''); setFotografia(''); if (selector.current) selector.current.value = ''; }
  async function guardar(evento: FormEvent) {
    evento.preventDefault(); if (enCurso.current || ajustando) return;
    setError('');
    if (!articulo) {
      const tallas = variantes.map(v => v.tallaMedida.trim().toLocaleLowerCase('es'));
      if (!tallas.length || tallas.some(t => !t) || new Set(tallas).size !== tallas.length) { setError('Agrega al menos una variante y evita repetir tallas o medidas.'); return; }
    }
    enCurso.current = true;
    try {
      let ruta = subida || fotografia;
      if (archivo && !subida) { setFase('Subiendo imagen…'); ruta = await subirFotografia(archivo, token); setSubida(ruta); }
      setFase('Guardando producto…');
      const ficha = { nombre, categoria, precioBase: Number(precio), sobrePedido, fotografia: ruta };
      const guardado = await solicitar<ArticuloCatalogo>(articulo ? `personal/catalogo/${articulo.id}` : 'personal/catalogo', token,
        articulo ? 'PATCH' : 'POST', articulo ? ficha : { ...ficha, variantes });
      location.hash = `#/articulo/${guardado.id}`;
    } catch (e) { setError(mensajeError(e)); }
    finally { enCurso.current = false; setFase(''); }
  }
  return <>
    <a className="volver" href={articulo ? `#/articulo/${articulo.id}` : '#/'}><Icono nombre="volver" tamano={16}/>Volver {articulo ? 'al producto' : 'al catálogo'}</a>
    <div className="titulo-pagina"><div><h1>{articulo ? 'Editar producto' : 'Nuevo producto'}</h1><p>{articulo ? 'Actualiza la ficha y ajusta las existencias de cada variante.' : 'Registra un artículo con sus variantes y existencias iniciales.'}</p></div></div>
    <form className="editor-producto" onSubmit={e => { void guardar(e); }} aria-busy={Boolean(fase)}>
      <fieldset className="ficha-producto" disabled={ocupado}><legend className="sr-only">Datos del producto</legend>
        <div className="campos-producto"><label className="campo-ancho">Nombre<input value={nombre} required onChange={e => setNombre(e.target.value)}/></label>
          <label>Categoría<input value={categoria} required placeholder="Ej. Ropa" onChange={e => setCategoria(e.target.value)}/></label>
          <label>Precio base · MXN<input type="number" min="0" step="0.01" required value={precio} onChange={e => setPrecio(e.target.value)}/></label>
          <label className="check-producto campo-ancho"><input type="checkbox" checked={sobrePedido} onChange={e => setSobrePedido(e.target.checked)}/><span>Artículo sobre pedido</span></label>
        </div>
        {sobrePedido && <p className="nota">El público verá «Consultar precio». El personal confirma la disponibilidad con el proveedor antes de registrar el pedido.</p>}
        {!articulo && <section className="variantes-alta"><h2>Variantes</h2><p className="nota">Utiliza «Única» si el artículo no tiene talla o medida.</p>
          {variantes.map((v, i) => <div className="variante-alta" key={i}><label>Talla / medida<input aria-label={`Talla o medida de variante ${i + 1}`} value={v.tallaMedida} required onChange={e => setVariantes(actual => actual.map((item, n) => n === i ? { ...item, tallaMedida: e.target.value } : item))}/></label>
            <label>Existencia inicial<input aria-label={`Existencia inicial de variante ${i + 1}`} type="number" min="0" max="2147483647" step="1" required value={v.existencia} onChange={e => setVariantes(actual => actual.map((item, n) => n === i ? { ...item, existencia: Number(e.target.value) } : item))}/></label>
            <button className="boton texto" type="button" aria-label={`Quitar variante ${i + 1}`} disabled={variantes.length === 1} onClick={() => setVariantes(actual => actual.filter((_, n) => n !== i))}>Quitar</button></div>)}
          <button className="boton secundario" type="button" onClick={() => setVariantes(actual => [...actual, { tallaMedida: '', existencia: 0 }])}><Icono nombre="mas" tamano={16}/>Añadir variante</button>
        </section>}
      </fieldset>
      <fieldset className="foto-producto" disabled={ocupado}><legend>Fotografía</legend><Fotografia ruta={previa || fotografia} nombre={nombreArticulo(nombre) || 'Producto'}/>
        <label className="seleccionar-foto">Seleccionar imagen<input ref={selector} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => elegir(e.target.files?.[0])}/></label>
        <p className="nota">Opcional · JPEG, PNG o WebP · hasta 5 MiB</p>{archivo && <p className="archivo-elegido">{archivo.name}</p>}
        {(archivo || fotografia) && <button className="boton texto" type="button" onClick={quitarFoto}>Quitar imagen de la ficha</button>}
      </fieldset>
      <div className="guardar-producto">{error && <Aviso error>{error}</Aviso>}{fase && <p role="status" className="nota">{fase}</p>}<div className="acciones-editor"><button className="boton" type="submit" disabled={ocupado}>{fase || (articulo ? 'Guardar cambios' : 'Crear producto')}</button><button className="boton secundario" type="button" disabled={ocupado} onClick={() => { location.hash = articulo ? `#/articulo/${articulo.id}` : '#/'; }}>Cancelar</button></div></div>
    </form>
    {existencias && <section className="existencias-producto"><h2>Existencias por variante</h2><p className="nota">Cada ajuste se guarda al aplicarlo. No modifica pedidos anteriores.</p><div className="lista-ajustes">{existencias.variantes.map(v => <AjusteVariante key={v.id} id={existencias.id} variante={v} token={token} bloqueado={ocupado} alOcupar={setAjustando} alActualizar={setExistencias}/>)}</div></section>}
  </>;
}

function AjusteVariante({ id, variante, token, bloqueado, alOcupar, alActualizar }: {
  id: number; variante: ArticuloCatalogo['variantes'][number]; token: string; bloqueado: boolean;
  alOcupar: (valor: boolean) => void; alActualizar: (valor: ArticuloCatalogo) => void;
}) {
  const [unidades, setUnidades] = useState('1'); const [signo, setSigno] = useState('1');
  const [mensaje, setMensaje] = useState(''); const [error, setError] = useState(''); const enCurso = useRef(false);
  async function ajustar(e: FormEvent) {
    e.preventDefault(); if (enCurso.current || bloqueado) return;
    enCurso.current = true; alOcupar(true); setMensaje(''); setError('');
    try {
      const actual = await solicitar<ArticuloCatalogo>(`personal/catalogo/${id}/variantes/${variante.id}/existencias`, token, 'POST', { cambio: Number(unidades) * Number(signo) });
      alActualizar(actual); setMensaje(`Ajuste guardado. ${actual.variantes.find(v => v.id === variante.id)?.existencia} disponibles.`);
    } catch (e) { setError(mensajeError(e)); }
    finally { enCurso.current = false; alOcupar(false); }
  }
  return <form className="ajuste-variante" onSubmit={e => { void ajustar(e); }}><div className="existencia-actual"><h3>{variante.tallaMedida}</h3><p><strong>{variante.existencia}</strong> disponibles</p></div>
    <label>Acción<select value={signo} disabled={bloqueado} aria-label={`Acción para ${variante.tallaMedida}`} onChange={e => { setSigno(e.target.value); setError(''); setMensaje(''); }}><option value="1">Añadir</option><option value="-1">Retirar</option></select></label>
    <label>Unidades<input type="number" min="1" step="1" max="2147483647" required disabled={bloqueado} value={unidades} aria-label={`Unidades para ${variante.tallaMedida}`} onChange={e => { setUnidades(e.target.value); setError(''); setMensaje(''); }}/></label>
    <button className="boton secundario" type="submit" disabled={bloqueado}>{enCurso.current ? 'Aplicando…' : 'Aplicar ajuste'}</button>
    {error && <div className="resultado-ajuste"><Aviso error>{error}</Aviso></div>}{mensaje && <div className="resultado-ajuste"><Aviso>{mensaje}</Aviso></div>}
  </form>;
}
