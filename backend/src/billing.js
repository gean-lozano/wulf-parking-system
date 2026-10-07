/**
 * Lógica de cobro (portada de _db.salida / retirar_espacio del proyecto Swing).
 *
 * Reglas del producto:
 *   tarifa        -> precio que cubre las primeras `horas` horas
 *   horas         -> horas incluidas en la tarifa
 *   tolerancia    -> horas extra "gratis" (0.25 = 15 min) sobre `horas`
 *   sobreestadia  -> precio por cada hora (o fracción) adicional
 *
 * NOTA DE MEJORA: en el código Swing, dentro del bloque de horas se cobraba
 * ceil(horas_dentro) * tarifa, o sea la "tarifa por 3 horas" se multiplicaba por
 * cada hora usada (2.5 h => 30 en vez de 10). Aquí la tarifa es un precio fijo por el
 * bloque, como indica el ticket ("Tarifa S/. 10 por 3 horas").
 */
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function calcularCobro({ entrada, salida, tarifa, horas, sobreestadia, tolerancia = 0 }) {
  const horasDentro = Math.max(0, (new Date(salida) - new Date(entrada)) / 3600000);
  const limite = Number(horas) + Number(tolerancia);
  let valor = Number(tarifa);
  if (horasDentro > limite) {
    valor += Math.ceil(horasDentro - limite) * Number(sobreestadia);
  }
  return { horasDentro: r2(horasDentro), valor: r2(valor) };
}

/** El IGV está incluido en el precio: se desglosa subtotal + IGV = total. */
function desglosarIgv(total, igvPct) {
  const subtotal = r2(total / (1 + Number(igvPct) / 100));
  return { subtotal, igv: r2(total - subtotal), total: r2(total) };
}

/** Vuelto (campo "Paga" / "Cambio" de la ventana original). */
const vuelto = (paga, total) => r2(Number(paga) - Number(total));

module.exports = { calcularCobro, desglosarIgv, vuelto, r2 };
