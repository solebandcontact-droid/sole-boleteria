import { Grenze_Gotisch, Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Grenze_Gotisch({ subsets: ["latin"], weight: ["600"], variable: "--f-display" });
const label = Oswald({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-label" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--f-mono" });

export const metadata = {
  title: "Solé en vivo · GetBack Duitama · 24 de octubre",
  description: "Boletas para Solé en GetBack, Duitama. Sábado 24 de octubre. Open act: Bloke.",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#140b0b" };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${label.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
