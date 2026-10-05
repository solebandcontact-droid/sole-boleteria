import crypto from "crypto";
import { NextResponse } from "next/server";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randCode(n) {
  const bytes = crypto.randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHA[bytes[i] % ALPHA.length];
  return s;
}

export function randToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function normCode(raw) {
  let s = String(raw || "").trim().toUpperCase();
  if (s.includes("|")) s = s.split("|").pop();
  s = s.replace(/[^A-Z0-9]/g, "");
  if (s.length === 6) s = s[0] + "-" + s.slice(1);
  return s;
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(e) {
  if (e && e.message === "NO_DB") return json({ error: "La base de datos no está configurada todavía." }, 503);
  console.error(e);
  return json({ error: "Error del servidor. Intenta de nuevo." }, 500);
}

// Estado que ve el comprador: una reserva pendiente vencida se muestra como vencida.
export function estadoVisible(r) {
  if (r.estado === "pendiente" && r.expira && new Date(r.expira) < new Date()) return "vencida";
  return r.estado;
}
