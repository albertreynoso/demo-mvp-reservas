"use client";

import { useEffect, useMemo, useState } from "react";
import { etiquetaDia, huecosLibres, proximosDias, soles, type Hueco } from "@/lib/horarios";
import { supabase, type Negocio, type Servicio } from "@/lib/supabase";

type Ocupado = { inicio: string; fin: string };
type Carga = { ocupados: Ocupado[]; error: string | null; cargando: boolean };

const chip = (activo: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-medium tabular ${activo ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"}`;

/** Horarios ocupados del día elegido; se recarga al cambiar de día o tras una reserva. */
function useOcupados(negocio: Negocio, dia: string, version: number): Carga {
  const [carga, setCarga] = useState<Carga>({ ocupados: [], error: null, cargando: true });
  useEffect(() => {
    let vigente = true;
    const siguiente = new Date(Date.parse(`${dia}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    setCarga((c) => ({ ...c, cargando: true }));
    supabase.rpc("horarios_ocupados", { p_negocio: negocio.id, p_desde: `${dia}T00:00:00${negocio.utc_offset}`, p_hasta: `${siguiente}T00:00:00${negocio.utc_offset}` })
      .then(({ data, error }) => vigente && setCarga({ ocupados: (data as Ocupado[]) ?? [], error: error?.message ?? null, cargando: false }));
    return () => void (vigente = false);
  }, [negocio, dia, version]);
  return carga;
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display font-semibold text-lg"><span className="text-ink-2 tabular">{numero}.</span> {titulo}</h2>
      {children}
    </section>
  );
}

function ListaServicios({ servicios, elegido, elegir }: { servicios: Servicio[]; elegido?: Servicio; elegir: (s: Servicio) => void }) {
  return (
    <div className="grid gap-2">
      {servicios.map((s) => (
        <button key={s.id} type="button" onClick={() => elegir(s)} aria-pressed={elegido?.id === s.id}
          className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left bg-surface ${elegido?.id === s.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-accent"}`}>
          <span><span className="font-medium">{s.nombre}</span><span className="block text-sm text-ink-2 tabular">{s.duracion_min} min</span></span>
          <span className="font-semibold tabular">{soles(s.precio)}</span>
        </button>
      ))}
    </div>
  );
}

function Horas({ carga, huecos, elegido, elegir }: { carga: Carga; huecos: Hueco[]; elegido?: Hueco; elegir: (h: Hueco) => void }) {
  if (carga.error) return <p className="text-bad">No pudimos cargar los horarios: {carga.error}</p>;
  if (carga.cargando) return <p className="text-ink-2">Cargando horarios…</p>;
  if (!huecos.length) return <p className="text-ink-2">No quedan horarios este día. Prueba otro.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {huecos.map((h) => <button key={h.inicio} type="button" className={chip(elegido?.inicio === h.inicio)} onClick={() => elegir(h)}>{h.hora}</button>)}
    </div>
  );
}

function Confirmada({ negocio, servicio, dia, hueco, otra }: { negocio: Negocio; servicio: Servicio; dia: string; hueco: Hueco; otra: () => void }) {
  const aviso = encodeURIComponent(`Hola, reservé ${servicio.nombre} el ${etiquetaDia(dia)} a las ${hueco.hora}.`);
  return (
    <section className="grid gap-4 rounded-2xl border border-line bg-surface p-6">
      <p className="text-sm font-semibold text-ok">✓ Reserva registrada</p>
      <h2 className="font-display text-2xl font-extrabold">{servicio.nombre} · {etiquetaDia(dia)} · {hueco.hora}</h2>
      <p className="text-ink-2">{negocio.nombre} te espera en {negocio.direccion}. Si no puedes venir, avisa con tiempo.</p>
      <div className="flex flex-wrap gap-3">
        {negocio.whatsapp && <a className="rounded-full bg-accent text-accent-ink px-5 py-2.5 font-semibold" href={`https://wa.me/${negocio.whatsapp}?text=${aviso}`}>Avisar por WhatsApp</a>}
        <button type="button" className="rounded-full border border-line px-5 py-2.5 font-semibold" onClick={otra}>Hacer otra reserva</button>
      </div>
    </section>
  );
}

function Formulario({ enviar, enviando, error }: { enviar: (nombre: string, telefono: string) => void; enviando: boolean; error: string | null }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); enviar(nombre, telefono); }}>
      <label className="grid gap-1 text-sm font-medium">Nombre
        <input id="nombre" required minLength={2} maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} className="rounded-xl border border-line bg-surface px-4 py-3 text-base font-normal" />
      </label>
      <label className="grid gap-1 text-sm font-medium">Celular
        <input id="telefono" required inputMode="tel" pattern="[0-9 +()\-]{6,20}" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="987 654 321" className="rounded-xl border border-line bg-surface px-4 py-3 text-base font-normal" />
      </label>
      {error && <p className="text-bad text-sm">{error}</p>}
      <button type="submit" disabled={enviando} className="rounded-full bg-accent text-accent-ink px-5 py-3 font-semibold disabled:opacity-60">{enviando ? "Reservando…" : "Confirmar reserva"}</button>
    </form>
  );
}

export default function Reservar({ negocio, servicios }: { negocio: Negocio; servicios: Servicio[] }) {
  const [ahora] = useState(() => new Date());
  const dias = useMemo(() => proximosDias(ahora, negocio.utc_offset), [ahora, negocio.utc_offset]);
  const [servicio, setServicio] = useState<Servicio>();
  const [dia, setDia] = useState(dias[0]);
  const [hueco, setHueco] = useState<Hueco>();
  const [version, setVersion] = useState(0);
  const [envio, setEnvio] = useState<{ enviando: boolean; error: string | null; listo: boolean }>({ enviando: false, error: null, listo: false });
  const carga = useOcupados(negocio, dia, version);
  const huecos = servicio ? huecosLibres(dia, negocio.horario, servicio.duracion_min, carga.ocupados, new Date(), negocio.utc_offset) : [];

  async function enviar(nombre: string, telefono: string) {
    setEnvio({ enviando: true, error: null, listo: false });
    const { error } = await supabase.rpc("reservar", { p_servicio: servicio!.id, p_inicio: hueco!.inicio, p_nombre: nombre, p_telefono: telefono });
    setEnvio({ enviando: false, error: error ? error.message : null, listo: !error });
    if (error) { setHueco(undefined); setVersion((v) => v + 1); }
  }

  if (envio.listo && servicio && hueco) return <Confirmada negocio={negocio} servicio={servicio} dia={dia} hueco={hueco} otra={() => { setEnvio({ enviando: false, error: null, listo: false }); setHueco(undefined); setVersion((v) => v + 1); }} />;
  return (
    <div className="grid gap-8">
      <Paso numero={1} titulo="Elige el servicio"><ListaServicios servicios={servicios} elegido={servicio} elegir={(s) => { setServicio(s); setHueco(undefined); }} /></Paso>
      {servicio && <Paso numero={2} titulo="Elige el día">
        <div className="flex gap-2 overflow-x-auto pb-1">{dias.map((d) => <button key={d} type="button" className={`${chip(d === dia)} shrink-0 capitalize`} onClick={() => { setDia(d); setHueco(undefined); }}>{etiquetaDia(d)}</button>)}</div>
      </Paso>}
      {servicio && <Paso numero={3} titulo="Elige la hora">
        {envio.error && !hueco && <p className="text-bad text-sm">{envio.error}. Elige otro horario.</p>}
        <Horas carga={carga} huecos={huecos} elegido={hueco} elegir={setHueco} />
      </Paso>}
      {hueco && <Paso numero={4} titulo="Tus datos"><Formulario enviar={enviar} enviando={envio.enviando} error={envio.error} /></Paso>}
    </div>
  );
}
