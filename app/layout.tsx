import type { Metadata } from "next";
import { Hanken_Grotesk, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const cuerpo = Hanken_Grotesk({ variable: "--font-cuerpo", subsets: ["latin"] });
const titulo = Schibsted_Grotesk({ variable: "--font-titulo", subsets: ["latin"], weight: ["600", "800"] });

export const metadata: Metadata = {
  title: "Turnero · reservas online",
  description: "Demo de MVP: reservas online para negocios con panel del dueño. Next.js + Supabase.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${cuerpo.variable} ${titulo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
