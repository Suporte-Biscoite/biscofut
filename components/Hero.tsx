import Image from "next/image";
import FutiWordmark from "./FutiWordmark";
import Headline from "./Headline";
import Sticker from "./Sticker";
import { campaign, formatDate } from "@/lib/campaign";
import { transactionsAllowed } from "@/lib/promoStatus";

export default function Hero() {
  const aberto = transactionsAllowed();
  const { quantidade } = campaign.premios.itensAutografados;

  return (
    <section id="conteudo" className="bg-paper pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:px-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-floatUp">
          <p className="eyebrow">
            Promoção comercial · Biscoitê × Neymar Jr.
          </p>

          {/* A divisão Medium / Black é literalmente a do board. */}
          <Headline
            as="h1"
            lead="Concorra a uma camiseta"
            emphasis="autografada pelo Neymar Jr."
            className="mt-5 text-[2.1rem] sm:text-5xl lg:text-[3.4rem]"
          />

          <p className="mt-7 max-w-prose text-lg leading-relaxed text-ink/75">
            São <strong className="font-black text-navy">{quantidade} itens</strong>{" "}
            autografados em jogo. Compre qualquer produto{" "}
            <FutiWordmark className="mx-0.5 inline-block h-[0.95em] w-auto translate-y-[0.13em] align-baseline text-navy" />
            , cadastre a nota fiscal e receba seus números da sorte.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#participar" className="btn-primary">
              {aberto ? "Cadastrar minha nota" : "Como vai funcionar"}
            </a>
            <a href="#premios" className="btn-secondary">
              Ver os prêmios
            </a>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-2 gap-3 border-t border-line pt-7 sm:gap-6">
            <Stat term="Itens autografados" value={String(quantidade)} />
            <Stat term="Início" value={formatDate(campaign.vigencia.inicio)} />
          </dl>
        </div>

        <figure className="relative mx-auto w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl bg-ink shadow-2xl">
            <Image
              src="/images/web/neymar-hero.jpg"
              alt="Neymar Jr. em campo, prestes a chutar a bola"
              width={864}
              height={1080}
              sizes="(max-width: 384px) 100vw, 384px"
              quality={90}
              className="h-full w-full animate-kenBurns object-cover"
              priority
            />
          </div>
          <Sticker
            src="/images/web/neyney-bracos-cruzados.png"
            // No alto: embaixo cobriria o aviso "Imagem meramente ilustrativa".
            className="-left-24 top-6 w-44"
            rotate={-8}
          />
          <figcaption className="mt-3 text-xs leading-relaxed text-ink/50">
            Imagem meramente ilustrativa.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black uppercase leading-snug tracking-label text-steel sm:text-[11px]">
        {term}
      </dt>
      <dd className="mt-1.5 break-words text-lg font-black leading-tight text-navy sm:text-xl">
        {value}
      </dd>
    </div>
  );
}
