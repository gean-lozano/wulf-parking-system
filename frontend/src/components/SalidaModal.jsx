import { useState } from 'react';
import { api, fmtFecha, money, openPdf } from '../api';
import { Modal, Field, onlyDecimal } from './ui';

/** Confirmación de salida: muestra datos, valor a pagar, "Paga" y "Cambio" (vuelto). */
export default function SalidaModal({ datos, onClose, onDone, onError }) {
  const [paga, setPaga] = useState('');
  const [busy, setBusy] = useState(false);
  const cambio = paga === '' ? null : Number(paga) - datos.valor;

  async function retirar() {
    setBusy(true);
    try {
      const r = await api.post('/estacionamiento/salida', { placa: datos.placa });
      onDone(r);
      openPdf(`/vehiculos/${r.id}/ticket-salida`).catch(onError);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Retirar vehículo" onClose={onClose}>
      <dl className="datos">
        <dt>Producto</dt><dd>{datos.producto}</dd>
        <dt>Placa</dt><dd><strong>{datos.placa}</strong></dd>
        {datos.espacio && (<><dt>Espacio</dt><dd>{datos.espacio}</dd></>)}
        <dt>Hora entrada</dt><dd>{fmtFecha(datos.horaentrada)}</dd>
        <dt>Hora salida</dt><dd>{fmtFecha(datos.horasalida)}</dd>
        <dt>Cantidad horas</dt><dd>{datos.horas.toFixed(2)}</dd>
        <dt>Valor a pagar</dt><dd className="total">{money(datos.valor)}</dd>
      </dl>
      <div className="row">
        <Field label="Paga (S/.)">
          <input inputMode="decimal" value={paga} onChange={(e) => setPaga(onlyDecimal(e.target.value))} autoFocus />
        </Field>
        <Field label="Cambio">
          <input readOnly value={cambio === null ? '' : cambio < 0 ? `Faltan ${money(-cambio)}` : money(cambio)} />
        </Field>
      </div>
      <div className="actions">
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={retirar} disabled={busy}>Retirar</button>
      </div>
    </Modal>
  );
}
