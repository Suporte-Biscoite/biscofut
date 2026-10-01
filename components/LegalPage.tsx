import Link from "next/link";
import type { ReactNode } from "react";
import BrandLockup from "./BrandLockup";
import FutiWordmark from "./FutiWordmark";
import { campaign, legalFooterText } from "@/lib/campaign";

/**
 * Moldura das páginas de documento legal.
 *
 * Três motivos para os documentos serem páginas de verdade em vez de modais
 * ou PDFs soltos: o protocolo na SPA pede URL própria para cada um; o
 * participante precisa poder linkar e voltar ao documento que aceitou; e
 * texto em HTML é legível no celular, o que PDF de duas colunas não é.
 */
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Voltar para a promoção">
            <BrandLockup className="text-sm" />
            <span className="hidden h-7 w-px bg-navy/20 sm:block" aria-hidden="true" />
            <FutiWordmark className="hidden h-5 w-auto text-navy sm:block" />
          </Link>
          <Link
            href="/"
            className="ml-auto text-[11px] font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="eyebrow">{campaign.nome}</p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-headline sm:text-4xl">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/75">{intro}</p>

        <div className="legal-body mt-12">{children}</div>

        <p className="mt-16 border-t border-line pt-8 text-xs leading-relaxed text-ink/50">
          {legalFooterText()}
        </p>
      </main>
    </>
  );
}

export function Clause({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-11 first:mt-0">
      <h2 className="text-base font-black uppercase tracking-headline">
        {n}. {title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink/75">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-steel" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
