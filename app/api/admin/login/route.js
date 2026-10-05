import { passwordOk, setSession } from "@/lib/auth";
import { json } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!process.env.ADMIN_PASSWORD) return json({ error: "Falta configurar la contraseña del equipo (ADMIN_PASSWORD) en Vercel." }, 503);
  const body = await req.json().catch(() => ({}));
  if (!passwordOk(body.password)) return json({ error: "Contraseña incorrecta." }, 401);
  setSession();
  return json({ ok: true });
}
