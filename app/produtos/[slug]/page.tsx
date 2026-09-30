import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArenaShowcase from "@/components/ArenaShowcase";
import BrandLockup from "@/components/BrandLockup";
import CardFan from "@/components/CardFan";
import CollectionShowcase from "@/components/CollectionShowcase";
import CookieRain from "@/components/CookieRain";
import FutiCardRules from "@/components/FutiCardRules";
import FutiWordmark from "@/components/FutiWordmark";
import StadiumBanner from "@/components/StadiumBanner";
import Sticker from "@/components/Sticker";
import { campaign } from "@/lib/campaign";
import { cartas } from "@/lib/futiCards";
import { produtosElegiveis } from "@/lib/numeroDaSorte";

/**
 * Página de detalhe de um produto participante — /produtos/[slug].
 *
 * Cada produto ganha seções extras além da ficha padrão:
 *  - Futi Card: leque com as 23 cartas e manual de regras (CardFan, FutiCardRules);
 *  - Futi Collection: banner de estádio e os 6 bonequinhos (CollectionShowcase);
 *  - Futi Arena: banner, caixa com frente/verso e conteúdo do set (ArenaShowcase).
 */

const BANNERS: Record<
  string,
  { src: string; alt: string; frase: string; focal?: string; textoADireita?: boolean }
> = {
  "futi-collection": {
    src: "/images/collection/web/bonecos-no-campo-1.jpg",
    alt: "Dois bonequinhos Futi disputando a bola no gramado de um estádio",
    frase: "6 bonequinhos para colecionar",
    focal: "50% 60%",
  },
  "futi-arena": {
    src: "/images/arena/web/futi-arena.jpg",
    alt: "Caixa do Futi Arena sobre a mesa, com dois bonequinhos e uma bola",
    frase: "O campo completo para jogar em casa",
    focal: "28% 55%",
    textoADireita: true,
  },
};

export function generateStaticParams() {
  return produtosElegiveis.map((produto) => ({ slug: produto.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const produto = produtosElegiveis.find((p) => p.slug === params.slug);
  if (!produto) return {};

  return {
    title: `${produto.nome} | ${campaign.nome}`,
    description: produto.descricao,
  };
}

export default function ProdutoPagina({ params }: { params: { slug: string } }) {
  const produto = produtosElegiveis.find((p) => p.slug === params.slug);
  if (!produto) notFound();
  const banner = BANNERS[produto.slug];

  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Voltar para a promoção">
            <BrandLockup className="text-sm" />
            <span className="hidden h-7 w-px bg-navy/20 sm:block" aria-hidden="true" />
            <FutiWordmark className="hidden h-5 w-auto sm:block" />
          </Link>
          <Link
            href="/#produtos"
            className="ml-auto text-[11px] font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      {banner && <StadiumBanner {...banner} />}

      <main className="relative mx-auto max-w-3xl px-6 py-16 md:py-24">
        {produto.slug === "futi-collection" && (
          // Selo "Apertou, girou, chutou" da embalagem, flutuando à direita.
          <Sticker
            src="/images/collection/apertou.png"
            className="right-0 top-20 w-36 xl:-right-40 xl:w-44"
            rotate={8}
          />
        )}
        <p className="eyebrow">Produtos participantes</p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-headline sm:text-4xl">
          {produto.nome}
        </h1>

        <div className="mt-9 flex flex-col items-start gap-7 sm:flex-row sm:items-center">
          <Image
            src={produto.imagem}
            alt={`Embalagem do produto ${produto.nome}`}
            width={produto.imagemLargura}
            height={produto.imagemAltura}
            className="h-40 w-auto shrink-0 animate-hover drop-shadow-2xl"
          />
          <div>
            <p className="max-w-prose leading-relaxed text-ink/75">{produto.descricao}</p>
            <p className="mt-4 inline-flex items-baseline gap-1.5 rounded-full bg-sky px-3.5 py-1.5 text-navy">
              <span className="text-base font-black">{produto.numerosPorUnidade}</span>
              <span className="text-[10px] font-black uppercase tracking-label">
                números da sorte / unidade
              </span>
            </p>
          </div>
        </div>

        {produto.slug === "futi-card" && (
          <>
            <section className="mt-16">
              <h2 className="text-xl font-black uppercase tracking-headline">
                As 23 cartas
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/70">
                Arraste para o lado (ou use as setas ← →) para folhear a coleção.
              </p>
              <div className="mt-8">
                <CardFan cartas={cartas} />
              </div>
            </section>

            <section className="mt-16 border-t border-line pt-12">
              <h2 className="text-xl font-black uppercase tracking-headline">
                Regras do jogo
              </h2>
              <div className="mt-8">
                <FutiCardRules />
              </div>
            </section>
          </>
        )}

        {produto.slug === "futi-collection" && <CollectionShowcase />}
        {produto.slug === "futi-arena" && <ArenaShowcase />}
      </main>
      <CookieRain />
    </>
  );
}
