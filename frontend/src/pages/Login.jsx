import { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onLogin }) {
  const [usu, setUsu] = useState('');
  const [contra, setContra] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.post('/auth/login', { usu, contra });
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <h1>ESTACIONAMIENTO</h1>
        <label className="field"><span>Usuario</span>
          <input value={usu} onChange={(e) => setUsu(e.target.value)} maxLength={20} autoFocus autoComplete="username" />
        </label>
        <label className="field"><span>Contraseña</span>
          <input type="password" value={contra} onChange={(e) => setContra(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={loading || !usu || !contra}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  );
}
