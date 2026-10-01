import type { Metadata } from "next";
import type { ReactNode } from "react";
import LegalPage, { Bullets, Clause } from "@/components/LegalPage";
import { campaign, formatDate, PENDENTE } from "@/lib/campaign";

export const metadata: Metadata = {
  title: "Regulamento | Missão Neymar Jr.",
  description:
    "Regulamento da promoção comercial \"Compre e Concorra\" — Missão Neymar Jr., Biscoitê × Neymar Jr.",
};

const SITE = "biscoite.com.br/neymar";
const SITE_URL = `https://${SITE}`;

function currency(valor: number | null): string {
  return valor === null
    ? PENDENTE
    : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Regulamento() {
  const { itensAutografados } = campaign.premios;
  const { promotora } = campaign;
  const valorTotal =
    itensAutografados.valorUnitario === null
      ? null
      : itensAutografados.valorUnitario * itensAutografados.quantidade;

  return (
    <LegalPage
      title='Regulamento – Promoção "Compre e Concorra"'
      intro={`${promotora.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${promotora.cnpj}, com sede ${promotora.endereco}, neste ato representada por ${promotora.representante.nome}, ${promotora.representante.nacionalidade}, ${promotora.representante.estadoCivil}, portador da cédula de identidade RG nº ${promotora.representante.rg} e inscrito no CPF/MF sob o nº ${promotora.representante.cpf}, doravante denominada "Promotora".`}
    >
      <Clause n="1" title="Modalidade da promoção">
        <p>
          Distribuição gratuita de prêmios a título de propaganda, na
          modalidade assemelhada a sorteio.
        </p>
      </Clause>

      <Clause n="2" title="Área de abrangência">
        <p>Todo o território nacional.</p>
      </Clause>

      <Clause n="3" title="Período da promoção">
        <p>
          Nome da promoção: <strong>{campaign.nome}</strong>.
        </p>
        <p>
          Período de participação:{" "}
          <strong>
            {formatDate(campaign.vigencia.inicio)} a{" "}
            {formatDate(campaign.vigencia.fim)}
          </strong>
          .
        </p>
        <p>
          Período de divulgação da campanha:{" "}
          <strong>mesmo período de participação</strong>.
        </p>
        <p>
          As apurações ocorrerão mensalmente na última quarta-feira de cada
          mês, com exceção de dezembro, quando o sorteio será antecipado para
          o dia 23/12/2026.
        </p>
        <Bullets
          items={campaign.apuracao.datas.map((data, index) => (
            <>
              Sorteio {index + 1} — <strong>{formatDate(data)}</strong>
            </>
          ))}
        />
        <p className="font-black uppercase tracking-label text-navy">
          Premiação
        </p>
        <p>
          A campanha conta com {itensAutografados.quantidade} itens
          autografados pelo {campaign.marcas.embaixador} no total.{" "}
          {itensAutografados.quantidade} camisetas autografadas serão
          distribuídas ao público participante,{" "}
          {campaign.apuracao.ganhadoresPorSorteio} por sorteio ao longo dos 12
          meses de campanha.
        </p>
      </Clause>

      <Clause n="4" title="Critério de participação">
        <p>
          Poderão participar pessoas físicas, maiores de{" "}
          {campaign.regras.idadeMinima} anos, residentes e domiciliadas no
          Brasil.
        </p>
        <p>Para participar, o interessado deverá:</p>
        <Bullets
          items={[
            "adquirir ao menos 1 (um) produto participante durante o período da promoção;",
            <>
              escanear o QR Code da embalagem, que direciona para o site:{" "}
              <a
                href={SITE_URL}
                className="font-black text-navy underline underline-offset-2"
              >
                {SITE}
              </a>
              ;
            </>,
            "informar o seu CPF no momento da compra, no caixa da loja;",
            "cadastrar o CPF na área Meus Números do site para consultar os números da sorte.",
          ]}
        />
        <p>
          Cada compra com CPF informado será registrada automaticamente pelo
          sistema de vendas da loja, e o(s) número(s) da sorte serão
          atribuídos ao CPF do participante.
        </p>
        <p>
          Cada compra válida dará direito a número(s) da sorte:
        </p>
        <Bullets
          items={[
            "P1 — Futi Card: Biscoito + Card colecionável → 1 número da sorte;",
            "P2 — Futi Collection: Biscoito + Boneco surpresa do Neymar Jr. (6 modelos; o dourado é item colecionável raro, sem vantagem promocional vinculada) → 6 números da sorte;",
            "P3 — Futi Arena: Campo de futebol + 2 bonecos + 2 bolas → 25 números da sorte.",
          ]}
        />
      </Clause>

      <Clause n="5" title="Produtos participantes">
        <Bullets
          items={[
            "P1 — Futi Card: Biscoito + Card colecionável.",
            "P2 — Futi Collection: Biscoito + Boneco surpresa do Neymar Jr. (6 modelos; o dourado é item colecionável raro, sem vantagem promocional vinculada).",
            "P3 — Futi Arena: Campo de futebol + 2 bonecos + 2 bolas.",
          ]}
        />
      </Clause>

      <Clause n="6" title="Quantidade de números da sorte">
        <p>
          Os números da sorte serão compostos por uma série, de 0 a 9, e um
          número de 5 dígitos, de 00000 a 99999 — por exemplo, série 3, número
          48213.
        </p>
        <p>Serão distribuídos de forma aleatória e concomitante ao cadastro válido.</p>
        <p>
          O limite de números da sorte por participante será de{" "}
          {campaign.regras.maxNumerosPorCpf}. Todos os números da sorte ficam
          vinculados ao CPF do participante e se acumulam a cada nova compra,
          podendo ser consultados a qualquer momento em{" "}
          <a
            href={SITE_URL}
            className="font-black text-navy underline underline-offset-2"
          >
            {SITE}
          </a>
          .
        </p>
      </Clause>

      <Clause n="7" title="Apuração e identificação dos ganhadores">
        <p>
          A Loteria Federal sorteia 5 números por concurso. A apuração
          utilizará esses números na seguinte ordem de critérios:
        </p>
        <NumberedList
          items={[
            "Será considerado vencedor o participante que possuir número da sorte correspondente ao 1º número sorteado pela Loteria Federal.",
            "Será considerado vencedor o participante que possuir número da sorte correspondente ao 2º número sorteado.",
            "Caso nenhum participante seja contemplado pelos 2 primeiros números, o critério se estende sucessivamente ao 3º, 4º e 5º números sorteados.",
            "Caso nenhum participante seja contemplado por nenhum dos 5 números, será aplicado o critério de aproximação imediatamente superior ao 1º número sorteado, de forma sucessiva.",
            "Caso o 1º número sorteado seja 99999, impossibilitando a aproximação superior, será adotado o número imediatamente inferior.",
            "Persistindo a ausência de ganhador, será utilizado o resultado da Loteria Federal do sábado imediatamente seguinte.",
          ]}
        />
        <p>
          Cada sorteio contempla 2 ganhadores, correspondentes aos 2 primeiros
          números apurados, seguindo os critérios acima.
        </p>
      </Clause>

      <Clause n="8" title="Premiação">
        <p>Serão distribuídos:</p>
        <Bullets
          items={[
            `${itensAutografados.quantidade} (vinte e dois) itens autografados – camisetas do Brasil autografadas pelo Neymar Júnior.`,
          ]}
        />
        <p>Valor unitário estimado: {currency(itensAutografados.valorUnitario)}.</p>
        <p>Valor total da premiação: {currency(valorTotal)}.</p>
        <p>
          Os prêmios são pessoais, intransferíveis e não poderão ser
          convertidos em dinheiro.
        </p>
      </Clause>

      <section className="mt-11">
        <h2 className="text-base font-black uppercase tracking-headline">
          Embalagem
        </h2>
        <div className="mt-4 space-y-4 leading-relaxed text-ink/75">
          <p>A frase prevista para a embalagem é:</p>
          <p>
            &ldquo;Consulte o regulamento, período de participação e número do
            Certificado de Autorização SPA/MF em{" "}
            <a
              href={SITE_URL}
              className="font-black text-navy underline underline-offset-2"
            >
              {SITE}
            </a>
            .&rdquo;
          </p>
          <p>
            O QR Code apontará para{" "}
            <a
              href={SITE_URL}
              className="font-black text-navy underline underline-offset-2"
            >
              {SITE}
            </a>
            . A landing page permanecerá totalmente inativa em termos
            promocionais até a emissão do CA.
          </p>
        </div>
      </section>

      <Clause n="9" title="Entrega dos prêmios">
        <Bullets
          items={[
            "Os prêmios serão entregues em até 30 (trinta) dias após a validação do ganhador. Entraremos em contato pelo e-mail cadastrado solicitando endereço.",
            "A entrega será realizada sem ônus ao contemplado, no endereço informado pelo ganhador.",
            "O ganhador deverá apresentar documento de identificação e comprovante de residência.",
          ]}
        />
      </Clause>

      <Clause n="10" title="Desclassificação">
        <p>Serão desclassificados participantes que:</p>
        <Bullets
          items={[
            "informarem dados falsos ou incompletos;",
            "utilizarem CPF de terceiros ou compras canceladas, estornadas ou fraudadas;",
            "adotarem qualquer conduta fraudulenta.",
          ]}
        />
      </Clause>

      <Clause n="11" title="Divulgação dos resultados">
        <p>
          Os ganhadores serão divulgados no site{" "}
          <a
            href={SITE_URL}
            className="font-black text-navy underline underline-offset-2"
          >
            {SITE}
          </a>{" "}
          em até 15 dias após a apuração, permanecendo a divulgação do
          resultado disponível no site por mais 30 dias.
        </p>
      </Clause>

      <Clause n="12" title="Tratamento de dados pessoais">
        <p>
          Os dados pessoais serão tratados em conformidade com a Lei Geral de
          Proteção de Dados Pessoais.
        </p>
        <p>Os dados serão utilizados para:</p>
        <Bullets
          items={[
            "execução da promoção;",
            "contato com os participantes;",
            "cumprimento de obrigações legais.",
          ]}
        />
      </Clause>

      <Clause n="13" title="Disposições gerais">
        <Bullets
          items={[
            "A participação implica aceitação total deste regulamento.",
            "A Promotora se reserva o direito de alterar a promoção mediante autorização da SPA.",
            campaign.certificado.numero
              ? `Esta promoção está autorizada pela SPA/MF sob o nº ${campaign.certificado.numero}.`
              : "Esta promoção está autorizada pela SPA/MF sob o nº [●].",
          ]}
        />
      </Clause>
    </LegalPage>
  );
}

function NumberedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="w-5 shrink-0 font-black text-steel">{index + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
