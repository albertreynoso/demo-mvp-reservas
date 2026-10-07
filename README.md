# Turnero — MVP de reservas online para negocios

Demo de portafolio de un **MVP hecho en 2 semanas**: cada negocio tiene su página de reservas (servicios, precios y horarios libres en tiempo real) y un panel para el dueño (agenda del día, confirmar o cancelar, ingresos estimados).

> **EN:** Booking MVP for small businesses. Public booking page with live availability, owner dashboard, double-booking prevented at the database level (Postgres exclusion constraint), row-level security. Next.js 16 (App Router) + Supabase + Tailwind, deployable on Vercel.

## Qué muestra

- `/` — presentación del producto.
- `/b/barberia-don-lucho` — página pública: el cliente elige servicio → día → hora → deja nombre y celular. Solo ve horarios donde **entra la duración completa** del servicio.
- `/panel` — login del dueño, agenda por día, cambio de estado (pendiente, confirmada, atendida, cancelada), ingresos del día y link de WhatsApp a cada cliente.

## Decisiones técnicas

- **Sin choques de horario:** la restricción `reservas_sin_choque` (Postgres `exclude using gist`) impide que dos reservas activas se pisen, aunque lleguen al mismo segundo. La página solo ofrece huecos libres, y si alguien gana la carrera, el cliente ve "ese horario acaba de ocuparse".
- **Datos de clientes protegidos:** con RLS, el público solo lee negocios y servicios. Las reservas se crean con la función `reservar()` y los horarios ocupados se leen con `horarios_ocupados()`, que no devuelve nombres ni teléfonos. Solo el dueño ve sus reservas.
- **Zona horaria:** offset fijo por negocio (`-05:00` para Perú, sin horario de verano).

## Probarlo

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor** pega y ejecuta `supabase/schema.sql` (crea tablas, permisos, funciones y la barbería de ejemplo).
3. Copia `.env.example` a `.env.local` y completa la URL y la publishable key (**Project Settings → API**).
4. `npm install` y `npm run dev` → http://localhost:3000.
5. Entra a `/panel`, crea una cuenta y asígnate la barbería con el SQL que te muestra el panel.
6. Reserva desde `/b/barberia-don-lucho` y mírala aparecer en el panel.

Para la demo pública conviene desactivar la confirmación de email (**Authentication → Providers → Email**) o usar una cuenta de prueba.

## Desplegar en Vercel

1. Sube el repo a GitHub (`.env.local` no se sube).
2. En [vercel.com](https://vercel.com) → **Add New → Project**, importa el repo y carga las 2 variables de entorno.
3. Deploy. La URL pública es el link para el portafolio.

## Cómo se extiende (lo que se cotiza aparte)

| Extra | Cómo |
|---|---|
| Seña con Mercado Pago o Stripe | Checkout al confirmar; la reserva queda "pendiente" hasta el webhook de pago |
| Recordatorios por WhatsApp | Tarea programada que envía la plantilla 24 h antes |
| Varios profesionales | Tabla `profesionales` y la restricción de choque por profesional |
| App móvil | Flutter o React Native contra el mismo Supabase |
