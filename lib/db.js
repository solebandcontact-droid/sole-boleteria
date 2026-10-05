import { neon } from "@neondatabase/serverless";

let _sql = null;
let _ready = null;

export function sql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("NO_DB");
    _sql = neon(url);
  }
  return _sql;
}

// Crea las tablas la primera vez que se usa la base (no hay que correr migraciones a mano).
export function ensure() {
  if (!_ready) {
    _ready = (async () => {
      const s = sql();
      await s`CREATE TABLE IF NOT EXISTS config (
        id INT PRIMARY KEY,
        data JSONB NOT NULL
      )`;
      await s`CREATE TABLE IF NOT EXISTS reservas (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        etapa TEXT NOT NULL,
        cantidad INT NOT NULL DEFAULT 1,
        nombre TEXT NOT NULL,
        telefono TEXT,
        total INT NOT NULL,
        estado TEXT NOT NULL,
        comprobante TEXT,
        pago TEXT,
        canal TEXT NOT NULL DEFAULT 'web',
        vendedor TEXT,
        creado TIMESTAMPTZ NOT NULL DEFAULT now(),
        expira TIMESTAMPTZ,
        revisado_en TIMESTAMPTZ,
        usado BOOLEAN NOT NULL DEFAULT false,
        usado_en TIMESTAMPTZ
      )`;
      await s`CREATE INDEX IF NOT EXISTS reservas_etapa_idx ON reservas (etapa, estado)`;
    })().catch((e) => {
      _ready = null;
      throw e;
    });
  }
  return _ready;
}
