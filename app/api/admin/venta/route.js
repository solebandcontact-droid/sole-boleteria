import { sql } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { isTeam } from "@/lib/auth";
import { json, fail, randCode, randToken } from "@/lib/util";

export const dynamic = "force-dynamic";

// Venta registrada por el equipo (en persona o en taquilla). Queda aprobada de una vez.
export async function POST(req) {
  if (!isTeam()) return json({ error: "auth" }, 401);
  try {
    const b = await req.json().catch(() => ({}));
    const cfg = await getConfig();
    const etapa = cfg.etapas.find((e) => e.id === b.etapa && e.activa);
    if (!etapa) return json({ error: "Etapa no válida." }, 400);
    const nombre = String(b.nombre || "").trim().slice(0, 80);
    const telefono = String(b.telefono || "").replace(/\D/g, "").slice(-10) || null;
    const cantidad = parseInt(b.cantidad, 10);
    if (nombre.length < 2) return json({ error: "Escribe el nombre." }, 400);
    if (!(cantidad >= 1 && cantidad <= 20)) return json({ error: "Cantidad entre 1 y 20." }, 400);
    const tope = etapa.tope == null ? null : Number(etapa.tope);
    const ingresa = !!b.ingresa;
    const token = randToken();

    for (let i = 0; i < 4; i++) {
      const id = etapa.letra + "-" + randCode(5);
      const rows = await sql()`
        INSERT INTO reservas (id, token, etapa, cantidad, nombre, telefono, total, estado, pago, canal, vendedor, revisado_en, usado, usado_en)
        SELECT ${id}, ${token}, ${etapa.id}, ${cantidad}::int, ${nombre}, ${telefono}, ${etapa.precio * cantidad}::int, 'aprobada',
               ${String(b.pago || "Efectivo")}, 'equipo', ${String(b.vendedor || "")}, now(), ${ingresa}::boolean,
               CASE WHEN ${ingresa}::boolean THEN now() ELSE NULL END
        WHERE ${tope}::int IS NULL OR (
          SELECT COALESCE(SUM(cantidad), 0) FROM reservas
          WHERE etapa = ${etapa.id}
            AND (estado IN ('aprobada', 'en_revision') OR (estado = 'pendiente' AND expira > now()))
        ) + ${cantidad}::int <= ${tope}::int
        ON CONFLICT (id) DO NOTHING
        RETURNING id`;
      if (rows.length) return json({ id: rows[0].id, token });
      if (tope != null) return json({ error: `No hay cupo suficiente en ${etapa.nombre}. Sube el tope en Ajustes si quieres vender más.` }, 409);
    }
    return json({ error: "No se pudo registrar. Intenta de nuevo." }, 500);
  } catch (e) {
    return fail(e);
  }
}
