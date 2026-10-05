"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Login from "@/components/Login";
import { api, hora } from "@/lib/client";

export default function Puerta() {
  const [auth, setAuth] = useState(null);
  const [cam, setCam] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [code, setCode] = useState("");
  const [res, setRes] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const video = useRef(null);
  const stream = useRef(null);
  const busy = useRef(false);
  const lastScan = useRef({ v: "", t: 0 });

  async function stats() {
    try {
      const d = await api("/api/admin/reservas");
      const ok = d.reservas.filter((r) => r.estado === "aprobada");
      setCuenta({ total: ok.reduce((s, r) => s + r.cantidad, 0), dentro: ok.filter((r) => r.usado).reduce((s, r) => s + r.cantidad, 0) });
      setAuth(true);
    } catch (e) { if (e.status === 401) setAuth(false); }
  }
  useEffect(() => { stats(); }, []);
  useEffect(() => () => stop(), []);

  async function validar(raw) {
    if (busy.current) return;
    busy.current = true;
    setRes({ resultado: "cargando" });
    try {
      const r = await api("/api/puerta/validar", { codigo: raw });
      setRes(r);
      if (navigator.vibrate) navigator.vibrate(r.resultado === "ok" ? 80 : [60, 60, 60]);
      if (r.resultado === "ok") { setCode(""); stats(); }
    } catch (e) {
      if (e.status === 401) setAuth(false);
      setRes({ resultado: "invalida", mensaje: e.message });
    }
    busy.current = false;
  }

  async function start() {
    setCamErr("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setCam(true);
      requestAnimationFrame(() => {
        const v = video.current; if (!v) return;
        v.srcObject = stream.current; v.setAttribute("playsinline", "true"); v.play();
        loop();
      });
    } catch {
      setCamErr("No se pudo abrir la cámara. Revisa el permiso del navegador o escribe el código.");
    }
  }
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null; setCam(false);
  }
  function loop() {
    const v = video.current;
    if (!stream.current || !v) return;
    if (v.readyState >= 2) {
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
      const c = loop.c || (loop.c = document.createElement("canvas"));
      c.width = w; c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(v, 0, 0, w, h);
      const qr = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
      const now = Date.now();
      if (qr?.data && !busy.current && (qr.data !== lastScan.current.v || now - lastScan.current.t > 4000)) {
        lastScan.current = { v: qr.data, t: now };
        validar(qr.data);
      }
    }
    setTimeout(() => requestAnimationFrame(loop), 180);
  }

  if (auth === false) return <Login titulo="Puerta" onOk={stats} />;

  const R = res && res.resultado !== "cargando" ? res : null;
  return (
    <main className="wrap">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div><p className="eyebrow">Puerta · GetBack</p><h1 className="brand" style={{ fontSize: 44 }}>Solé</h1></div>
        {cuenta && <div className="stat" style={{ textAlign: "right" }}><div className="k">Adentro</div><div className="v">{cuenta.dentro}<span className="small muted"> / {cuenta.total}</span></div></div>}
      </header>

      {cam ? (
        <div className="stack">
          <div className="video"><video ref={video} muted playsInline /><div className="frame" /></div>
          <button className="btn ghost" onClick={stop}>Cerrar cámara</button>
        </div>
      ) : (
        <button className="btn block" onClick={start} style={{ padding: 22, fontSize: 18 }}>Escanear QR con la cámara</button>
      )}
      {camErr && <p className="msg err">{camErr}</p>}

      {res?.resultado === "cargando" && <div className="status wait"><div className="big">Validando…</div></div>}
      {R && R.resultado === "ok" && (
        <div className="status ok"><div className="big">{R.cantidad > 1 ? `Pasan ${R.cantidad}` : "Puede pasar"}</div>
          <p><b>{R.nombre}</b> · {R.etapa} · {R.id}</p></div>
      )}
      {R && R.resultado === "usada" && (
        <div className="status wait"><div className="big">Ya ingresó</div>
          <p><b>{R.nombre}</b> entró a las {hora(R.usadoEn)} · {R.id}</p></div>
      )}
      {R && R.resultado === "invalida" && (
        <div className="status bad"><div className="big">No pasa</div>
          <p>{R.mensaje}{R.nombre ? <> · <b>{R.nombre}</b></> : null}{R.id ? ` · ${R.id}` : ""}</p></div>
      )}

      <form className="row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) validar(code); }} style={{ flexWrap: "nowrap" }}>
        <input id="codigo" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código: S-7K3QZ" autoCapitalize="characters" autoComplete="off"
          style={{ fontFamily: "var(--mono)", fontSize: 20, letterSpacing: ".08em", textTransform: "uppercase" }} />
        <button className="btn">Validar</button>
      </form>
      <p className="foot"><a href="/equipo">Panel del equipo</a> · si alguien pagó pero sale "en revisión", apruébalo en el panel.</p>
    </main>
  );
}
