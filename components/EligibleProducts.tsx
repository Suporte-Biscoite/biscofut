import Image from "next/image";
import Link from "next/link";
import Headline from "./Headline";
import Sticker from "./Sticker";
import { produtosElegiveis } from "@/lib/numeroDaSorte";

/** Do que rende mais números para o que rende menos: Arena → Collection → Card. */
const produtosPorPeso = [...produtosElegiveis].sort(
  (a, b) => b.numerosPorUnidade - a.numerosPorUnidade,
);

export default function EligibleProducts() {
  return (
    <section id="produtos" className="secao-clara bg-white py-24 md:py-32">
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        {/* Selo Neyney + monograma NJ, flutuando ao lado do título. */}
        <Sticker
          src="/images/neyneyeneymarjr.png"
          className="-top-2 right-10 w-44"
          rotate={-6}
          delay={600}
        />
        <p className="eyebrow">Produtos participantes</p>
        <Headline
          lead="Quanto maior o produto,"
          emphasis="mais números da sorte você recebe."
          className="mt-4 max-w-2xl text-3xl sm:text-4xl"
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {produtosPorPeso.map((produto) => (
            <Link
              key={produto.sku}
              href={`/produtos/${produto.slug}`}
              className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-xl"
            >
              {/* Embalagem grande, para o cliente reconhecer na gôndola. */}
              <div className="flex h-72 items-center justify-center bg-paper p-6 sm:h-80">
                <Image
                  src={produto.imagem}
                  alt={`Embalagem do produto ${produto.nome}`}
                  width={produto.imagemLargura}
                  height={produto.imagemAltura}
                  sizes="(max-width: 640px) 90vw, 360px"
                  className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_14px_20px_rgba(10,25,47,0.18)] transition-transform duration-300 group-hover:-translate-y-1.5"
                />
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-headline">
                  {produto.nome}
                  <span
                    aria-hidden="true"
                    className="text-steel transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {produto.descricao}
                </p>

                {/* Alinha os selos na mesma linha entre cards de texto diferente. */}
                <div className="grow" aria-hidden="true" />
                <p className="mt-6 inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-navy px-4 py-2 text-white">
                  <span className="text-lg font-black leading-none">
                    {produto.numerosPorUnidade}
                  </span>
                  <span className="text-[11px] font-black uppercase leading-none tracking-label">
                    {produto.numerosPorUnidade === 1
                      ? "número por unidade"
                      : "números por unidade"}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink/50">
          Pesos preliminares. Os valores finais são os declarados no
          regulamento protocolado na SPA/MF e prevalecem sobre esta página.
        </p>
      </div>
    </section>
  );
}
