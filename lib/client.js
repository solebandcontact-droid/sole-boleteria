"use client";
import QRCode from "qrcode";

export const cop = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
export const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "");
export const fecha = (iso) => (iso ? new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export async function api(url, body) {
  const res = await fetch(url, body === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Error de conexión."); e.status = res.status; throw e; }
  return data;
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// Comprime una foto a JPEG (máx. 1400 px) para subirla rápido aunque la señal sea mala.
export function compressImage(file, max = 1400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

let _logo = null;
function logo() {
  if (!_logo) _logo = new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = "/logo-sole.png"; });
  return _logo;
}

// Dibuja la boleta (1080×1350) con el estilo del flyer de Tunja, lista para guardar o publicar.
export async function drawTicket(t) {
  try { await document.fonts.ready; } catch {}
  const css = getComputedStyle(document.documentElement);
  const f = (v, fb) => (css.getPropertyValue(v).trim() || fb);
  const LABEL = f("--f-label", "Oswald") + ", 'Arial Narrow', Impact, sans-serif";
  const SERIF = f("--f-serif", "Georgia") + ", Georgia, serif";
  const MONO = f("--f-mono", "monospace") + ", monospace";
  const CREAM = "#ede8e1", CYAN = "#6fd3dc", MUTED = "#b8b0a8";
  const OS = (w, px) => `${w} ${px}px ${LABEL}`;
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const sp = (px) => { try { g.letterSpacing = px + "px"; } catch {} };
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#161922"); bg.addColorStop(1, "#0a0b10");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 330, 40, W / 2, 330, 640);
  glow.addColorStop(0, "rgba(111,211,220,.22)"); glow.addColorStop(1, "rgba(111,211,220,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.font = OS(700, 120); g.strokeStyle = "rgba(237,232,225,.07)"; g.lineWidth = 2; g.textAlign = "left";
  for (let i = 0; i < 4; i++) { const y = 470 + i * 125; const off = i % 2 ? -160 : -40; for (let x = off; x < W; x += 470) g.strokeText("SOLÉ ·", x, y); }
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(237,232,225,${0.15 + rnd() * 0.5})`; g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.8 + rnd() * 2, 0, Math.PI * 2); g.fill(); }
  g.textAlign = "center";
  g.fillStyle = CREAM; g.font = `italic 500 44px ${SERIF}`; g.fillText("Chatica Linda", W / 2, 92);
  g.font = OS(500, 24); sp(8); g.fillText("PRESENTA", W / 2 + 4, 132); sp(0);
  g.fillStyle = CYAN; g.fillRect(W / 2 - 60, 152, 120, 3);
  const L = await logo();
  if (L) { const LW = 400, LH = (LW * L.naturalHeight) / L.naturalWidth; g.drawImage(L, (W - LW) / 2, 172, LW, LH); }
  else { g.fillStyle = CREAM; g.font = OS(700, 140); g.fillText("SOLÉ", W / 2, 330); }
  g.fillStyle = CREAM; g.font = OS(400, 26); sp(9); g.fillText("ÚLTIMO CONCIERTO DEL AÑO", W / 2 + 4, 392);
  g.fillStyle = CYAN; g.font = OS(500, 26); sp(6); g.fillText("JUNTO A  INSOMNICA", W / 2 + 3, 436); sp(0);
  const Q = 400, qx = (W - Q) / 2, qy = 478;
  g.strokeStyle = CYAN; g.lineWidth = 4; g.strokeRect(qx - 14, qy - 14, Q + 28, Q + 28);
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, "SOLE28NOV|" + t.id, { width: Q, margin: 2, color: { dark: "#0f1218", light: CREAM }, errorCorrectionLevel: "M" });
  g.drawImage(qr, qx, qy, Q, Q);
  const py = qy + Q + 46; g.fillStyle = CYAN;
  g.beginPath(); if (g.roundRect) g.roundRect(W / 2 - 160, py, 320, 70, 12); else g.rect(W / 2 - 160, py, 320, 70); g.fill();
  g.fillStyle = "#0a0b10"; g.font = `600 44px ${MONO}`; g.fillText(t.id, W / 2, py + 51);
  const nom = String(t.nombre || "").toUpperCase().slice(0, 40); let size = 64; g.font = OS(700, size);
  while (g.measureText(nom).width > W - 140 && size > 34) { size -= 2; g.font = OS(700, size); }
  g.fillStyle = CREAM; g.fillText(nom, W / 2, py + 160);
  g.fillStyle = MUTED; g.font = OS(400, 34); sp(4);
  g.fillText(t.cantidad > 1 ? `ENTRADA PARA ${t.cantidad} PERSONAS` : "ENTRADA PARA 1 PERSONA", W / 2, py + 212); sp(0);
  const fy = py + 300;
  g.fillStyle = "rgba(237,232,225,.25)"; g.fillRect(W / 2 - 1, fy - 52, 2, 84);
  g.textAlign = "right"; g.fillStyle = CREAM; g.font = OS(700, 46); g.fillText("Sábado 28 Nov", W / 2 - 40, fy);
  g.fillStyle = CYAN; g.font = OS(600, 32); g.fillText("8:00 PM", W / 2 - 40, fy + 40);
  g.textAlign = "left"; g.fillStyle = CREAM; g.font = OS(700, 46); g.fillText("Chatica Linda", W / 2 + 40, fy);
  g.fillStyle = MUTED; g.font = OS(400, 28); g.fillText("Cra. 9 #19-92 · Tunja", W / 2 + 40, fy + 40);
  g.textAlign = "center"; g.fillStyle = MUTED; g.font = OS(300, 25); sp(3);
  g.fillText("MUESTRA ESTE COMPROBANTE EN LA ENTRADA  ·  @SOLEBANDOFFICIAL", W / 2, H - 42); sp(0);
  return c;
}
