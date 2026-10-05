"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Login from "@/components/Login";
import { api, cop, fecha, hora, drawTicket } from "@/lib/client";

const EST = { pendiente: "Sin pagar", en_revision: "Por revisar", aprobada: "Aprobada", rechazada: "Rechazada", vencida: "Vencida", anulada: "Anulada" };
const VENDEDORES = ["Natalia", "Mayk", "Andrés", "Diego", "David", "Bloke", "GetBack"];

export default function Equipo() {
  const [auth, setAuth] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("revisar");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setData(await api("/api/admin/reservas")); setAuth(true); setErr(""); }
    catch (e) { if (e.status === 401) setAuth(false); else setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!auth) return; const t = setInterval(load, 15000); return () => clearInterval(t); }, [auth, load]);

  if (auth === false) return <Login titulo="Panel de boletería" onOk={load} />;
  if (!data) return <main className="wrap"><h1 className="brand">Solé</h1><p className={err ? "msg err" : "muted"}>{err || "Cargando…"}</p></main>;

  const rev = data.reservas.filter((r) => r.estado === "en_revision");
  return (
    <main className="wrap wide">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div><p className="eyebrow">Panel del equipo · 24 oct</p><h1 className="brand" style={{ fontSize: 44 }}>Solé</h1></div>
        <div className="row"><a className="btn ghost sm" href="/puerta">Ir a puerta</a>
          <button className="btn ghost sm" onClick={async () => { await api("/api/admin/logout", {}); setAuth(false); }}>Salir</button></div>
      </header>
      <nav className="tabs" role="tablist">
        {[["revisar", "Por revisar", rev.length], ["boletas", "Boletas"], ["vender", "Vender"], ["resumen", "Resumen"], ["ajustes", "Ajustes"]].map(([id, label, n]) => (
          <button key={id} role="tab" id={"tab-" + id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}{n ? <span className="badge">{n}</span> : null}</button>
        ))}
      </nav>
      {err && <p className="msg err">{err}</p>}
      {tab === "revisar" && <Revisar items={rev} cfg={data.config} reload={load} />}
      {tab === "boletas" && <Boletas items={data.reservas} cfg={data.config} reload={load} />}
      {tab === "vender" && <Vender cfg={data.config} occ={data.ocupadas} reload={load} />}
      {tab === "resumen" && <Resumen items={data.reservas} cfg={data.config} occ={data.ocupadas} />}
      {tab === "ajustes" && <Ajustes cfg={data.config} reload={load} />}
    </main>
  );
}

function etapaDe(cfg, id) { return cfg.etapas.find((e) => e.id === id) || { nombre: id, tipo: "" }; }

async function accion(id, a, reload, setMsg) {
  try { await api(`/api/admin/reservas/${id}`, { accion: a }); setMsg && setMsg(""); await reload(); }
  catch (e) { setMsg ? setMsg(e.message) : null; }
}

function Revisar({ items, cfg, reload }) {
  const [msg, setMsg] = useState("");
  if (!items.length) return <p className="empty">No hay pagos por revisar. Cuando un comprador suba su comprobante aparece aquí.</p>;
  return (
    <section className="stack">
      <p className="small muted">Busca en tu app la transferencia con la descripción <b>SOLE + código</b> y el valor exacto. Si llegó, aprueba.</p>
      {msg && <p className="msg err">{msg}</p>}
      <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {items.map((r) => {
          const e = etapaDe(cfg, r.etapa);
          return (
            <article key={r.id} className="item">
              <div className="top"><span className="nm">{r.nombre}</span><span className="cd">{r.id}</span></div>
              <p className="small muted">{e.nombre} ×{r.cantidad} · <b style={{ color: "var(--fg)" }}>{cop(r.total)}</b> · {r.telefono} · {fecha(r.creado)}</p>
              {r.tiene_comprobante && <a href={`/api/admin/reservas/${r.id}/comprobante`} target="_blank" rel="noopener"><img className="proof" src={`/api/admin/reservas/${r.id}/comprobante`} alt={"Comprobante de " + r.nombre} loading="lazy" /></a>}
              <div className="btns">
                <button className="btn ok" onClick={() => accion(r.id, "aprobar", reload, setMsg)}>Aprobar</button>
                <button className="btn danger" onClick={() => accion(r.id, "rechazar", reload, setMsg)}>Rechazar</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Boletas({ items, cfg, reload }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("todas");
  const [open, setOpen] = useState(null);
  const [conf, setConf] = useState("");
  const [msg, setMsg] = useState("");
  const rows = useMemo(() => items.filter((r) =>
    (f === "todas" || r.estado === f) &&
    (!q || [r.nombre, r.telefono, r.id].join(" ").toLowerCase().includes(q.toLowerCase()))), [items, q, f]);

  async function compartir(r) {
    const link = `${location.origin}/r/${r.id}?k=${r.token}`;
    const text = `¡Hola ${r.nombre.split(" ")[0]}! Esta es tu boleta para Solé en GetBack, Duitama — sábado 24 de octubre. Tu QR: ${link}`;
    const wa = r.telefono ? `https://wa.me/57${r.telefono}?text=${encodeURIComponent(text)}` : null;
    if (wa) window.open(wa, "_blank", "noopener"); else { try { await navigator.clipboard.writeText(text); setMsg("Mensaje copiado."); } catch { setMsg(link); } }
  }
  async function imagen(r) {
    const c = await drawTicket({ ...r, etapa: etapaDe(cfg, r.etapa) });
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `Boleta-Sole-${r.id}.png`; a.click();
  }

  return (
    <section className="stack">
      <div className="grid2">
        <input id="buscar" placeholder="Buscar por nombre, celular o código" value={q} onChange={(e) => setQ(e.target.value)} />
        <select id="filtro" value={f} onChange={(e) => setF(e.target.value)}>
          <option value="todas">Todas</option>{Object.entries(EST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {msg && <p className="msg">{msg}</p>}
      {!rows.length && <p className="empty">{items.length ? "Ninguna reserva coincide." : "Todavía no hay reservas. Comparte la página de compra en el Linktree."}</p>}
      <div className="stack">
        {rows.map((r) => {
          const e = etapaDe(cfg, r.etapa);
          return (
            <article key={r.id} className="item">
              <div className="top" onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: "pointer" }}>
                <span className="nm">{r.nombre}{r.cantidad > 1 ? ` ×${r.cantidad}` : ""}</span>
                <span className="row"><span className={"pill " + r.estado}>{EST[r.estado]}</span>{r.usado && <span className="pill aprobada">Entró {hora(r.usado_en)}</span>}</span>
              </div>
              <p className="small muted"><span className="cd">{r.id}</span> · {e.nombre} · {cop(r.total)} · {r.canal === "web" ? "Web (Bre-B)" : `${r.pago || ""} · ${r.vendedor || "equipo"}`} · {fecha(r.creado)}{r.telefono ? ` · ${r.telefono}` : ""}</p>
              {open === r.id && (
                <div className="btns">
                  {r.estado === "aprobada" && <button className="btn sm" onClick={() => compartir(r)}>Enviar QR por WhatsApp</button>}
                  {r.estado === "aprobada" && <button className="btn ghost sm" onClick={() => imagen(r)}>Descargar boleta</button>}
                  {["pendiente", "en_revision", "rechazada", "vencida"].includes(r.estado) && <button className="btn ok sm" onClick={() => accion(r.id, "aprobar", reload, setMsg)}>Aprobar pago</button>}
                  {r.tiene_comprobante && <a className="btn ghost sm" href={`/api/admin/reservas/${r.id}/comprobante`} target="_blank" rel="noopener">Ver comprobante</a>}
                  {r.usado && <button className="btn ghost sm" onClick={() => accion(r.id, "desmarcar_ingreso", reload, setMsg)}>Quitar ingreso</button>}
                  {r.estado !== "anulada" && (conf === r.id
                    ? <button className="btn danger sm" onClick={() => { setConf(""); accion(r.id, "anular", reload, setMsg); }}>Confirmar anulación</button>
                    : <button className="btn danger sm" onClick={() => setConf(r.id)}>Anular</button>)}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Vender({ cfg, occ, reload }) {
  const etapas = cfg.etapas.filter((e) => e.activa);
  const [etapa, setEtapa] = useState(etapas[0]?.id || "");
  const [form, setForm] = useState({ nombre: "", telefono: "", cantidad: 1, pago: "Efectivo", vendedor: "Natalia", ingresa: false });
  const [msg, setMsg] = useState({ t: "", k: "" });
  const [last, setLast] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const sel = etapas.find((e) => e.id === etapa);

  async function submit(e) {
    e.preventDefault();
    setMsg({ t: "Registrando…", k: "" });
    try {
      const r = await api("/api/admin/venta", { ...form, etapa });
      setLast({ ...r, nombre: form.nombre, telefono: form.telefono.replace(/\D/g, "") });
      setMsg({ t: `Boleta ${r.id} registrada.`, k: "ok" });
      setForm({ ...form, nombre: "", telefono: "", cantidad: 1, ingresa: false });
      reload();
    } catch (err) { setMsg({ t: err.message, k: "err" }); }
  }
  const link = last ? `${typeof location !== "undefined" ? location.origin : ""}/r/${last.id}?k=${last.token}` : "";

  return (
    <section className="stack" style={{ maxWidth: 560 }}>
      <p className="small muted">Para ventas en persona o en taquilla. La boleta queda aprobada de una vez.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="stack">
          {etapas.map((e) => {
            const quedan = e.tope == null ? null : e.tope - (occ[e.id] || 0);
            return (
              <label key={e.id} className="stage">
                <input type="radio" name="vetapa" id={"v-" + e.id} checked={etapa === e.id} onChange={() => setEtapa(e.id)} />
                <span className="n">{e.nombre}<small>{e.tipo}{quedan != null ? ` · quedan ${Math.max(0, quedan)}` : ""}</small></span>
                <span className="p">{cop(e.precio)}</span>
              </label>
            );
          })}
        </div>
        <label className="f">Nombre<input id="v-nombre" value={form.nombre} onChange={set("nombre")} /></label>
        <div className="grid2">
          <label className="f">Celular (opcional)<input id="v-tel" value={form.telefono} onChange={set("telefono")} inputMode="tel" /></label>
          <label className="f">Cantidad<input id="v-cant" type="number" min="1" max="20" value={form.cantidad} onChange={set("cantidad")} /></label>
        </div>
        <div className="grid2">
          <label className="f">Pago<select id="v-pago" value={form.pago} onChange={set("pago")}>{["Efectivo", "Bre-B", "Nequi", "Daviplata", "Transferencia", "Cortesía"].map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="f">Vendió<select id="v-vend" value={form.vendedor} onChange={set("vendedor")}>{VENDEDORES.map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
        <label className="check"><input id="v-ing" type="checkbox" checked={form.ingresa} onChange={set("ingresa")} /> Entra ya (venta en la puerta)</label>
        <div className="pay"><span className="k">Total</span><span className="v">{cop((sel?.precio || 0) * (Number(form.cantidad) || 0))}</span></div>
        <button className="btn block">Registrar venta</button>
        <p className={"msg " + msg.k}>{msg.t}</p>
      </form>
      {last && !form.ingresa && (
        <div className="card">
          <p>Boleta <span className="cd">{last.id}</span> para {last.nombre}</p>
          <div className="btns">
            {last.telefono && <a className="btn sm" target="_blank" rel="noopener" href={`https://wa.me/57${last.telefono}?text=${encodeURIComponent(`¡Hola ${last.nombre.split(" ")[0]}! Esta es tu boleta para Solé en GetBack, Duitama — sábado 24 de octubre. Tu QR: ${link}`)}`}>Enviar QR por WhatsApp</a>}
            <button className="btn ghost sm" onClick={async () => { try { await navigator.clipboard.writeText(link); setMsg({ t: "Enlace copiado.", k: "ok" }); } catch { setMsg({ t: link, k: "" }); } }}>Copiar enlace del QR</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Resumen({ items, cfg, occ }) {
  const ok = items.filter((r) => r.estado === "aprobada");
  const personas = ok.reduce((s, r) => s + r.cantidad, 0);
  const dentro = ok.filter((r) => r.usado).reduce((s, r) => s + r.cantidad, 0);
  const plata = ok.reduce((s, r) => s + r.total, 0);
  const revision = items.filter((r) => r.estado === "en_revision").reduce((s, r) => s + r.total, 0);
  const grp = (key) => { const m = {}; ok.forEach((r) => { const k = key(r); m[k] = m[k] || { n: 0, v: 0 }; m[k].n += r.cantidad; m[k].v += r.total; }); return Object.entries(m).sort((a, b) => b[1].v - a[1].v); };
  return (
    <section className="stack">
      <div className="stats">
        <div className="stat"><div className="k">Boletas confirmadas</div><div className="v">{personas}</div></div>
        <div className="stat"><div className="k">Recaudo confirmado</div><div className="v">{cop(plata)}</div></div>
        <div className="stat"><div className="k">En revisión</div><div className="v">{cop(revision)}</div></div>
        <div className="stat"><div className="k">Han ingresado</div><div className="v">{dentro} <span className="small muted">/ {personas}</span></div>
          <div className="bar"><i style={{ width: `${personas ? Math.round((dentro / personas) * 100) : 0}%` }} /></div></div>
      </div>
      <div className="tbl"><table>
        <thead><tr><th>Etapa</th><th className="r">Precio</th><th className="r">Confirmadas</th><th className="r">Ocupan cupo</th><th className="r">Tope</th><th className="r">Recaudo</th></tr></thead>
        <tbody>{cfg.etapas.map((e) => {
          const c = ok.filter((r) => r.etapa === e.id);
          return <tr key={e.id}><td>{e.nombre} · {e.tipo}</td><td className="r">{cop(e.precio)}</td><td className="r">{c.reduce((s, r) => s + r.cantidad, 0)}</td><td className="r">{occ[e.id] || 0}</td><td className="r">{e.tope ?? "—"}</td><td className="r">{cop(c.reduce((s, r) => s + r.total, 0))}</td></tr>;
        })}</tbody>
      </table></div>
      <div className="grid2">
        <div className="tbl"><table><thead><tr><th>Medio</th><th className="r">Boletas</th><th className="r">Recaudo</th></tr></thead>
          <tbody>{grp((r) => (r.canal === "web" ? "Web (Bre-B)" : r.pago || "—")).map(([k, v]) => <tr key={k}><td>{k}</td><td className="r">{v.n}</td><td className="r">{cop(v.v)}</td></tr>)}</tbody></table></div>
        <div className="tbl"><table><thead><tr><th>Vendió</th><th className="r">Boletas</th><th className="r">Recaudo</th></tr></thead>
          <tbody>{grp((r) => (r.canal === "web" ? "Página web" : r.vendedor || "—")).map(([k, v]) => <tr key={k}><td>{k}</td><td className="r">{v.n}</td><td className="r">{cop(v.v)}</td></tr>)}</tbody></table></div>
      </div>
      <button className="btn ghost sm" style={{ justifySelf: "start" }} onClick={() => {
        const head = ["codigo", "nombre", "telefono", "etapa", "cantidad", "total", "estado", "canal", "pago", "vendedor", "creado", "ingreso"];
        const lines = items.map((r) => [r.id, r.nombre, r.telefono, r.etapa, r.cantidad, r.total, r.estado, r.canal, r.pago, r.vendedor, r.creado, r.usado_en].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
        const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ventas-sole-getback.csv"; a.click();
      }}>Descargar ventas (Excel/CSV)</button>
    </section>
  );
}

function Ajustes({ cfg, reload }) {
  const [c, setC] = useState(cfg);
  const [msg, setMsg] = useState({ t: "", k: "" });
  const setE = (id, k, v) => setC({ ...c, etapas: c.etapas.map((e) => (e.id === id ? { ...e, [k]: v } : e)) });
  async function save(e) {
    e.preventDefault();
    try { await api("/api/admin/config", c); setMsg({ t: "Ajustes guardados.", k: "ok" }); reload(); }
    catch (err) { setMsg({ t: err.message, k: "err" }); }
  }
  return (
    <form className="stack" onSubmit={save} style={{ maxWidth: 640 }}>
      <label className="check"><input id="a-abierta" type="checkbox" checked={c.ventasAbiertas} onChange={(e) => setC({ ...c, ventasAbiertas: e.target.checked })} /> Venta en línea abierta</label>
      <div className="grid2">
        <label className="f">Llave Bre-B<input id="a-llave" value={c.llave} onChange={(e) => setC({ ...c, llave: e.target.value })} /></label>
        <label className="f">A nombre de<input id="a-titular" value={c.titular} onChange={(e) => setC({ ...c, titular: e.target.value })} placeholder="Nombre que ve el comprador" /></label>
      </div>
      <div className="grid2">
        <label className="f">WhatsApp de ayuda (10 dígitos)<input id="a-wa" value={c.whatsapp} onChange={(e) => setC({ ...c, whatsapp: e.target.value })} inputMode="tel" /></label>
        <label className="f">Minutos para pagar una reserva<input id="a-min" type="number" min="15" max="1440" value={c.minutosReserva} onChange={(e) => setC({ ...c, minutosReserva: e.target.value })} /></label>
      </div>
      <h2>Etapas</h2>
      {c.etapas.map((e) => (
        <fieldset key={e.id} className="card" style={{ margin: 0 }}>
          <legend className="eyebrow">{e.nombre} · {e.tipo}</legend>
          <div className="grid2">
            <label className="f">Precio (COP)<input id={"a-p-" + e.id} type="number" min="0" step="1000" value={e.precio} onChange={(x) => setE(e.id, "precio", x.target.value)} /></label>
            <label className="f">Tope (vacío = sin tope)<input id={"a-t-" + e.id} type="number" min="0" value={e.tope ?? ""} onChange={(x) => setE(e.id, "tope", x.target.value)} /></label>
          </div>
          <label className="f">Texto corto<input id={"a-n-" + e.id} value={e.nota || ""} onChange={(x) => setE(e.id, "nota", x.target.value)} /></label>
          <div className="row">
            <label className="check"><input id={"a-a-" + e.id} type="checkbox" checked={e.activa} onChange={(x) => setE(e.id, "activa", x.target.checked)} /> Activa</label>
            <label className="check"><input id={"a-w-" + e.id} type="checkbox" checked={e.web} onChange={(x) => setE(e.id, "web", x.target.checked)} /> Se vende en la web</label>
          </div>
        </fieldset>
      ))}
      <button className="btn">Guardar ajustes</button>
      <p className={"msg " + msg.k}>{msg.t}</p>
    </form>
  );
}
