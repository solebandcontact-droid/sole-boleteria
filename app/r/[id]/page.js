"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, cop, copy, hora, compressImage, drawTicket } from "@/lib/client";

export default function Reserva({ params, searchParams }) {
  const id = params.id;
  const k = searchParams?.k || "";
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ t: "", k: "" });
  const [busy, setBusy] = useState(false);
  const qrRef = useRef(null);

  const load = useCallback(() => api(`/api/reservas/${id}?k=${encodeURIComponent(k)}`).then(setR).catch((e) => setErr(e.message)), [id, k]);

  useEffect(() => { load(); }, [load]);
  // Mientras se revisa el pago, la página se actualiza sola.
  useEffect(() => {
    if (r?.estado !== "en_revision" && r?.estado !== "pendiente") return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [r?.estado, load]);
  useEffect(() => {
    if (r?.estado === "aprobada" && qrRef.current) {
      QRCode.toCanvas(qrRef.current, "SOLE24OCT|" + r.id, { width: 600, margin: 1, color: { dark: "#140b0b", light: "#f2e6d3" }, errorCorrectionLevel: "M" });
    }
  }, [r]);

  const link = typeof window !== "undefined" ? window.location.href : "";
  const ref = `SOLE ${id}`;
  const wa = r?.whatsapp ? `https://wa.me/57${r.whatsapp.replace(/^57/, "")}?text=${encodeURIComponent(`Hola, tengo una duda con mi reserva ${id} para Solé en GetBack.`)}` : null;

  async function upload(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setBusy(true); setMsg({ t: "Subiendo comprobante…", k: "" });
    try {
      const imagen = await compressImage(file);
      await api(`/api/reservas/${id}/comprobante`, { k, imagen });
      setMsg({ t: "", k: "" });
      await load();
    } catch (e) { setMsg({ t: e.message, k: "err" }); }
    setBusy(false);
  }

  async function guardar() {
    const c = await drawTicket(r);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `Boleta-Sole-${r.id}.png`;
    a.click();
  }

  if (err) return (
    <main className="wrap"><h1 className="brand">Solé</h1><div className="status bad"><div className="big">No encontramos la reserva</div><p>{err}</p></div>
      <a className="btn ghost" href="/">Ir a boletas</a></main>
  );
  if (!r) return <main className="wrap"><h1 className="brand">Solé</h1><p className="muted">Cargando tu reserva…</p></main>;

  const head = (
    <header className="hero">
      <p className="eyebrow">Sáb 24 oct · GetBack · Duitama</p>
      <h1 className="brand">Solé</h1>
      <p className="place">{r.etapa.nombre} · {r.etapa.tipo} &nbsp;×{r.cantidad} &nbsp;·&nbsp; {r.nombre}</p>
    </header>
  );

  const saveLink = (
    <div className="card">
      <p className="small muted">Guarda este enlace: aquí verás tu QR cuando se confirme el pago.</p>
      <button className="btn ghost sm" onClick={async () => setMsg((await copy(link)) ? { t: "Enlace copiado.", k: "ok" } : { t: link, k: "" })}>Copiar enlace de mi reserva</button>
    </div>
  );

  return (
    <main className="wrap">
      {head}

      {r.estado === "pendiente" && (
        <>
          <div className="status wait"><div className="big">Boletas apartadas</div>
            <p>Paga y sube el comprobante antes de las <b>{hora(r.expira)}</b>, o la reserva se libera.</p></div>
          <ol className="steps">
            <li><div>
              <h3>Paga por Bre-B</h3>
              <p className="small muted">Desde Nequi, Daviplata o la app de tu banco, envía a esta llave:</p>
              <div className="pay"><span className="k">Llave Bre-B</span><span className="v">{r.pago.llave}</span>
                {r.pago.titular && <span className="small muted">A nombre de {r.pago.titular}</span>}</div>
              <div className="grid2">
                <div className="pay"><span className="k">Valor exacto</span><span className="v">{cop(r.total)}</span></div>
                <div className="pay"><span className="k">En la descripción escribe</span><span className="v" style={{ fontSize: 20 }}>{ref}</span></div>
              </div>
              <button className="btn ghost sm" onClick={async () => setMsg((await copy(r.pago.llave)) ? { t: "Llave copiada.", k: "ok" } : { t: "Copia la llave: " + r.pago.llave, k: "" })}>Copiar llave</button>
            </div></li>
            <li><div>
              <h3>Sube el comprobante</h3>
              <p className="small muted">El pantallazo donde se vea el valor y la fecha.</p>
              <label className="btn block" htmlFor="comprobante" aria-disabled={busy}>{busy ? "Subiendo…" : "Subir pantallazo del pago"}</label>
              <input id="comprobante" type="file" accept="image/*" hidden onChange={upload} disabled={busy} />
            </div></li>
            <li><div>
              <h3>Recibe tu QR</h3>
              <p className="small muted">Cuando confirmemos el pago, tu QR aparece en esta misma página.</p>
            </div></li>
          </ol>
          <p className={"msg " + msg.k} role="status">{msg.t}</p>
          {saveLink}
        </>
      )}

      {r.estado === "en_revision" && (
        <>
          <div className="status wait"><div className="big">Pago en revisión</div>
            <p>Recibimos tu comprobante. Apenas confirmemos la transferencia, tu QR aparece aquí. Esta página se actualiza sola.</p></div>
          <label className="btn ghost block" htmlFor="comprobante2">Cambiar comprobante</label>
          <input id="comprobante2" type="file" accept="image/*" hidden onChange={upload} disabled={busy} />
          <p className={"msg " + msg.k} role="status">{msg.t}</p>
          {saveLink}
        </>
      )}

      {r.estado === "aprobada" && (
        <>
          <div className={"status " + (r.usado ? "wait" : "ok")}>
            <div className="big">{r.usado ? "Boleta usada" : "¡Pago confirmado!"}</div>
            <p>{r.usado ? `Ingresaste a las ${hora(r.usadoEn)}.` : `Muestra este QR en la entrada. Válido para ${r.cantidad > 1 ? r.cantidad + " personas" : "1 persona"}.`}</p>
          </div>
          <div className="qr"><canvas ref={qrRef} aria-label={"Código QR de la boleta " + r.id} /></div>
          <p className="code">{r.id}</p>
          <div className="btns">
            <button className="btn" onClick={guardar}>Guardar boleta en el celular</button>
          </div>
          <p className="small muted" style={{ textAlign: "center" }}>Puedes guardar la imagen o volver a este enlace el día del show.</p>
        </>
      )}

      {["rechazada", "vencida", "anulada"].includes(r.estado) && (
        <>
          <div className="status bad"><div className="big">{{ rechazada: "Pago no confirmado", vencida: "Reserva vencida", anulada: "Boleta anulada" }[r.estado]}</div>
            <p>{{ rechazada: "No pudimos confirmar tu transferencia. Escríbenos con tu comprobante y lo revisamos.", vencida: "No recibimos el comprobante a tiempo y las boletas se liberaron. Puedes hacer una reserva nueva.", anulada: "Esta boleta ya no es válida. Escríbenos si crees que es un error." }[r.estado]}</p></div>
          <a className="btn block" href="/">Hacer una nueva reserva</a>
        </>
      )}

      <hr className="rule" />
      <p className="foot">Reserva <span className="code" style={{ fontSize: 14 }}>{r.id}</span>
        {wa && <> · <a href={wa} target="_blank" rel="noopener">Ayuda por WhatsApp</a></>}
      </p>
    </main>
  );
}
