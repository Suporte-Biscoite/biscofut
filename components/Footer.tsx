import BrandLockup from "./BrandLockup";
import FutiWordmark from "./FutiWordmark";
import NeyNeyLogo from "./NeyNeyLogo";
import { campaign, legalFooterText } from "@/lib/campaign";

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      {/* Faixa azul fixa: o logo NeyNey tem letras brancas e o rodapé é claro
          no tema futi. */}
      <div className="flex justify-center px-6 py-10" style={{ backgroundColor: "#1F3160" }}>
        <NeyNeyLogo className="w-64 sm:w-80" />
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-10 border-b border-white/10 pb-12 md:flex-row md:items-start md:justify-between">
          <div>
            <BrandLockup tone="light" className="text-base" />
            <FutiWordmark tone="light" className="mt-6 h-7 w-auto" />
          </div>

          <nav className="grid gap-x-14 gap-y-8 sm:grid-cols-2" aria-label="Rodapé">
            <FooterColumn
              title="A promoção"
              links={[
                { href: "#premios", label: "Prêmios" },
                { href: "#como-participar", label: "Como participar" },
                { href: "#produtos", label: "Produtos participantes" },
                { href: "#faq", label: "Dúvidas frequentes" },
              ]}
            />
            <FooterColumn
              title="Documentos"
              links={[
                { href: campaign.documentos.regulamento, label: "Regulamento" },
                { href: campaign.documentos.privacidade, label: "Política de Privacidade" },
                { href: campaign.documentos.termos, label: "Termos de Uso" },
                { href: "#legal", label: "Certificado de Autorização" },
              ]}
            />
          </nav>
        </div>

        <div className="flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/55">
            Atendimento:{" "}
            <a
              href={`mailto:${campaign.contato.email}`}
              className="font-black text-white underline underline-offset-2"
            >
              {campaign.contato.email}
            </a>
          </p>
          <p className="text-white/40">
            © {new Date().getFullYear()} Biscoitê. Todos os direitos reservados.
          </p>
        </div>

        {/* Aviso legal — montado a partir de lib/campaign.ts, para não
            divergir do que foi protocolado. */}
        <p className="max-w-prose border-t border-white/10 pt-8 text-xs leading-relaxed text-white/45">
          {legalFooterText()}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-label text-sky">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
