"use client";

import { usePathname } from "next/navigation";

/** Atendimento da Biscoitê no WhatsApp (link de mensagem da conta business). */
const LINK_WHATSAPP = "https://wa.me/message/IEZSJHWRQ6ESB1";

/**
 * Botão flutuante do WhatsApp, no canto inferior direito de todas as páginas
 * — menos no /admin, que é interno. Respeita a área segura do iPhone (barra
 * de gestos) e fica acima da chuva de biscoitos.
 */
export default function WhatsAppFlutuante() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <a
      href={LINK_WHATSAPP}
      target="_blank"
      rel="noopener"
      aria-label="Fale com a Biscoitê pelo WhatsApp"
      title="Fale com a gente pelo WhatsApp"
      className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFFFF]"
      style={{
        backgroundColor: "#25D366",
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true" fill="#FFFFFF">
        <path d="M16.004 3.2C8.94 3.2 3.2 8.94 3.2 16c0 2.26.6 4.47 1.73 6.41L3.2 28.8l6.57-1.72A12.77 12.77 0 0 0 16 28.8c7.06 0 12.8-5.74 12.8-12.8S23.07 3.2 16.004 3.2Zm0 23.4c-1.93 0-3.82-.52-5.47-1.5l-.39-.23-3.9 1.02 1.04-3.8-.25-.4A10.56 10.56 0 0 1 5.4 16c0-5.85 4.76-10.6 10.6-10.6 5.85 0 10.6 4.75 10.6 10.6 0 5.85-4.75 10.6-10.6 10.6Zm5.81-7.94c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
