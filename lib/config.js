import { sql, ensure } from "./db";

// Valores iniciales. Todo esto se edita desde /equipo → Ajustes.
export const DEFAULT_CONFIG = {
  ventasAbiertas: true,
  llave: "3213918818",
  titular: "",
  whatsapp: "",
  minutosReserva: 120,
  etapas: [
    { id: "huracan", nombre: "Huracán", tipo: "Fan", letra: "H", precio: 15000, tope: 40, web: true, activa: true, nota: "Primeras 40" },
    { id: "sole", nombre: "Solé", tipo: "General", letra: "S", precio: 20000, tope: null, web: true, activa: true, nota: "Hasta el jueves 22" },
    { id: "adios", nombre: "Adiós", tipo: "Taquilla", letra: "A", precio: 25000, tope: null, web: false, activa: true, nota: "Día del show" },
  ],
};

export async function getConfig() {
  await ensure();
  const rows = await sql()`SELECT data FROM config WHERE id = 1`;
  if (!rows.length) return DEFAULT_CONFIG;
  const saved = rows[0].data || {};
  const etapas = DEFAULT_CONFIG.etapas.map((d) => ({ ...d, ...((saved.etapas || []).find((e) => e.id === d.id) || {}) }));
  return { ...DEFAULT_CONFIG, ...saved, etapas };
}

export async function saveConfig(data) {
  await ensure();
  await sql()`INSERT INTO config (id, data) VALUES (1, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
}

// Boletas que ocupan cupo: aprobadas, en revisión, y reservas pendientes que no han vencido.
export async function ocupadas() {
  await ensure();
  const rows = await sql()`SELECT etapa, COALESCE(SUM(cantidad), 0)::int AS n FROM reservas
    WHERE estado IN ('aprobada', 'en_revision') OR (estado = 'pendiente' AND expira > now())
    GROUP BY etapa`;
  const m = {};
  rows.forEach((r) => (m[r.etapa] = r.n));
  return m;
}
