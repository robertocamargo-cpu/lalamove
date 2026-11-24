import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lalamove Express — Expedição & Cotação Inteligente',
  description: 'Sistema Inteligente de Cotação e Gestão de Entregas Expressas integrado à API v3 da Lalamove',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0f1117] text-gray-100 min-h-screen antialiased selection:bg-[#F26522] selection:text-white">
        {children}
      </body>
    </html>
  );
}

