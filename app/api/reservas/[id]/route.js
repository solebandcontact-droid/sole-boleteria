import { sql, ensure } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { json, fail, estadoVisible } from "@/lib/util";

export const dynamic = "force-dynamic";

// El comprador consulta su reserva con el enlace privado (id + token).
export async function GET(req, { params }) {
  try {
    await ensure();
    const k = new URL(req.url).searchParams.get("k") || "";
    const rows = await sql()`SELECT id, token, etapa, cantidad, nombre, total, estado, expira, usado, usado_en
      FROM reservas WHERE id = ${params.id}`;
    const r = rows[0];
    if (!r || r.token !== k) return json({ error: "No encontramos esta reserva. Revisa el enlace." }, 404);
    const cfg = await getConfig();
    const etapa = cfg.etapas.find((e) => e.id === r.etapa) || {};
    return json({
      id: r.id, nombre: r.nombre, cantidad: r.cantidad, total: r.total,
      estado: estadoVisible(r), expira: r.expira, usado: r.usado, usadoEn: r.usado_en,
      etapa: { nombre: etapa.nombre, tipo: etapa.tipo },
      pago: { llave: cfg.llave, titular: cfg.titular },
      whatsapp: cfg.whatsapp,
    });
  } catch (e) {
    return fail(e);
  }
}
