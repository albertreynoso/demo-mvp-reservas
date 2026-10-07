import type { Turnos } from "./supabase";

export interface Hueco {
  hora: string; // HH:MM en la hora del negocio
  inicio: string; // ISO con offset, listo para guardar
}

const PASO_MIN = 15;

const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const offsetMin = (offset: string) => (offset.startsWith("-") ? -1 : 1) * minutos(offset.slice(1));

/** Fecha AAAA-MM-DD del negocio para un instante dado. */
export function diaDelNegocio(instante: Date, offset: string): string {
  return new Date(instante.getTime() + offsetMin(offset) * 60_000).toISOString().slice(0, 10);
}

/** Los próximos `cantidad` días del negocio, empezando hoy. */
export function proximosDias(ahora: Date, offset: string, cantidad = 14): string[] {
  return Array.from({ length: cantidad }, (_, i) => diaDelNegocio(new Date(ahora.getTime() + i * 86_400_000), offset));
}

/** Huecos donde entra un servicio de `duracion` minutos: dentro del horario, en el futuro y sin pisar reservas. */
export function huecosLibres(dia: string, horario: Turnos, duracion: number, ocupados: { inicio: string; fin: string }[], ahora: Date, offset: string): Hueco[] {
  const turnos = horario[String(new Date(`${dia}T12:00:00Z`).getUTCDay())] ?? [];
  const tomados = ocupados.map((o) => [Date.parse(o.inicio), Date.parse(o.fin)]);
  return turnos.flatMap(([abre, cierra]) => {
    const huecos: Hueco[] = [];
    for (let t = minutos(abre); t + duracion <= minutos(cierra); t += PASO_MIN) {
      const inicio = `${dia}T${hhmm(t)}:00${offset}`;
      const desde = Date.parse(inicio), hasta = desde + duracion * 60_000;
      if (desde > ahora.getTime() && !tomados.some(([a, b]) => desde < b && hasta > a)) huecos.push({ hora: hhmm(t), inicio });
    }
    return huecos;
  });
}

export function etiquetaDia(dia: string): string {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${dia}T12:00:00Z`));
}

export function horaDelNegocio(iso: string, offset: string): string {
  return hhmm(Math.round(((Date.parse(iso) / 60_000 + offsetMin(offset)) % 1440 + 1440) % 1440));
}

export const soles = (monto: number) => `S/ ${monto.toFixed(monto % 1 ? 2 : 0)}`;
