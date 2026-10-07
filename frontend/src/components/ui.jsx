import { useEffect, useState } from 'react';

/** Mensaje temporal (éxito / error) que reemplaza los JOptionPane del original. */
export function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.action ? 15000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast && (
    <div className={`toast ${toast.type}`} role="status">
      <span>{toast.text}</span>
      {toast.action && <button onClick={toast.action.onClick}>{toast.action.label}</button>}
      <button className="x" onClick={() => setToast(null)} aria-label="Cerrar">×</button>
    </div>
  );
  return {
    toastNode: node,
    ok: (text, action) => setToast({ type: 'ok', text, action }),
    err: (e) => setToast({ type: 'err', text: e.message || String(e) }),
  };
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

/** Solo deja números (y opcionalmente decimales), con límite de largo: reemplaza _val.java */
export const onlyDigits = (v, max) => v.replace(/\D/g, '').slice(0, max);
export const onlyDecimal = (v) => v.replace(',', '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
export const toPlaca = (v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
