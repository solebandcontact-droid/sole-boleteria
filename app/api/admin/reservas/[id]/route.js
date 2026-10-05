import { sql, ensure } from "@/lib/db";
import { isTeam } from "@/lib/auth";
import { json, fail } from "@/lib/util";

export const dynamic = "force-dynamic";

// Acciones del equipo sobre una reserva: aprobar, rechazar, anular, marcar/desmarcar ingreso.
export async function POST(req, { params }) {
  if (!isTeam()) return json({ error: "auth" }, 401);
  try {
    await ensure();
    const { accion } = await req.json().catch(() => ({}));
    const id = params.id;
    let rows = [];
    if (accion === "aprobar") {
      rows = await sql()`UPDATE reservas SET estado = 'aprobada', revisado_en = now()
        WHERE id = ${id} AND estado IN ('en_revision', 'pendiente', 'rechazada') RETURNING id`;
    } else if (accion === "rechazar") {
      rows = await sql()`UPDATE reservas SET estado = 'rechazada', revisado_en = now()
        WHERE id = ${id} AND estado IN ('en_revision', 'pendiente') RETURNING id`;
    } else if (accion === "anular") {
      rows = await sql()`UPDATE reservas SET estado = 'anulada', revisado_en = now() WHERE id = ${id} RETURNING id`;
    } else if (accion === "desmarcar_ingreso") {
      rows = await sql()`UPDATE reservas SET usado = false, usado_en = NULL WHERE id = ${id} RETURNING id`;
    } else {
      return json({ error: "Acción no válida." }, 400);
    }
    if (!rows.length) return json({ error: "No se pudo aplicar a esta reserva en su estado actual." }, 409);
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
