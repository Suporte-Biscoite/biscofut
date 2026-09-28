import Headline from "./Headline";
import Sticker from "./Sticker";
import { campaign } from "@/lib/campaign";

export default function Prizes() {
  const { itensAutografados } = campaign.premios;

  return (
    <section id="premios" className="border-t border-line bg-white py-24 md:py-32">
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <Sticker
          src="/images/web/neyney-corpo-inteiro.png"
          className="-top-16 right-16 w-32"
          rotate={6}
          delay={900}
        />
        <p className="eyebrow">Prêmios</p>
        <Headline
          lead={`São ${itensAutografados.quantidade} chances de levar algo`}
          emphasis="assinado pela mão dele."
          className="mt-4 max-w-2xl text-3xl sm:text-4xl"
        />

        <div className="mt-14">
          <article className="card p-8 sm:p-10">
            <span className="inline-block rounded-full bg-sky px-3.5 py-1.5 text-[10px] font-black uppercase tracking-label text-navy">
              Prêmio principal
            </span>

            <h3 className="mt-7 text-2xl font-black uppercase leading-tight tracking-headline">
              Camiseta do Brasil Oficial Autografada pelo Neymar Jr.
            </h3>
            <p className="mt-4 max-w-prose leading-relaxed text-ink/70">
              Vinte e duas unidades, cada uma assinada individualmente. Um
              item por contemplado.
            </p>

            <dl className="mt-8 grid gap-x-8 gap-y-5 border-t border-line pt-7 sm:grid-cols-2">
              <Spec term="Quantidade" value={`${itensAutografados.quantidade} unidades`} />
              <Spec term="Forma de apuração" value="Extração da Loteria Federal" />
            </dl>
          </article>
        </div>
      </div>
    </section>
  );
}

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-label text-steel">
        {term}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink/80">{value}</dd>
    </div>
  );
}
