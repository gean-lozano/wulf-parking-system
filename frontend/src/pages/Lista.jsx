import { useCallback, useEffect, useState } from 'react';
import { api, downloadFile, fmtFecha, money } from '../api';
import { Field, toPlaca } from '../components/ui';

const vacio = { estado: 'fuera', producto_id: '', placa: '', fecha: '', desde: '', hasta: '' };

export default function Lista({ toast }) {
  const [f, setF] = useState(vacio);
  const [productos, setProductos] = useState([]);
  const [data, setData] = useState({ items: [], total: 0 });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'placa' ? toPlaca(e.target.value) : e.target.value }));

  const qs = (filtros) => new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();

  const buscar = useCallback(async (filtros) => {
    try { setData(await api.get(`/vehiculos?${qs(filtros)}`)); } catch (e) { toast.err(e); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { api.get('/productos').then(setProductos).catch(toast.err); buscar(vacio); }, []); // eslint-disable-line

  const reset = () => { setF(vacio); buscar(vacio); };

  return (
    <div>
      <section className="card">
        <div className="filtros">
          <Field label="Estado">
            <select value={f.estado} onChange={set('estado')}>
              <option value="">Todos</option><option value="en">Dentro</option><option value="fuera">Fuera</option>
            </select>
          </Field>
          <Field label="Producto">
            <select value={f.producto_id} onChange={set('producto_id')}>
              <option value="">Todos</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Placa"><input value={f.placa} onChange={set('placa')} maxLength={8} /></Field>
          <Field label="Día de entrada"><input type="date" value={f.fecha} onChange={set('fecha')} /></Field>
          <Field label="Desde"><input type="date" value={f.desde} onChange={set('desde')} /></Field>
          <Field label="Hasta"><input type="date" value={f.hasta} onChange={set('hasta')} /></Field>
          <div className="actions">
            <button onClick={reset}>Reset</button>
            <button className="primary" onClick={() => buscar(f)}>Buscar</button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="tabla-wrap"><table>
          <thead><tr><th>Placa</th><th>Producto</th><th>Espacio</th><th>Hora entrada</th><th>Hora salida</th><th className="right">Pago</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={6} className="hint">No hay datos</td></tr>}
            {data.items.map((v) => (
              <tr key={v.id}>
                <td>{v.placa}</td><td>{v.producto}</td><td>{v.espacio ?? ''}</td>
                <td>{fmtFecha(v.horaentrada)}</td><td>{fmtFecha(v.horasalida)}</td>
                <td className="right">{v.valorpagado != null ? money(v.valorpagado) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="reporte">
          <span>Ingresos del filtro: <strong>{money(data.total)}</strong> ({data.items.length} registros)</span>
          <button onClick={() => downloadFile(`/vehiculos/export.xlsx?${qs(f)}`, 'vehiculos.xlsx').catch(toast.err)}>Exportar Excel</button>
        </div>
      </section>
    </div>
  );
}
