import Link from "next/link";
import Headline from "./Headline";
import { campaign } from "@/lib/campaign";

/**
 * Chamada para a área "Meus números".
 *
 * A participação não passa mais por cadastro de nota fiscal: a compra feita
 * com CPF no PDV da loja chega pela integração com a Nexaas (ver
 * app/api/webhooks/nexaas) e gera os números direto no CPF do comprador.
 * O que o consumidor precisa fazer no site é só cadastrar o CPF em
 * "Meus números" para acompanhar esses números.
 */
export default function Participation() {
  return (
    <section id="participar" className="border-t border-line bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="eyebrow">Participar</p>
        <Headline
          lead="Cadastre seu CPF e"
          emphasis="participe."
          className="mt-4 max-w-2xl text-3xl sm:text-4xl"
        />

        <div className="card mx-auto mt-12 max-w-2xl p-8 sm:p-12">
          <h3 className="text-xl font-black uppercase tracking-headline">
            É só cadastrar seu CPF em Meus números
          </h3>
          <p className="mt-4 leading-relaxed text-ink/70">
            Compre um produto participante informando seu CPF na hora da
            compra. Os números da sorte são gerados automaticamente para o seu
            CPF, de acordo com o produto adquirido, até o limite de{" "}
            {campaign.regras.maxNumerosPorCpf} números por pessoa.
          </p>
          <p className="mt-4 leading-relaxed text-ink/70">
            Para acompanhar seus números, cadastre seu CPF no menu{" "}
            <strong className="font-black text-navy">Meus números</strong>.
          </p>

          <Link href="/meus-numeros" className="btn-primary mt-8">
            Cadastrar meu CPF
          </Link>
        </div>
      </div>
    </section>
  );
}
