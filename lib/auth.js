import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "sole_equipo";

function secret() {
  return process.env.SESSION_SECRET || "sole::" + (process.env.ADMIN_PASSWORD || "");
}

function sign(v) {
  return crypto.createHmac("sha256", secret()).update(v).digest("base64url");
}

export function passwordOk(pw) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || typeof pw !== "string") return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function setSession() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 30);
  cookies().set(COOKIE, exp + "." + sign(exp), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

export function isTeam() {
  const v = cookies().get(COOKIE)?.value || "";
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
