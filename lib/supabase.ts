import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_KEY; // publishable (o anon) key: es pública por diseño, la seguridad la da RLS

if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_KEY en .env.local");

export const supabase = createClient(url, clave);

export type Turnos = Record<string, [string, string][]>; // día de la semana (0 = domingo) → [["09:00","13:00"], ...]

export interface Negocio {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  whatsapp: string;
  horario: Turnos;
  utc_offset: string;
  owner_id: string | null;
}

export interface Servicio {
  id: string;
  negocio_id: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: boolean;
}

export type EstadoReserva = "pendiente" | "confirmada" | "cancelada" | "atendida";

export interface Reserva {
  id: string;
  servicio_id: string;
  inicio: string;
  fin: string;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: EstadoReserva;
}
