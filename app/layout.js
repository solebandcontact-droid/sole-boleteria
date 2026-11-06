import { Cormorant_Garamond, Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500"], style: ["normal", "italic"], variable: "--f-serif" });
const label = Oswald({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--f-label" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--f-mono" });

export const metadata = {
  title: "Solé + Insomónica · Chatica Linda, Tunja · 28 de noviembre",
  description: "Boletas para el último concierto del año de Solé, junto a Insomónica. Sábado 28 de noviembre, 8:00 p. m., Chatica Linda, Tunja. Preventa $20.000.",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f1218" };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${serif.variable} ${label.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
