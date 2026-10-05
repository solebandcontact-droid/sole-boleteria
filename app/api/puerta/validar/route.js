import { sql, ensure } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { isTeam } from "@/lib/auth";
import { json, fail, normCode } from "@/lib/util";

export const dynamic = "force-dynamic";

// Valida un QR en la entrada. Cada boleta entra una sola vez.
export async function POST(req) {
  if (!isTeam()) return json({ error: "auth" }, 401);
  try {
    await ensure();
    const { codigo } = await req.json().catch(() => ({}));
    const id = normCode(codigo);
    if (!id) return json({ resultado: "invalida", mensaje: "Código vacío." });
    const cfg = await getConfig();
    const name = (et) => {
      const e = cfg.etapas.find((x) => x.id === et) || {};
      return `${e.nombre || et} ${e.tipo || ""}`.trim();
    };

    const ok = await sql()`UPDATE reservas SET usado = true, usado_en = now()
      WHERE id = ${id} AND estado = 'aprobada' AND usado = false
      RETURNING id, nombre, cantidad, etapa`;
    if (ok.length) {
      const r = ok[0];
      return json({ resultado: "ok", id: r.id, nombre: r.nombre, cantidad: r.cantidad, etapa: name(r.etapa) });
    }
    const r = (await sql()`SELECT id, nombre, cantidad, etapa, estado, usado, usado_en FROM reservas WHERE id = ${id}`)[0];
    if (!r) return json({ resultado: "invalida", id, mensaje: "Este código no existe." });
    const base = { id: r.id, nombre: r.nombre, cantidad: r.cantidad, etapa: name(r.etapa) };
    if (r.estado === "aprobada" && r.usado) return json({ ...base, resultado: "usada", usadoEn: r.usado_en });
    const why = { pendiente: "El pago no se ha confirmado.", en_revision: "El pago está en revisión: apruébalo en el panel antes de dejarlo pasar.", rechazada: "El pago fue rechazado.", anulada: "Esta boleta fue anulada." };
    return json({ ...base, resultado: "invalida", mensaje: why[r.estado] || "Boleta no válida." });
  } catch (e) {
    return fail(e);
  }
}
