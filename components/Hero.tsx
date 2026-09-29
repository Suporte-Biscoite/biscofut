import FutiWordmark from "./FutiWordmark";
import Headline from "./Headline";
import Sticker from "./Sticker";
import { campaign, formatDate } from "@/lib/campaign";
import { transactionsAllowed } from "@/lib/promoStatus";

/**
 * Fundo da hero: Neymar Jr. assinando a camiseta.
 *
 * O material bruto é um GIF de 26 MB (public/gif/). Aqui vai a versão em
 * vídeo (public/gif/web/, ~0,7 MB): mesmo loop, sem som, e o navegador só
 * baixa um dos dois formatos. O poster cobre o primeiro quadro enquanto o
 * vídeo carrega.
 *
 * O fundo é um azul quase preto fixo, e não um token do tema: o vídeo é
 * escuro e o texto por cima é sempre branco, nos dois temas.
 */
const FUNDO = "#081226";

export default function Hero() {
  const aberto = transactionsAllowed();
  const { quantidade } = campaign.premios.itensAutografados;

  return (
    <section
      id="conteudo"
      className="relative isolate overflow-hidden pt-32 pb-20 text-[#FFFFFF] md:pt-40 md:pb-28 lg:min-h-[44rem]"
      style={{ backgroundColor: FUNDO }}
    >
      {/* Vídeo à direita no desktop, para o Neymar não ficar atrás do texto;
          no mobile ocupa tudo, sob um véu mais forte. */}
      <div className="absolute inset-0 -z-10 lg:left-auto lg:w-[68%]" aria-hidden="true">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/gif/web/neymar-assinando-poster.jpg"
        >
          <source src="/gif/web/neymar-assinando.webm" type="video/webm" />
          <source src="/gif/web/neymar-assinando.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 lg:hidden"
          style={{ backgroundColor: `${FUNDO}c7` }}
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background: `linear-gradient(to right, ${FUNDO} 0%, ${FUNDO}d9 22%, ${FUNDO}40 55%, transparent 100%)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: `linear-gradient(to top, ${FUNDO}, transparent)` }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <div className="max-w-xl animate-floatUp">
          <p className="eyebrow !text-[#FFFFFF]/70">
            Promoção comercial · Biscoitê &amp; Neymar Jr.
          </p>

          {/* A divisão Medium / Black é literalmente a do board. */}
          <Headline
            as="h1"
            lead="Concorra a uma camiseta"
            emphasis="autografada pelo Neymar Jr."
            className="mt-5 text-[2.1rem] !text-[#FFFFFF] sm:text-5xl lg:text-[3.4rem]"
          />

          <p className="mt-7 max-w-prose text-lg leading-relaxed text-[#FFFFFF]/80">
            São <strong className="font-black text-[#FFFFFF]">{quantidade} itens</strong>{" "}
            autografados em jogo. Compre qualquer produto{" "}
            <FutiWordmark className="mx-0.5 inline-block h-[0.95em] w-auto translate-y-[0.13em] align-baseline text-[#FFFFFF]" />
            , cadastre a nota fiscal e receba seus números da sorte.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#participar"
              className="inline-flex items-center justify-center rounded-full bg-[#FFFFFF] px-7 py-3.5 text-sm font-black uppercase tracking-label text-[#081226] transition-colors hover:bg-[#D6E2F4]"
            >
              {aberto ? "Cadastrar minha nota" : "Como vai funcionar"}
            </a>
            <a
              href="#premios"
              className="inline-flex items-center justify-center rounded-full border border-[#FFFFFF]/35 px-7 py-3.5 text-sm font-black uppercase tracking-label text-[#FFFFFF] transition-colors hover:border-[#FFFFFF] hover:bg-[#FFFFFF]/10"
            >
              Ver os prêmios
            </a>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-2 gap-3 border-t border-[#FFFFFF]/20 pt-7 sm:gap-6">
            <Stat term="Itens autografados" value={String(quantidade)} />
            <Stat term="Início" value={formatDate(campaign.vigencia.inicio)} />
          </dl>
        </div>
      </div>

      <Sticker
        src="/images/web/neyney-bracos-cruzados.png"
        className="bottom-16 right-[6%] w-44 xl:right-[10%]"
        rotate={-8}
      />
      <p className="absolute bottom-4 right-6 text-[11px] text-[#FFFFFF]/55 md:right-10">
        Imagem meramente ilustrativa.
      </p>
    </section>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black uppercase leading-snug tracking-label text-[#FFFFFF]/60 sm:text-[11px]">
        {term}
      </dt>
      <dd className="mt-1.5 break-words text-lg font-black leading-tight text-[#FFFFFF] sm:text-xl">
        {value}
      </dd>
    </div>
  );
}
