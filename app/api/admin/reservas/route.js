import { sql, ensure } from "@/lib/db";
import { getConfig, ocupadas } from "@/lib/config";
import { isTeam } from "@/lib/auth";
import { json, fail, estadoVisible } from "@/lib/util";

export const dynamic = "force-dynamic";

// Todas las reservas (sin las imágenes) + configuración, para el panel del equipo.
export async function GET() {
  if (!isTeam()) return json({ error: "auth" }, 401);
  try {
    await ensure();
    const rows = await sql()`SELECT id, token, etapa, cantidad, nombre, telefono, total, estado, pago, canal, vendedor,
        creado, expira, revisado_en, usado, usado_en, (comprobante IS NOT NULL) AS tiene_comprobante
      FROM reservas ORDER BY creado DESC LIMIT 2000`;
    const cfg = await getConfig();
    const occ = await ocupadas();
    return json({
      reservas: rows.map((r) => ({ ...r, estado: estadoVisible(r) })),
      config: cfg,
      ocupadas: occ,
    });
  } catch (e) {
    return fail(e);
  }
}
