"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { etiquetaDia, horaDelNegocio, proximosDias, soles } from "@/lib/horarios";
import { supabase, type EstadoReserva, type Negocio, type Reserva, type Servicio } from "@/lib/supabase";

const ESTILO_ESTADO: Record<EstadoReserva, string> = {
  pendiente: "text-warn border-warn",
  confirmada: "text-ok border-ok",
  atendida: "text-ink-2 border-line",
  cancelada: "text-bad border-bad line-through",
};

function useSesion(): Session | null | undefined {
  const [sesion, setSesion] = useState<Session | null>();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);
  return sesion;
}

function Login() {
  const [modo, setModo] = useState<"entrar" | "registrar">("entrar");
  const [error, setError] = useState<string | null>(null);
  async function enviar(form: FormData) {
    const credenciales = { email: String(form.get("email")), password: String(form.get("password")) };
    const { error } = modo === "entrar" ? await supabase.auth.signInWithPassword(credenciales) : await supabase.auth.signUp(credenciales);
    setError(error?.message ?? (modo === "registrar" ? "Cuenta creada. Si tu proyecto pide confirmar el email, revisa tu correo." : null));
  }
  return (
    <form action={enviar} className="mx-auto grid w-full max-w-sm gap-3 rounded-2xl border border-line bg-surface p-6">
      <h1 className="font-display text-2xl font-extrabold">{modo === "entrar" ? "Entrar al panel" : "Crear cuenta"}</h1>
      <input id="email" name="email" type="email" required placeholder="tu@email.com" className="rounded-xl border border-line bg-bg px-4 py-3" />
      <input id="password" name="password" type="password" required minLength={8} placeholder="Contraseña (8+ caracteres)" className="rounded-xl border border-line bg-bg px-4 py-3" />
      {error && <p className="text-sm text-ink-2">{error}</p>}
      <button type="submit" className="rounded-full bg-accent text-accent-ink px-5 py-3 font-semibold">{modo === "entrar" ? "Entrar" : "Crear cuenta"}</button>
      <button type="button" className="text-sm text-accent" onClick={() => setModo(modo === "entrar" ? "registrar" : "entrar")}>
        {modo === "entrar" ? "¿No tienes cuenta? Créala" : "Ya tengo cuenta"}
      </button>
    </form>
  );
}

function SinNegocio({ userId }: { userId: string }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-xl font-extrabold">Tu cuenta aún no tiene un negocio</h2>
      <p className="text-ink-2">Para la demo, asígnate la barbería de ejemplo desde Supabase → SQL Editor:</p>
      <pre className="overflow-x-auto rounded-xl bg-bg p-4 text-sm">{`update public.negocios set owner_id = '${userId}'\nwhere slug = 'barberia-don-lucho';`}</pre>
    </section>
  );
}

function useDatosDelDia(negocio: Negocio | null, dia: string) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recargar = useCallback(async () => {
    if (!negocio) return;
    const siguiente = new Date(Date.parse(`${dia}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase.from("reservas").select("*").eq("negocio_id", negocio.id)
      .gte("inicio", `${dia}T00:00:00${negocio.utc_offset}`).lt("inicio", `${siguiente}T00:00:00${negocio.utc_offset}`).order("inicio");
    setError(error?.message ?? null);
    setReservas((data as Reserva[]) ?? []);
  }, [negocio, dia]);
  useEffect(() => void recargar(), [recargar]);
  return { reservas, error, recargar };
}

function Fila({ reserva, servicio, offset, cambiar }: { reserva: Reserva; servicio?: Servicio; offset: string; cambiar: (estado: EstadoReserva) => void }) {
  const acciones: [EstadoReserva, string][] = [["confirmada", "Confirmar"], ["atendida", "Atendida"], ["cancelada", "Cancelar"]];
  return (
    <li className="grid gap-2 border-t border-line py-4 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center">
      <span className="font-display text-lg font-semibold tabular">{horaDelNegocio(reserva.inicio, offset)}</span>
      <div className="min-w-0">
        <p className="font-medium">{reserva.cliente_nombre} <span className={`ml-1 rounded-full border px-2 py-0.5 text-xs ${ESTILO_ESTADO[reserva.estado]}`}>{reserva.estado}</span></p>
        <p className="text-sm text-ink-2">{servicio?.nombre ?? "Servicio"} · <a className="text-accent" href={`https://wa.me/${reserva.cliente_telefono.replace(/\D/g, "")}`}>{reserva.cliente_telefono}</a></p>
      </div>
      <div className="flex flex-wrap gap-2">
        {acciones.filter(([estado]) => estado !== reserva.estado).map(([estado, texto]) => (
          <button key={estado} type="button" onClick={() => cambiar(estado)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-accent">{texto}</button>
        ))}
      </div>
    </li>
  );
}

function Tablero({ userId }: { userId: string }) {
  const [negocio, setNegocio] = useState<Negocio | null | undefined>();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const dias = useMemo(() => proximosDias(new Date(), "-05:00", 14), []);
  const [dia, setDia] = useState(dias[0]);
  const { reservas, error, recargar } = useDatosDelDia(negocio ?? null, dia);

  useEffect(() => {
    supabase.from("negocios").select("*").eq("owner_id", userId).maybeSingle<Negocio>().then(async ({ data }) => {
      setNegocio(data);
      if (data) setServicios(((await supabase.from("servicios").select("*").eq("negocio_id", data.id)).data as Servicio[]) ?? []);
    });
  }, [userId]);

  if (negocio === undefined) return <p className="text-ink-2">Cargando…</p>;
  if (!negocio) return <SinNegocio userId={userId} />;
  const porId = new Map(servicios.map((s) => [s.id, s]));
  const activas = reservas.filter((r) => r.estado !== "cancelada");
  const ingresos = activas.reduce((total, r) => total + (porId.get(r.servicio_id)?.precio ?? 0), 0);
  async function cambiar(id: string, estado: EstadoReserva) {
    const { error } = await supabase.from("reservas").update({ estado }).eq("id", id);
    if (error) alert(`No se pudo actualizar: ${error.message}`);
    await recargar();
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-ink-2">Panel de</p><h1 className="font-display text-3xl font-extrabold">{negocio.nombre}</h1></div>
        <dl className="flex gap-8 tabular">
          <div><dt className="text-sm text-ink-2">Reservas</dt><dd className="font-display text-2xl font-extrabold">{activas.length}</dd></div>
          <div><dt className="text-sm text-ink-2">Ingresos estimados</dt><dd className="font-display text-2xl font-extrabold">{soles(ingresos)}</dd></div>
        </dl>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dias.map((d) => <button key={d} type="button" onClick={() => setDia(d)} className={`shrink-0 rounded-full border px-4 py-2 text-sm capitalize ${d === dia ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface"}`}>{etiquetaDia(d)}</button>)}
      </div>
      {error && <p className="text-bad">{error}</p>}
      {reservas.length ? (
        <ul>{reservas.map((r) => <Fila key={r.id} reserva={r} servicio={porId.get(r.servicio_id)} offset={negocio.utc_offset} cambiar={(estado) => cambiar(r.id, estado)} />)}</ul>
      ) : <p className="text-ink-2 border-t border-line pt-4">Sin reservas este día. Comparte tu link: /b/{negocio.slug}</p>}
    </div>
  );
}

export default function Panel() {
  const sesion = useSesion();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 grid gap-6">
      {sesion === undefined && <p className="text-ink-2">Cargando…</p>}
      {sesion === null && <Login />}
      {sesion && (
        <>
          <Tablero userId={sesion.user.id} />
          <button type="button" className="justify-self-start text-sm text-ink-2 underline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </>
      )}
    </main>
  );
}
