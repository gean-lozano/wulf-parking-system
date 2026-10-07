import { useCallback, useEffect, useState } from 'react';
import { api, money } from '../api';
import { Field, onlyDecimal } from '../components/ui';

const nuevo = { nombre: '', tarifa: '', horas: '', sobreestadia: '', tolerancia: '' };
const aTexto = (p) => ({ ...p, tarifa: String(p.tarifa), horas: String(p.horas), sobreestadia: String(p.sobreestadia), tolerancia: String(p.tolerancia) });
const aNumeros = (p) => ({ nombre: p.nombre, tarifa: Number(p.tarifa), horas: Number(p.horas), sobreestadia: Number(p.sobreestadia), tolerancia: Number(p.tolerancia || 0) });

export default function Productos({ toast }) {
  const [lista, setLista] = useState([]);
  const [reg, setReg] = useState(nuevo);
  const [sel, setSel] = useState(null); // producto en edición

  const cargar = useCallback(() => api.get('/productos').then((p) => {
    setLista(p);
    setSel((cur) => (cur && p.find((x) => x.id === cur.id) ? cur : p[0] ? aTexto(p[0]) : null));
  }).catch(toast.err), []); // eslint-disable-line
  useEffect(() => { cargar(); }, [cargar]);

  const completo = (p) => p.nombre && p.tarifa !== '' && p.horas !== '' && p.sobreestadia !== '';

  async function registrar(e) {
    e.preventDefault();
    if (!completo(reg)) return toast.err(new Error('Usa todos los campos'));
    try { await api.post('/productos', aNumeros(reg)); setReg(nuevo); toast.ok('Producto registrado'); cargar(); } catch (err) { toast.err(err); }
  }
  async function cambiar(e) {
    e.preventDefault();
    if (!sel || !completo(sel)) return toast.err(new Error('Usa todos los campos'));
    try { await api.put(`/productos/${sel.id}`, aNumeros(sel)); toast.ok('Producto modificado'); cargar(); } catch (err) { toast.err(err); }
  }
  async function eliminar() {
    if (!sel || !window.confirm(`¿Eliminar el producto "${sel.nombre}"?`)) return;
    try { await api.del(`/productos/${sel.id}`); toast.ok('Producto eliminado'); setSel(null); cargar(); } catch (err) { toast.err(err); }
  }

  const campos = (p, setP, conNombre) => (
    <>
      {conNombre && <Field label="Nombre"><input value={p.nombre} maxLength={20} onChange={(e) => setP({ ...p, nombre: e.target.value })} /></Field>}
      <div className="row">
        <Field label="Tarifa (S/.)"><input inputMode="decimal" value={p.tarifa} onChange={(e) => setP({ ...p, tarifa: onlyDecimal(e.target.value) })} /></Field>
        <Field label="por (horas)"><input inputMode="decimal" value={p.horas} onChange={(e) => setP({ ...p, horas: onlyDecimal(e.target.value) })} /></Field>
      </div>
      <div className="row">
        <Field label="Sobreestadia (S/. por hora)"><input inputMode="decimal" value={p.sobreestadia} onChange={(e) => setP({ ...p, sobreestadia: onlyDecimal(e.target.value) })} /></Field>
        <Field label="Tolerancia (horas)" hint="Entre 0 y 1. Ej: 0.25 = 15 min"><input inputMode="decimal" value={p.tolerancia} onChange={(e) => setP({ ...p, tolerancia: onlyDecimal(e.target.value) })} /></Field>
      </div>
    </>
  );

  return (
    <div className="grid3">
      <form className="card" onSubmit={registrar}>
        <h2>Registro de producto</h2>
        {campos(reg, setReg, true)}
        <button className="primary">Registrar</button>
      </form>

      <form className="card" onSubmit={cambiar}>
        <h2>Modificar producto</h2>
        <Field label="Producto">
          <select value={sel?.id ?? ''} onChange={(e) => { const p = lista.find((x) => x.id === Number(e.target.value)); setSel(p ? aTexto(p) : null); }}>
            {lista.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        {sel && campos(sel, setSel, false)}
        <div className="actions">
          <button type="button" className="danger" onClick={eliminar} disabled={!sel}>Eliminar</button>
          <button className="primary" disabled={!sel}>Cambiar</button>
        </div>
        <p className="hint">Para eliminar un producto, antes retira los vehículos que lo usan.</p>
      </form>

      <section className="card">
        <h2>Productos actuales</h2>
        <table>
          <thead><tr><th>Nombre</th><th className="right">Tarifa</th><th>Horas</th></tr></thead>
          <tbody>{lista.map((p) => <tr key={p.id}><td>{p.nombre}</td><td className="right">{money(p.tarifa)}</td><td>{p.horas}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
