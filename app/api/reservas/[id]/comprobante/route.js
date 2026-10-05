import { sql, ensure } from "@/lib/db";
import { json, fail } from "@/lib/util";

export const dynamic = "force-dynamic";

// El comprador sube el pantallazo del pago (comprimido en el navegador a JPEG).
export async function POST(req, { params }) {
  try {
    await ensure();
    const body = await req.json().catch(() => ({}));
    const img = String(body.imagen || "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(img)) return json({ error: "Sube una imagen del comprobante." }, 400);
    if (img.length > 1_500_000) return json({ error: "La imagen es muy pesada. Intenta con un pantallazo." }, 400);

    const rows = await sql()`UPDATE reservas SET comprobante = ${img}, estado = 'en_revision'
      WHERE id = ${params.id} AND token = ${String(body.k || "")}
        AND (estado = 'en_revision' OR (estado = 'pendiente' AND expira > now()))
      RETURNING id`;
    if (rows.length) return json({ ok: true });

    const r = (await sql()`SELECT estado, expira FROM reservas WHERE id = ${params.id} AND token = ${String(body.k || "")}`)[0];
    if (!r) return json({ error: "No encontramos esta reserva." }, 404);
    if (r.estado === "pendiente") return json({ error: "Tu reserva venció. Haz una nueva desde la página de boletas." }, 409);
    return json({ error: "Esta reserva ya no recibe comprobantes." }, 409);
  } catch (e) {
    return fail(e);
  }
}
