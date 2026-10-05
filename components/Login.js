"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login({ onOk, titulo }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try { await api("/api/admin/login", { password: pw }); onOk(); }
    catch (err) { setMsg(err.message); }
    setBusy(false);
  }
  return (
    <main className="wrap">
      <header className="hero"><p className="eyebrow">Equipo Solé</p><h1 className="brand">Solé</h1><h2>{titulo}</h2></header>
      <form className="stack" onSubmit={submit}>
        <label className="f">Contraseña del equipo
          <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus />
        </label>
        <button className="btn block" disabled={busy || !pw}>Entrar</button>
        <p className="msg err" role="status">{msg}</p>
      </form>
    </main>
  );
}
