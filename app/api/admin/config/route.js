import { getConfig, saveConfig } from "@/lib/config";
import { isTeam } from "@/lib/auth";
import { json, fail } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isTeam()) return json({ error: "auth" }, 401);
  try {
    const b = await req.json().catch(() => ({}));
    const cur = await getConfig();
    const etapas = cur.etapas.map((e) => {
      const n = (b.etapas || []).find((x) => x.id === e.id) || {};
      const tope = n.tope === "" || n.tope == null ? null : Math.max(0, parseInt(n.tope, 10) || 0);
      return {
        ...e,
        precio: Math.max(0, parseInt(n.precio ?? e.precio, 10) || e.precio),
        tope: "tope" in n ? tope : e.tope,
        activa: "activa" in n ? !!n.activa : e.activa,
        web: "web" in n ? !!n.web : e.web,
        nota: "nota" in n ? String(n.nota).slice(0, 60) : e.nota,
      };
    });
    const next = {
      ...cur,
      ventasAbiertas: "ventasAbiertas" in b ? !!b.ventasAbiertas : cur.ventasAbiertas,
      llave: "llave" in b ? String(b.llave).trim().slice(0, 60) : cur.llave,
      titular: "titular" in b ? String(b.titular).trim().slice(0, 80) : cur.titular,
      whatsapp: "whatsapp" in b ? String(b.whatsapp).replace(/\D/g, "").slice(0, 13) : cur.whatsapp,
      minutosReserva: "minutosReserva" in b ? Math.min(1440, Math.max(15, parseInt(b.minutosReserva, 10) || 120)) : cur.minutosReserva,
      etapas,
    };
    await saveConfig(next);
    return json({ ok: true, config: next });
  } catch (e) {
    return fail(e);
  }
}
