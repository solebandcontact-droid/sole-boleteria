import { clearSession } from "@/lib/auth";
import { json } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function POST() {
  clearSession();
  return json({ ok: true });
}
