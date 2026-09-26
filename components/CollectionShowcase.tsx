/* eslint-disable @next/next/no-img-element */
import Reveal from "./Reveal";

/**
 * Seções extras da página do Futi Collection: os 6 bonequinhos e uma cena em
 * campo. Fotos recortadas e otimizadas em public/images/collection/web/ —
 * os originais (6016px) continuam na pasta de cima, sem uso na página.
 */

const BONECOS = [
  { arquivo: "amarelo", nome: "Amarelo" },
  { arquivo: "branco", nome: "Branco" },
  { arquivo: "azul-claro", nome: "Azul-claro" },
  { arquivo: "preto", nome: "Preto" },
  { arquivo: "vermelho-e-azul", nome: "Vermelho e azul" },
  { arquivo: "dourado", nome: "Dourado" },
] as const;

export default function CollectionShowcase() {
  return (
    <>
      <section className="mt-16">
        <h2 className="text-xl font-black uppercase tracking-headline">Os 6 bonequinhos</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/70">
          Cada caixa traz 1 dos 6 modelos, surpresa. Junte todos para completar a coleção.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
          {BONECOS.map((boneco, i) => (
            <li key={boneco.arquivo}>
              <Reveal delay={i * 90}>
                <figure className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
                  <img
                    src={`/images/collection/web/${boneco.arquivo}.jpg`}
                    alt={`Bonequinho Futi ${boneco.nome}`}
                    width={1000}
                    height={1250}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {boneco.arquivo === "dourado" && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine"
                      // Branco literal: no tema futi, a classe `white` é azul.
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
                    />
                  )}
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-paper/90 to-transparent px-4 pb-3 pt-8 text-xs font-black uppercase tracking-label text-navy">
                    {boneco.nome}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <Reveal>
          <figure className="overflow-hidden rounded-2xl shadow-2xl">
            <img
              src="/images/collection/web/bonecos-no-campo-1.jpg"
              alt="Dois bonequinhos Futi disputando a bola no gramado de um estádio"
              width={1920}
              height={1080}
              loading="lazy"
              className="w-full transition-transform duration-[1.2s] ease-out hover:scale-105"
            />
          </figure>
          <p className="mt-3 text-xs leading-relaxed text-ink/50">Imagem meramente ilustrativa.</p>
        </Reveal>
      </section>
    </>
  );
}
