import type { Metadata } from "next";
import LegalPage, { Bullets, Clause } from "@/components/LegalPage";
import { campaign, PENDENTE } from "@/lib/campaign";

export const metadata: Metadata = {
  title: "Política de Privacidade | Promoção Futi",
  description:
    "Como os dados pessoais dos participantes da promoção Futi são coletados, usados, guardados e excluídos, conforme a LGPD.",
};

export default function PoliticaDePrivacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt={null}
      intro="Esta política explica quais dados a promoção coleta, por quê, com que base legal, por quanto tempo ficam guardados e como você exerce seus direitos."
    >
      <Clause n="1" title="Quem é o controlador">
        <p>
          <strong>{campaign.marcas.promotora}</strong> (CNPJ {PENDENTE}) é a
          controladora dos dados pessoais tratados nesta promoção. Contato do
          encarregado (DPO):{" "}
          <a
            href={`mailto:${campaign.contato.email}`}
            className="font-black text-navy underline underline-offset-2"
          >
            {campaign.contato.email}
          </a>
          .
        </p>
      </Clause>

      <Clause n="2" title="Quais dados são coletados">
        <p>
          Somente o necessário para operar a promoção — nada de coleta “por
          precaução”:
        </p>
        <Bullets
          items={[
            <>
              <strong>Identificação:</strong> nome completo, CPF e data de
              nascimento. O CPF é indispensável: é ele que identifica a
              participação, aplica o limite por pessoa e permite a entrega do
              prêmio.
            </>,
            <>
              <strong>Contato:</strong> e-mail e telefone, usados para
              confirmar a participação e comunicar o resultado.
            </>,
            <>
              <strong>Dados de participação:</strong> números da sorte
              atribuídos, data e hora dos cadastros.
            </>,
            <>
              <strong>Endereço de entrega:</strong> coletado apenas dos
              contemplados, no momento da entrega do prêmio.
            </>,
          ]}
        />
      </Clause>

      <Clause n="3" title="Para que servem, e com que base legal">
        <Bullets
          items={[
            <>
              <strong>Executar a promoção</strong> (cadastro, recebimento
              das compras, emissão de números, apuração, entrega) — base:{" "}
              <em>execução de contrato</em> (art. 7º, V da LGPD). Sem esses
              dados a participação é impossível.
            </>,
            <>
              <strong>Cumprir obrigações legais e regulatórias</strong>
              (prestação de contas à {campaign.legal.orgao}, guarda de
              documentos fiscais) — base:{" "}
              <em>cumprimento de obrigação legal</em> (art. 7º, II).
            </>,
            <>
              <strong>Prevenir fraude</strong> (detectar cadastros duplicados,
              uso de CPF de terceiros, automação) — base:{" "}
              <em>legítimo interesse</em> (art. 7º, IX).
            </>,
            <>
              <strong>Enviar comunicações de marketing</strong> — base:{" "}
              <em>consentimento</em> (art. 7º, I), coletado em caixa separada e
              opcional. Recusar não impede a participação, e você pode revogar a
              qualquer momento.
            </>,
          ]}
        />
      </Clause>

      <Clause n="4" title="Com quem os dados são compartilhados">
        <Bullets
          items={[
            "Operadores contratados para executar a promoção (hospedagem, envio de e-mail, integração com o sistema de vendas das lojas e logística de entrega), sempre limitados às finalidades desta política.",
            <>
              A {campaign.legal.orgao} e demais autoridades, quando exigido por
              lei ou para a prestação de contas da promoção.
            </>,
            "Nome e cidade dos contemplados podem ser divulgados no site da promoção, como exige a legislação de promoções comerciais.",
          ]}
        />
        <p>
          Os dados <strong>não são vendidos</strong> nem cedidos para
          publicidade de terceiros.
        </p>
      </Clause>

      <Clause n="5" title="Por quanto tempo ficam guardados">
        <Bullets
          items={[
            "Dados de participação e documentos fiscais: 5 (cinco) anos após o encerramento da promoção, prazo alinhado à prestação de contas e à prescrição aplicável.",
            "Registros de acesso: 6 (seis) meses, conforme o Marco Civil da Internet.",
            "Dados usados para marketing sob consentimento: até a revogação do consentimento.",
            "Encerrados os prazos, os dados são eliminados ou anonimizados.",
          ]}
        />
      </Clause>

      <Clause n="6" title="Seus direitos">
        <p>
          Você pode, a qualquer momento, pedir confirmação do tratamento,
          acesso, correção, anonimização, portabilidade, informação sobre
          compartilhamentos, revogação de consentimento e eliminação dos dados
          tratados com base em consentimento.
        </p>
        <p>
          O pedido é feito por{" "}
          <a
            href={`mailto:${campaign.contato.email}`}
            className="font-black text-navy underline underline-offset-2"
          >
            {campaign.contato.email}
          </a>{" "}
          e respondido em até 15 dias. Uma ressalva honesta: pedir a exclusão
          dos dados de identificação durante a promoção encerra a sua
          participação, porque sem eles não é possível apurar nem entregar
          prêmio.
        </p>
      </Clause>

      <Clause n="7" title="Segurança">
        <Bullets
          items={[
            "Tráfego cifrado em HTTPS em todo o site.",
            "Acesso aos dados restrito a pessoas autorizadas, com registro de acesso.",
            "Para proteger as contas contra tentativas automáticas de acesso, registramos por até 24 horas uma versão codificada e irreversível do endereço IP de quem tenta entrar ou se cadastrar.",
            "Nenhum dado sensível de pagamento é coletado — a promoção não processa pagamentos.",
          ]}
        />
      </Clause>

      <Clause n="8" title="Cookies">
        <p>
          O site usa cookies necessários ao funcionamento do cadastro (sessão e
          segurança). Cookies de medição de audiência, se ativados, só são
          gravados após o seu consentimento no aviso exibido na primeira visita.
        </p>
      </Clause>
    </LegalPage>
  );
}
