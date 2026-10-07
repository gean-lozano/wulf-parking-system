import { useEffect, useState } from 'react';
import { api } from '../api';
import { Field, onlyDecimal, onlyDigits } from '../components/ui';

export default function Parametros({ toast }) {
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/parametros').then((p) => setF({ ...p, igv: String(p.igv), capacidad: String(p.capacidad) })).catch(toast.err); }, []); // eslint-disable-line

  if (!f) return <p>Cargando…</p>;
  const set = (k, fn = (v) => v) => (e) => setF((x) => ({ ...x, [k]: fn(e.target.value) }));

  async function guardar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await api.put('/parametros', { ...f, igv: Number(f.igv), capacidad: Number(f.capacidad) });
      setF({ ...p, igv: String(p.igv), capacidad: String(p.capacidad) });
      toast.ok('Parámetros guardados');
    } catch (err) { toast.err(err); } finally { setBusy(false); }
  }

  return (
    <form className="card" onSubmit={guardar}>
      <h2>Datos del estacionamiento</h2>
      <div className="form-grid">
        <Field label="Razón social"><input value={f.razon} onChange={set('razon')} maxLength={50} required /></Field>
        <Field label="RUC"><input value={f.ruc} onChange={set('ruc', (v) => onlyDigits(v, 11))} inputMode="numeric" required /></Field>
        <Field label="Dirección"><input value={f.direccion} onChange={set('direccion')} maxLength={50} required /></Field>
        <Field label="Celular"><input value={f.celular} onChange={set('celular', (v) => onlyDigits(v, 9))} inputMode="numeric" required /></Field>
        <Field label="IGV (%)" hint="Incluido en el precio. Ej: 18"><input value={f.igv} onChange={set('igv', onlyDecimal)} inputMode="decimal" required /></Field>
        <Field label="Capacidad"><input value={f.capacidad} onChange={set('capacidad', (v) => onlyDigits(v, 4))} inputMode="numeric" required /></Field>
      </div>
      <Field label="Comentario (aparece en los tickets)">
        <textarea value={f.comentario} onChange={set('comentario')} maxLength={300} rows={3} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={f.asignarcasillero} onChange={(e) => setF((x) => ({ ...x, asignarcasillero: e.target.checked }))} />
        Asignar espacios (casilleros numerados)
      </label>
      <p className="hint"><b>Recomendación:</b> retira todos los vehículos antes de asignar o desasignar espacios.</p>
      <button className="primary" disabled={busy}>Guardar</button>
    </form>
  );
}
