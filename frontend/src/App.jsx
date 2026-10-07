import { useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import { useToast } from './components/ui';
import Login from './pages/Login';
import Estacionamiento from './pages/Estacionamiento';
import Lista from './pages/Lista';
import Parametros from './pages/Parametros';
import Productos from './pages/Productos';
import Usuarios from './pages/Usuarios';

// Igual que el original: Parámetros y Productos solo para admin (Usuarios es una mejora nueva)
const TABS = [
  { id: 'est', label: 'Estacionamiento', Page: Estacionamiento },
  { id: 'lista', label: 'Lista', Page: Lista },
  { id: 'par', label: 'Parámetros', Page: Parametros, admin: true },
  { id: 'prod', label: 'Productos', Page: Productos, admin: true },
  { id: 'usu', label: 'Usuarios', Page: Usuarios, admin: true },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());
  const [tab, setTab] = useState('est');
  const toast = useToast();

  const salir = () => { setToken(null); setUser(null); setTab('est'); };

  useEffect(() => {
    setUnauthorizedHandler(salir);
    if (!getToken()) return;
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setChecking(false));
  }, []);

  if (checking) return <p className="center">Cargando…</p>;
  if (!user) return <Login onLogin={setUser} />;

  const visibles = TABS.filter((t) => !t.admin || user.rol === 'admin');
  const { Page } = visibles.find((t) => t.id === tab) ?? visibles[0];

  return (
    <div className="app">
      <header>
        <h1>ESTACIONAMIENTO</h1>
        <div className="sesion">
          <span>{user.usu} · {user.rol}</span>
          <button onClick={salir}>Cerrar sesión</button>
        </div>
      </header>
      <nav>
        {visibles.map((t) => (
          <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      <main><Page toast={toast} yo={user} key={tab} /></main>
      {toast.toastNode}
    </div>
  );
}
