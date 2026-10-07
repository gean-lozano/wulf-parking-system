import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Field } from '../components/ui';

export default function Usuarios({ toast, yo }) {
  const [lista, setLista] = useState([]);
  const [f, setF] = useState({ usu: '', contra: '', rol: 'cajero' });
  const cargar = useCallback(() => api.get('/usuarios').then(setLista).catch(toast.err), []); // eslint-disable-line
  useEffect(() => { cargar(); }, [cargar]);

  async function crear(e) {
    e.preventDefault();
    try { await api.post('/usuarios', f); setF({ usu: '', contra: '', rol: 'cajero' }); toast.ok('Usuario creado'); cargar(); } catch (err) { toast.err(err); }
  }
  async function clave(u) {
    const contra = window.prompt(`Nueva contraseña para ${u.usu} (mínimo 6 caracteres)`);
    if (!contra) return;
    try { await api.put(`/usuarios/${u.id}/password`, { contra }); toast.ok('Contraseña actualizada'); } catch (err) { toast.err(err); }
  }
  async function borrar(u) {
    if (!window.confirm(`¿Eliminar al usuario ${u.usu}?`)) return;
    try { await api.del(`/usuarios/${u.id}`); cargar(); } catch (err) { toast.err(err); }
  }

  return (
    <div className="grid2">
      <form className="card" onSubmit={crear}>
        <h2>Nuevo usuario</h2>
        <Field label="Usuario"><input value={f.usu} maxLength={20} onChange={(e) => setF({ ...f, usu: e.target.value })} autoComplete="off" /></Field>
        <Field label="Contraseña (mín. 6)"><input type="password" value={f.contra} onChange={(e) => setF({ ...f, contra: e.target.value })} autoComplete="new-password" /></Field>
        <Field label="Rol">
          <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
            <option value="cajero">cajero (ingresos, salidas y lista)</option>
            <option value="admin">admin (todo)</option>
          </select>
        </Field>
        <button className="primary" disabled={!f.usu || f.contra.length < 6}>Crear</button>
      </form>
      <section className="card">
        <h2>Usuarios</h2>
        <table>
          <thead><tr><th>Usuario</th><th>Rol</th><th /></tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td>{u.usu}{u.id === yo.id && ' (tú)'}</td><td>{u.rol}</td>
                <td className="right">
                  <button onClick={() => clave(u)}>Cambiar clave</button>{' '}
                  {u.id !== yo.id && <button className="danger" onClick={() => borrar(u)}>Eliminar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
