import { notFound } from "next/navigation";
import Reservar from "@/components/Reservar";
import { supabase, type Negocio, type Servicio } from "@/lib/supabase";

async function cargar(slug: string): Promise<{ negocio: Negocio; servicios: Servicio[] } | null> {
  const { data: negocio, error } = await supabase.from("negocios").select("*").eq("slug", slug).maybeSingle<Negocio>();
  if (error) throw new Error(`No se pudo cargar el negocio: ${error.message}`);
  if (!negocio) return null;
  const { data: servicios, error: errServicios } = await supabase
    .from("servicios").select("*").eq("negocio_id", negocio.id).eq("activo", true).order("orden").returns<Servicio[]>();
  if (errServicios) throw new Error(`No se pudieron cargar los servicios: ${errServicios.message}`);
  return { negocio, servicios: servicios ?? [] };
}

export async function generateMetadata(props: PageProps<"/b/[slug]">) {
  const datos = await cargar((await props.params).slug);
  return { title: datos ? `Reservar · ${datos.negocio.nombre}` : "Negocio no encontrado" };
}

export default async function PaginaNegocio(props: PageProps<"/b/[slug]">) {
  const datos = await cargar((await props.params).slug);
  if (!datos) notFound();
  const { negocio, servicios } = datos;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold">{negocio.nombre}</h1>
        <p className="text-ink-2">{negocio.descripcion}</p>
        <p className="text-sm text-ink-2">{negocio.direccion}</p>
      </header>
      <Reservar negocio={negocio} servicios={servicios} />
    </main>
  );
}
