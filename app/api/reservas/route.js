import { sql } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { json, fail, randCode, randToken } from "@/lib/util";

export const dynamic = "force-dynamic";

// El comprador aparta sus boletas. Queda "pendiente" hasta que suba el comprobante.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cfg = await getConfig();
    if (!cfg.ventasAbiertas) return json({ error: "La venta en línea está cerrada." }, 400);

    const etapa = cfg.etapas.find((e) => e.id === body.etapa && e.web && e.activa);
    if (!etapa) return json({ error: "Esa etapa no está disponible." }, 400);

    const nombre = String(body.nombre || "").trim().slice(0, 80);
    const telefono = String(body.telefono || "").replace(/\D/g, "").slice(-10);
    const cantidad = parseInt(body.cantidad, 10);
    if (nombre.length < 3) return json({ error: "Escribe tu nombre completo." }, 400);
    if (telefono.length !== 10) return json({ error: "Escribe un celular de 10 dígitos." }, 400);
    if (!(cantidad >= 1 && cantidad <= 6)) return json({ error: "Puedes comprar entre 1 y 6 boletas." }, 400);

    const total = etapa.precio * cantidad;
    const tope = etapa.tope == null ? null : Number(etapa.tope);
    const mins = Number(cfg.minutosReserva) || 120;
    const token = randToken();

    for (let i = 0; i < 4; i++) {
      const id = etapa.letra + "-" + randCode(5);
      // Inserta solo si todavía hay cupo en la etapa.
      const rows = await sql()`
        INSERT INTO reservas (id, token, etapa, cantidad, nombre, telefono, total, estado, canal, expira)
        SELECT ${id}, ${token}, ${etapa.id}, ${cantidad}::int, ${nombre}, ${telefono}, ${total}::int, 'pendiente', 'web',
               now() + make_interval(mins => ${mins}::int)
        WHERE ${tope}::int IS NULL OR (
          SELECT COALESCE(SUM(cantidad), 0) FROM reservas
          WHERE etapa = ${etapa.id}
            AND (estado IN ('aprobada', 'en_revision') OR (estado = 'pendiente' AND expira > now()))
        ) + ${cantidad}::int <= ${tope}::int
        ON CONFLICT (id) DO NOTHING
        RETURNING id`;
      if (rows.length) return json({ id: rows[0].id, token });
      if (tope != null) {
        const [{ n }] = await sql()`SELECT COALESCE(SUM(cantidad), 0)::int AS n FROM reservas
          WHERE etapa = ${etapa.id} AND (estado IN ('aprobada', 'en_revision') OR (estado = 'pendiente' AND expira > now()))`;
        if (n + cantidad > tope) {
          const quedan = Math.max(0, tope - n);
          return json({ error: quedan ? `Solo quedan ${quedan} boletas ${etapa.nombre}.` : `Se agotó la etapa ${etapa.nombre}.` }, 409);
        }
      }
    }
    return json({ error: "No se pudo crear la reserva. Intenta de nuevo." }, 500);
  } catch (e) {
    return fail(e);
  }
}
