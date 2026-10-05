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

// Dibuja la boleta (1080×1350) con el QR para guardarla en el celular.
export async function drawTicket(t) {
  try { await document.fonts.ready; } catch {}
  const css = getComputedStyle(document.documentElement);
  const f = (v, fb) => (css.getPropertyValue(v).trim() || fb);
  const DISPLAY = f("--f-display", "Georgia"), LABEL = f("--f-label", "Impact"), MONO = f("--f-mono", "monospace"), BODY = f("--f-body", "sans-serif");
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#140b0b"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(242,230,211,.07)"; g.lineWidth = 2;
  for (let r = 120; r < 1100; r += 70) { g.beginPath(); g.arc(W / 2, 600, r, 0, Math.PI * 2); g.stroke(); }
  g.textAlign = "center";
  g.fillStyle = "#e8913a"; g.font = `500 30px ${LABEL}`;
  g.fillText("EN VIVO  ·  DUITAMA  ·  BOYACÁ", W / 2, 90);
  g.fillStyle = "#f2e6d3"; g.font = `600 150px ${DISPLAY}`;
  g.fillText("Solé", W / 2, 230);
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, "SOLE24OCT|" + t.id, { width: 520, margin: 3, color: { dark: "#140b0b", light: "#f2e6d3" }, errorCorrectionLevel: "M" });
  g.drawImage(qr, (W - 520) / 2, 290);
  const y0 = 290 + 520 + 70;
  g.fillStyle = "#e8913a"; g.font = `600 46px ${MONO}`; g.fillText(t.id, W / 2, y0);
  g.fillStyle = "#f2e6d3"; g.font = `600 60px ${LABEL}`;
  g.fillText(`${t.etapa.nombre} · ${t.etapa.tipo}`.toUpperCase() + (t.cantidad > 1 ? `  ×${t.cantidad}` : ""), W / 2, y0 + 95);
  g.fillStyle = "#b9a690"; g.font = `400 38px ${LABEL}`;
  g.fillText(String(t.nombre).toUpperCase().slice(0, 34), W / 2, y0 + 150);
  g.strokeStyle = "#f2e6d3"; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2 - 160, y0 + 192); g.lineTo(W / 2 + 160, y0 + 192); g.stroke();
  g.fillStyle = "#f2e6d3"; g.font = `600 50px ${LABEL}`; g.fillText("SÁBADO 24 DE OCTUBRE", W / 2, y0 + 258);
  g.font = `500 36px ${LABEL}`; g.fillText("GETBACK · DUITAMA  ·  OPEN ACT BLOKE", W / 2, y0 + 310);
  g.fillStyle = "#b9a690"; g.font = `400 27px ${BODY}`;
  g.fillText(`Muestra este QR en la entrada · válido para ${t.cantidad > 1 ? t.cantidad + " personas" : "1 persona"}`, W / 2, H - 50);
  return c;
}
