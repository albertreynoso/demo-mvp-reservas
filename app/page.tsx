import Link from "next/link";

const FUNCIONES = [
  ["Página de reservas propia", "Cada negocio tiene su link: servicios, precios y horarios libres en tiempo real."],
  ["Sin choques de horario", "La base de datos impide que dos reservas se pisen, aunque lleguen al mismo segundo."],
  ["Panel del dueño", "Agenda del día, confirmar o cancelar en un toque e ingresos estimados."],
  ["Listo para crecer", "Pagos de seña, recordatorios por WhatsApp y app móvil sobre el mismo backend."],
];

export default function Inicio() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-14 sm:py-20 grid gap-12">
      <header className="grid gap-5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Demo de MVP · hecho en 2 semanas</span>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-[1.05] max-w-2xl">Reservas online para tu negocio, sin llamadas ni mensajes de ida y vuelta</h1>
        <p className="text-ink-2 text-lg max-w-2xl">Turnero es un MVP de agenda para barberías, consultorios y estudios: el cliente elige servicio y hora, el dueño ve su día ordenado.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/b/barberia-don-lucho" className="rounded-full bg-accent text-accent-ink px-5 py-3 font-semibold">Reservar en la barbería de ejemplo</Link>
          <Link href="/panel" className="rounded-full border border-line px-5 py-3 font-semibold">Ver el panel del dueño</Link>
        </div>
      </header>
      <section className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {FUNCIONES.map(([titulo, texto]) => (
          <div key={titulo} className="grid gap-1 border-t border-line pt-4">
            <h2 className="font-display font-semibold text-lg">{titulo}</h2>
            <p className="text-ink-2">{texto}</p>
          </div>
        ))}
      </section>
      <footer className="text-sm text-ink-2 border-t border-line pt-6">Next.js · Supabase (Postgres, Auth, RLS) · Tailwind · Vercel. Negocio de ejemplo ficticio.</footer>
    </main>
  );
}
