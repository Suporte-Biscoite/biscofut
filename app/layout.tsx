import type { Metadata } from "next";

/* Substituto self-hosted da Noka enquanto a licença não chega — Medium (500),
   Bold (700) e Black (900) mapeiam 1:1 os pesos do board. Ver BRAND.md. */
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/900.css";
/* Fonte de UI do site da Biscoitê, aqui só como último fallback. */
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/700.css";

import "./globals.css";
import { TEMA } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Concorra a uma camiseta autografada pelo Neymar Jr. | Promoção Futi",
  description:
    "Compre produtos Futi informando seu CPF e concorra a uma das 22 camisetas autografadas pelo Neymar Jr. Promoção comercial Biscoitê sujeita a autorização da SPA/MF.",
  robots: {
    // A campanha não pode ser divulgada antes do CA — liberar na publicação.
    index: false,
    follow: false,
  },
  // Ícone servido estático de public/, sem passar pelo otimizador de imagem
  // do Next — a convenção app/icon.png tentou reprocessar o PNG e travou.
  // Quadrados: o "B" é mais alto que largo e, num PNG retangular, a aba do
  // navegador achatava o ícone. O do iOS tem fundo branco porque o sistema
  // pinta de preto o que for transparente.
  icons: {
    icon: [
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/apple-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={TEMA === "futi" ? "tema-futi" : undefined}>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-navy focus:px-5 focus:py-3 focus:text-sm focus:font-black focus:text-white"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
