-- Datos iniciales (equivalentes a los del nakpark.sql original)
INSERT INTO detalle_estacionamiento (id, razon, ruc, direccion, celular, comentario, igv, capacidad, asignarcasillero)
VALUES (1, 'ESTACIONAMIENTO', '12345678901', '151 west 34 street', '916015263', 'no pierda el ticket', 18, 50, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO producto (nombre, tarifa, horas, sobreestadia, tolerancia)
SELECT 'autos', 10, 3, 5, 0 WHERE NOT EXISTS (SELECT 1 FROM producto WHERE nombre='autos');
INSERT INTO producto (nombre, tarifa, horas, sobreestadia, tolerancia)
SELECT 'moto 1 hora', 3, 1, 3, 0 WHERE NOT EXISTS (SELECT 1 FROM producto WHERE nombre='moto 1 hora');

-- El usuario admin lo crea el script `npm run db:init` del backend (con contraseña hasheada).
