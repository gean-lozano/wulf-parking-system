import { useCallback, useEffect, useState } from 'react';
import { api, fmtFecha, openPdf } from '../api';
import { Field, Modal, toPlaca } from '../components/ui';
import SalidaModal from '../components/SalidaModal';

export default function Estacionamiento({ toast }) {
  const [estado, setEstado] = useState(null);
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [placa, setPlaca] = useState('');
  const [placaSalida, setPlacaSalida] = useState('');
  const [salida, setSalida] = useState(null);       // datos de la vista previa de salida
  const [espacioNuevo, setEspacioNuevo] = useState(null); // número de espacio elegido para ingresar
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([api.get('/estacionamiento/estado'), api.get('/productos')]);
      setEstado(e); setProductos(p);
      setProductoId((cur) => (p.some((x) => String(x.id) === String(cur)) ? cur : p[0]?.id ?? ''));
    } catch (e) { toast.err(e); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  async function ingresar(placaIngreso, espacio) {
    if (!placaIngreso) return toast.err(new Error('Faltan datos: escribe la placa'));
    setBusy(true);
    try {
      const v = await api.post('/estacionamiento/ingreso', { placa: placaIngreso, producto_id: Number(productoId), espacio });
      toast.ok(`Ingreso registrado: ${v.placa}`, { label: 'Ver ticket', onClick: () => openPdf(`/vehiculos/${v.id}/ticket-entrada`).catch(toast.err) });
      setPlaca(''); setEspacioNuevo(null);
      cargar();
    } catch (e) { toast.err(e); } finally { setBusy(false); }
  }

  async function buscarSalida(params) {
    try {
      setSalida(await api.get(`/estacionamiento/salida?${params}`));
    } catch (e) { toast.err(e); }
  }

  const alSalir = (r) => {
    setSalida(null); setPlacaSalida('');
    toast.ok(`Salida registrada: ${r.placa} · cobrado S/. ${r.total.toFixed(2)}`);
    cargar();
  };

  if (!estado) return <p>Cargando…</p>;
  const sinProductos = productos.length === 0;

  return (
    <div>
      <div className="stats">
        <div><b>{estado.ocupados}</b><span>Ocupados</span></div>
        <div><b>{estado.libres}</b><span>Libres</span></div>
        <div><b>{estado.capacidad}</b><span>Capacidad</span></div>
      </div>

      {sinProductos && <p className="error">No hay productos. Pide a un administrador que registre al menos uno en la pestaña Productos.</p>}

      <div className="grid2">
        <section className="card">
          <h2>Ingreso</h2>
          <Field label="Producto">
            <select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          {!estado.asignarcasillero ? (
            <form onSubmit={(e) => { e.preventDefault(); ingresar(placa); }}>
              <Field label="Placa">
                <input className="placa" value={placa} onChange={(e) => setPlaca(toPlaca(e.target.value))} maxLength={8} />
              </Field>
              <button className="primary" disabled={busy || sinProductos}>Ingresar</button>
            </form>
          ) : (
            <p className="hint">Elige un espacio libre en el mapa para registrar el ingreso.</p>
          )}
        </section>

        <section className="card">
          <h2>Salida</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (placaSalida) buscarSalida(`placa=${encodeURIComponent(placaSalida)}`); }}>
            <Field label="Placa">
              <input className="placa" value={placaSalida} onChange={(e) => setPlacaSalida(toPlaca(e.target.value))} maxLength={8} />
            </Field>
            <button className="primary" disabled={!placaSalida}>Buscar</button>
          </form>
        </section>
      </div>

      {estado.asignarcasillero && (
        <section className="card">
          <h2>Espacios <small className="legend"><i className="dot libre" /> libre <i className="dot ocupado" /> ocupado</small></h2>
          <div className="espacios">
            {estado.espacios.map((e) => (
              <button key={e.numero} className={`espacio ${e.ocupado ? 'ocupado' : 'libre'}`}
                title={e.ocupado ? `${e.placa} · ${e.producto}` : 'Libre'} disabled={!e.ocupado && sinProductos}
                onClick={() => (e.ocupado ? buscarSalida(`espacio=${e.numero}`) : setEspacioNuevo(e.numero))}>
                {e.numero}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Vehículos dentro</h2>
        {estado.dentro.length === 0 ? <p className="hint">No hay vehículos dentro.</p> : (
          <div className="tabla-wrap"><table>
            <thead><tr><th>Placa</th><th>Producto</th>{estado.asignarcasillero && <th>Espacio</th>}<th>Hora entrada</th><th /></tr></thead>
            <tbody>
              {estado.dentro.map((v) => (
                <tr key={v.id}>
                  <td>{v.placa}</td><td>{v.producto}</td>{estado.asignarcasillero && <td>{v.espacio}</td>}
                  <td>{fmtFecha(v.horaentrada)}</td>
                  <td className="right"><button onClick={() => buscarSalida(`placa=${encodeURIComponent(v.placa)}`)}>Retirar</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      {espacioNuevo !== null && (
        <Modal title={`Ingreso en el espacio ${espacioNuevo}`} onClose={() => setEspacioNuevo(null)}>
          <form onSubmit={(e) => { e.preventDefault(); ingresar(placa, espacioNuevo); }}>
            <Field label="Placa">
              <input className="placa" autoFocus value={placa} onChange={(e) => setPlaca(toPlaca(e.target.value))} maxLength={8} />
            </Field>
            <div className="actions">
              <button type="button" onClick={() => setEspacioNuevo(null)}>Cancelar</button>
              <button className="primary" disabled={busy}>Ingresar</button>
            </div>
          </form>
        </Modal>
      )}

      {salida && <SalidaModal datos={salida} onClose={() => setSalida(null)} onDone={alSalir} onError={toast.err} />}
    </div>
  );
}
