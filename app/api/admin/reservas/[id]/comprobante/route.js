import { sql, ensure } from "@/lib/db";
import { isTeam } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Devuelve la imagen del comprobante para revisarla en el panel.
export async function GET(req, { params }) {
  if (!isTeam()) return new Response("No autorizado", { status: 401 });
  await ensure();
  const r = (await sql()`SELECT comprobante FROM reservas WHERE id = ${params.id}`)[0];
  if (!r || !r.comprobante) return new Response("Sin comprobante", { status: 404 });
  const m = r.comprobante.match(/^data:(image\/[a-z]+);base64,(.*)$/);
  if (!m) return new Response("Formato inválido", { status: 500 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=600" },
  });
}
