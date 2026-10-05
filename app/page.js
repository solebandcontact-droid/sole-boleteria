"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, cop } from "@/lib/client";

export default function Comprar() {
  const router = useRouter();
  const [cfg, setCfg] = useState(null);
  const [err, setErr] = useState("");
  const [etapa, setEtapa] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [msg, setMsg] = useState({ t: "", k: "" });
  const [busy, setBusy] = useState(false);
  const [ultima, setUltima] = useState(null);

  useEffect(() => {
    api("/api/config").then((c) => {
      setCfg(c);
      const first = c.etapas.find((e) => e.quedan == null || e.quedan > 0);
      if (first) setEtapa(first.id);
    }).catch((e) => setErr(e.message));
    try { const u = JSON.parse(localStorage.getItem("sole_reserva") || "null"); if (u && u.id) setUltima(u); } catch {}
  }, []);

  const sel = cfg?.etapas.find((e) => e.id === etapa);
  const total = sel ? sel.precio * cantidad : 0;
  const mins = Number(cfg?.minutosReserva) || 120;
  const plazo = mins % 60 === 0 ? `las próximas ${mins / 60} ${mins === 60 ? "hora" : "horas"}` : `los próximos ${mins} minutos`;

  async function submit(ev) {
    ev.preventDefault();
    if (!sel) return setMsg({ t: "Elige una etapa.", k: "err" });
    if (!acepto) return setMsg({ t: `Confirma que vas a pagar por Bre-B en ${plazo}.`, k: "err" });
    setBusy(true); setMsg({ t: "Apartando tus boletas…", k: "" });
    try {
      const r = await api("/api/reservas", { etapa, cantidad, nombre, telefono });
      try { localStorage.setItem("sole_reserva", JSON.stringify({ id: r.id, token: r.token })); } catch {}
      router.push(`/r/${r.id}?k=${r.token}`);
    } catch (e) {
      setMsg({ t: e.message, k: "err" }); setBusy(false);
      api("/api/config").then(setCfg).catch(() => {});
    }
  }

  return (
    <main className="wrap">
      <header className="hero">
        <p className="eyebrow">En vivo · Duitama · Boyacá</p>
        <h1 className="brand">Solé</h1>
        <p className="date">Sábado 24 de octubre</p>
        <p className="place">GetBack · Duitama &nbsp;·&nbsp; <span className="muted">Open act</span> Bloke <span className="muted">desde Chía</span></p>
      </header>

      {ultima && (
        <a className="btn ghost block" href={`/r/${ultima.id}?k=${ultima.token}`}>Ver mi reserva {ultima.id}</a>
      )}

      <hr className="rule" />

      {err && <p className="msg err">{err}</p>}
      {!cfg && !err && <p className="muted">Cargando boletas…</p>}

      {cfg && !cfg.ventasAbiertas && (
        <div className="status wait"><div className="big">Venta en línea cerrada</div>
          <p>{cfg.taquilla ? `Quedan boletas en taquilla el día del show: ${cop(cfg.taquilla.precio)}.` : "Escríbenos para saber disponibilidad."}</p></div>
      )}

      {cfg && cfg.ventasAbiertas && (
        <form className="stack" onSubmit={submit} noValidate>
          <h2>1. Elige tu boleta</h2>
          <div className="stack">
            {cfg.etapas.map((e) => {
              const agotada = e.quedan != null && e.quedan <= 0;
              return (
                <label key={e.id} className={"stage" + (agotada ? " off" : "")}>
                  <input type="radio" name="etapa" id={"e-" + e.id} value={e.id} checked={etapa === e.id} disabled={agotada} onChange={() => setEtapa(e.id)} />
                  <span className="n">{e.nombre}
                    <small>{e.tipo}{e.nota ? " · " + e.nota : ""}{" "}
                      {agotada ? <span className="tag">Agotada</span> : e.quedan != null && e.quedan <= 15 ? <span className="tag hot">Quedan {e.quedan}</span> : null}
                    </small>
                  </span>
                  <span className="p">{cop(e.precio)}</span>
                </label>
              );
            })}
            {cfg.taquilla && (
              <p className="small muted">{cfg.taquilla.nombre} ({cfg.taquilla.tipo}): {cop(cfg.taquilla.precio)} en la puerta el día del show, si queda cupo.</p>
            )}
          </div>

          <h2>2. Tus datos</h2>
          <label className="f">Nombre completo
            <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" placeholder="Como aparece en tu cédula" required />
          </label>
          <div className="grid2">
            <label className="f">Celular (WhatsApp)
              <input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="300 000 0000" required />
            </label>
            <label className="f">Cantidad
              <select id="cantidad" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <div className="pay">
            <span className="k">Total a pagar</span>
            <span className="v">{cop(total)}</span>
          </div>
          <label className="check"><input type="checkbox" id="acepto" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
            <span>Voy a pagar por <b>Bre-B</b> (desde Nequi, Daviplata o cualquier banco) y subir el comprobante en {plazo}. Si no, la reserva se libera.</span>
          </label>
          <button className="btn block" type="submit" disabled={busy}>Apartar y ver datos de pago</button>
          <p className={"msg " + msg.k} role="status">{msg.t}</p>
        </form>
      )}

      <hr className="rule" />
      <p className="foot">
        ¿Dudas con tu compra?{" "}
        {cfg?.whatsapp ? <a href={`https://wa.me/57${cfg.whatsapp.replace(/^57/, "")}`} target="_blank" rel="noopener">Escríbenos por WhatsApp</a> : "Escríbenos por Instagram"}
        {" "}· <a href="https://instagram.com/solebandofficial" target="_blank" rel="noopener">@solebandofficial</a>
      </p>
    </main>
  );
}
