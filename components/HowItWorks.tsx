import Headline from "./Headline";
import Sticker from "./Sticker";
import { campaign } from "@/lib/campaign";

/**
 * Os quatro passos da mecânica "Compre e Concorra".
 *
 * Esta seção não é só marketing: o protocolo na SPA exige a descrição do
 * fluxo de cadastro e validação da LP. O texto aqui e o de FLUXO.md descrevem
 * o mesmo caminho, de propósito — o que o consumidor lê é o que foi
 * protocolado.
 */
const steps = [
  {
    n: "01",
    title: "Compre um produto participante",
    body: "Adquira um produto participante da promoção em uma loja e informe seu CPF na hora da compra. O CPF na compra é indispensável para participar do sorteio.",
  },
  {
    n: "02",
    title: "Cadastre-se com seus dados",
    body: "Acesse o menu Meus Números e faça seu primeiro acesso com o CPF e o e-mail informados na compra, criando uma senha. Depois disso, é só entrar com seu CPF e senha.",
  },
  {
    n: "03",
    title: "Seus números são gerados automaticamente",
    body: "Cada compra de produto participante feita com o seu CPF gera números da sorte automaticamente, de acordo com o produto — por exemplo, 25 números por unidade de Futi Arena. Não é preciso cadastrar nota fiscal.",
  },
  {
    n: "04",
    title: "Receba seus números da sorte",
    body: "Seus números da sorte ficam disponíveis no menu Meus Números. A quantidade de números recebidos varia de acordo com os produtos participantes adquiridos.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="como-participar"
      className="border-t border-line bg-paper py-24 md:py-32"
    >
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <Sticker
          src="/images/web/neyney-rosto.png"
          className="-top-6 right-24 w-36"
          rotate={-10}
          delay={1800}
        />
        <p className="eyebrow">Como participar</p>
        <Headline
          lead="Comprou com seu CPF,"
          emphasis="está concorrendo."
          className="mt-4 max-w-2xl text-3xl sm:text-4xl"
        />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="bg-white p-7">
              <span className="text-3xl font-black leading-none text-sky-light">
                {step.n}
              </span>
              <h3 className="mt-5 text-base font-black uppercase leading-snug tracking-headline">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-7 max-w-prose text-sm leading-relaxed text-ink/60">
          A compra deverá conter o CPF do participante para gerar números da
          sorte. Cada CPF poderá acumular, no
          máximo, {campaign.regras.maxNumerosPorCpf} números da sorte durante
          todo o período da promoção. Consulte o{" "}
          <a
            href={campaign.documentos.regulamento}
            className="font-black text-navy underline underline-offset-2"
          >
            regulamento completo
          </a>{" "}
          para conhecer todas as condições de participação.
        </p>
      </div>
    </section>
  );
}
