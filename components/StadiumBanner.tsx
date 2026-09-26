/* eslint-disable @next/next/no-img-element */
import FutiWordmark from "./FutiWordmark";

/**
 * Faixa de abertura das páginas de produto: foto de estádio em tela cheia com
 * zoom lento (Ken Burns) e o logotipo futi por cima.
 *
 * As fotos já saem otimizadas de public/images/<produto>/web/ (recortadas e
 * comprimidas na origem), por isso <img> direto em vez do otimizador do Next.
 */
export default function StadiumBanner({
  src,
  alt,
  frase,
  focal = "center",
  textoADireita = false,
}: {
  src: string;
  alt: string;
  frase: string;
  /** object-position da foto — onde fica o assunto principal. */
  focal?: string;
  /** Joga o texto para a direita, quando o assunto da foto está à esquerda. */
  textoADireita?: boolean;
}) {
  return (
    <section className="relative isolate h-[58vh] min-h-[340px] overflow-hidden bg-paper md:h-[72vh]">
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 -z-10 h-full w-full animate-kenBurns object-cover"
        style={{ objectPosition: focal }}
        fetchPriority="high"
      />
      {/* Degradê para o azul da página: o texto fica legível e a foto "entra" no site. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-paper via-paper/40 to-transparent"
      />
      <div
        className={`mx-auto flex h-full flex-col justify-end px-6 pb-10 md:pb-14 ${
          textoADireita ? "max-w-6xl md:items-end md:justify-center md:pb-0 md:text-right" : "max-w-3xl"
        }`}
      >
        <div className={`animate-floatUp ${textoADireita ? "md:flex md:flex-col md:items-end" : ""}`}>
          <FutiWordmark className="h-12 w-auto drop-shadow-lg md:h-16" />
          <p className="mt-4 max-w-md text-lg font-black uppercase leading-snug tracking-headline text-navy drop-shadow md:text-2xl">
            {frase}
          </p>
        </div>
      </div>
    </section>
  );
}
