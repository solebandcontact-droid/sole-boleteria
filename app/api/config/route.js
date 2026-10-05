import { getConfig, ocupadas } from "@/lib/config";
import { json, fail } from "@/lib/util";

export const dynamic = "force-dynamic";

// Información pública: etapas a la venta, cupos y contacto.
export async function GET() {
  try {
    const cfg = await getConfig();
    const occ = await ocupadas();
    const etapas = cfg.etapas
      .filter((e) => e.web && e.activa)
      .map((e) => ({
        id: e.id, nombre: e.nombre, tipo: e.tipo, precio: e.precio, nota: e.nota,
        quedan: e.tope == null ? null : Math.max(0, e.tope - (occ[e.id] || 0)),
      }));
    const taquilla = cfg.etapas.find((e) => !e.web && e.activa);
    return json({
      ventasAbiertas: cfg.ventasAbiertas,
      whatsapp: cfg.whatsapp,
      minutosReserva: cfg.minutosReserva,
      etapas,
      taquilla: taquilla ? { nombre: taquilla.nombre, tipo: taquilla.tipo, precio: taquilla.precio } : null,
    });
  } catch (e) {
    return fail(e);
  }
}
