import Headline from "./Headline";
import { campaign, formatDate } from "@/lib/campaign";

/**
 * Documentos obrigatórios da campanha.
 *
 * O briefing lista quatro itens: Regulamento, Política de Privacidade, Termos
 * de Uso e o Certificado de Autorização da SPA. Os três primeiros são páginas
 * próprias (rotas indexáveis e linkáveis, como o protocolo espera). O quarto
 * é um PDF emitido pelo Ministério da Fazenda — e enquanto ele não existe, o
 * card mostra "aguardando emissão" em vez de um link quebrado.
 *
 * A decisão de deixar o estado pendente visível é intencional: quem revisar
 * a página antes do protocolo precisa ver o que falta.
 */

const docs = [
  {
    titulo: "Regulamento",
    descricao:
      "O documento completo: quem pode participar, como acumular números, os prêmios, a data da apuração e as regras de entrega.",
    href: campaign.documentos.regulamento,
  },
  {
    titulo: "Política de Privacidade",
    descricao:
      "Quais dados são coletados, com que base legal, por quanto tempo ficam guardados e como exercer seus direitos sob a LGPD.",
    href: campaign.documentos.privacidade,
  },
  {
    titulo: "Termos de Uso",
    descricao:
      "As condições de uso desta plataforma: responsabilidades, conduta vedada e limites de uso do cadastro.",
    href: campaign.documentos.termos,
  },
];

export default function LegalDocs() {
  return (
    <section id="legal" className="secao-clara bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="eyebrow">Documentos oficiais</p>
        <Headline
          lead="Tudo que rege esta promoção,"
          emphasis="aberto para leitura."
          className="mt-4 max-w-2xl text-3xl sm:text-4xl"
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {docs.map((doc) => (
            <a
              key={doc.titulo}
              href={doc.href}
              className="group bg-white p-7 transition-colors hover:bg-sky/25"
            >
              <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-headline">
                {doc.titulo}
                <span
                  aria-hidden="true"
                  className="text-steel transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                {doc.descricao}
              </p>
            </a>
          ))}
        </div>

        {/* Certificado de Autorização — exibição obrigatória após a emissão. */}
        <div className="mt-6 rounded-2xl border border-line bg-paper p-7 sm:p-9">
          <p className="text-[11px] font-black uppercase tracking-label text-steel">
            Certificado de Autorização · {campaign.legal.orgao}
          </p>
          <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-ink/70">
            Acesse o documento anexo para consultar os detalhes da
            certificação da promoção.
          </p>

          <dl className="mt-8 grid gap-6 border-t border-line pt-7 sm:grid-cols-4">
            <Item term="Período de participação" value={periodo()} />
            <Item term="Apuração" value="Mensal, 11 sorteios" />
            <Item term="Base do sorteio" value="Extração da Loteria Federal" />
            <Item term="Legislação" value={`${campaign.legal.lei} · ${campaign.legal.decreto}`} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function periodo(): string {
  const { inicio, fim } = campaign.vigencia;
  return `${formatDate(inicio)} a ${formatDate(fim)}`;
}

function Item({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-label text-steel">
        {term}
      </dt>
      <dd className="mt-1.5 text-sm font-medium leading-snug text-ink/80">{value}</dd>
    </div>
  );
}
