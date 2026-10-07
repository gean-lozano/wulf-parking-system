-- NakPark Web - esquema PostgreSQL
-- Equivalente al nakpark.sql original (MySQL), con mejoras:
--  * timestamptz en vez de varchar para las fechas
--  * restricciones: una placa / un espacio solo pueden estar "en" una vez
--  * contraseñas con hash (bcrypt) en vez de texto plano
--  * productos con borrado lógico (para no perder el historial)

CREATE TABLE IF NOT EXISTS detalle_estacionamiento (
  id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  razon            VARCHAR(50)  NOT NULL DEFAULT '',
  ruc              VARCHAR(11)  NOT NULL DEFAULT '',
  direccion        VARCHAR(50)  NOT NULL DEFAULT '',
  celular          VARCHAR(9)   NOT NULL DEFAULT '',
  comentario       VARCHAR(300) NOT NULL DEFAULT '',
  igv              NUMERIC(5,2) NOT NULL DEFAULT 18 CHECK (igv >= 0 AND igv <= 100), -- porcentaje, ej. 18
  capacidad        INTEGER      NOT NULL DEFAULT 50 CHECK (capacidad > 0),
  asignarcasillero BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS producto (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(20)   NOT NULL,
  tarifa       NUMERIC(10,2) NOT NULL CHECK (tarifa >= 0),
  horas        NUMERIC(6,2)  NOT NULL CHECK (horas > 0),
  sobreestadia NUMERIC(10,2) NOT NULL CHECK (sobreestadia >= 0),
  tolerancia   NUMERIC(6,2)  NOT NULL DEFAULT 0 CHECK (tolerancia >= 0),
  activo       BOOLEAN       NOT NULL DEFAULT TRUE
);
-- el nombre es único solo entre productos activos
CREATE UNIQUE INDEX IF NOT EXISTS producto_nombre_activo_uq ON producto (LOWER(nombre)) WHERE activo;

CREATE TABLE IF NOT EXISTS usuario (
  id       SERIAL PRIMARY KEY,
  usu      VARCHAR(20)  NOT NULL UNIQUE,
  contra   VARCHAR(100) NOT NULL,                       -- hash bcrypt
  rol      VARCHAR(20)  NOT NULL CHECK (rol IN ('admin','cajero'))
);

CREATE TABLE IF NOT EXISTS vehiculo (
  id           SERIAL PRIMARY KEY,
  placa        VARCHAR(8)  NOT NULL,
  producto_id  INTEGER     NOT NULL REFERENCES producto(id),
  espacio      INTEGER,                                  -- NULL cuando no se asignan casilleros
  horaentrada  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  horasalida   TIMESTAMPTZ,
  valorpagado  NUMERIC(10,2),
  estado       VARCHAR(15) NOT NULL DEFAULT 'en' CHECK (estado IN ('en','fuera'))
);
CREATE UNIQUE INDEX IF NOT EXISTS vehiculo_placa_en_uq   ON vehiculo (placa)   WHERE estado = 'en';
CREATE UNIQUE INDEX IF NOT EXISTS vehiculo_espacio_en_uq ON vehiculo (espacio) WHERE estado = 'en' AND espacio IS NOT NULL;
CREATE INDEX IF NOT EXISTS vehiculo_horaentrada_idx ON vehiculo (horaentrada);
