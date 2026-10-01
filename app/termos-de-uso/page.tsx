import type { Metadata } from "next";
import LegalPage, { Bullets, Clause } from "@/components/LegalPage";
import { campaign } from "@/lib/campaign";

export const metadata: Metadata = {
  title: "Termos de Uso | Promoção Futi",
  description:
    "Condições de uso da plataforma da promoção Futi — Biscoitê × Neymar Jr.",
};

export default function TermosDeUso() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Estas são as condições de uso desta plataforma. Elas tratam do site; as regras da promoção em si estão no regulamento."
    >
      <Clause n="1" title="Objeto">
        <p>
          Este site existe para um propósito só: permitir o cadastro de
          participantes da {campaign.nome}, a validação de documentos fiscais de
          compra e a atribuição dos números da sorte. As regras da promoção
          estão no{" "}
          <a
            href={campaign.documentos.regulamento}
            className="font-black text-navy underline underline-offset-2"
          >
            regulamento
          </a>
          , que prevalece sobre estes termos em caso de conflito.
        </p>
      </Clause>

      <Clause n="2" title="Cadastro e responsabilidade do usuário">
        <Bullets
          items={[
            `O cadastro é pessoal e restrito a maiores de ${campaign.regras.idadeMinima} anos.`,
            "Você responde pela veracidade e atualização dos dados informados, e por manter suas credenciais de acesso em sigilo.",
            "É vedado cadastrar dados de terceiros, criar múltiplos cadastros para a mesma pessoa ou usar CPF que não seja o seu.",
          ]}
        />
      </Clause>

      <Clause n="3" title="Condutas vedadas">
        <Bullets
          items={[
            "Usar robôs, scripts, automações ou qualquer meio artificial para criar cadastros ou multiplicar participações.",
            "Enviar documento fiscal adulterado, de terceiros, duplicado ou que não corresponda a compra real de produto participante.",
            "Tentar burlar limites de participação, inclusive por CPFs de familiares sem conhecimento deles.",
            "Explorar falhas do sistema, executar engenharia reversa, varreduras de vulnerabilidade não autorizadas ou ataques de qualquer natureza.",
            "Enviar arquivos com código malicioso no campo de upload.",
          ]}
        />
        <p>
          A constatação de qualquer dessas condutas implica desclassificação
          imediata, cancelamento dos números da sorte atribuídos e, quando
          couber, comunicação às autoridades.
        </p>
      </Clause>

      <Clause n="4" title="Disponibilidade">
        <p>
          A plataforma é oferecida em regime de melhor esforço. Manutenções,
          indisponibilidades temporárias ou falhas de conexão do usuário não
          prorrogam o período de participação nem geram direito a indenização —
          mas também não prejudicam participação já registrada e confirmada.
        </p>
        <p>
          Enquanto a promoção não estiver autorizada pela{" "}
          {campaign.legal.orgao}, as funções de cadastro e de emissão de números
          da sorte permanecem desativadas.
        </p>
      </Clause>

      <Clause n="5" title="Propriedade intelectual">
        <p>
          Marcas, logotipos, layout, textos, imagens e o nome da campanha
          pertencem a {campaign.marcas.promotora} e aos respectivos titulares,
          incluindo os direitos de imagem e de nome de{" "}
          {campaign.marcas.embaixador}. O acesso ao site não transfere nenhum
          desses direitos, e é vedada reprodução ou uso comercial sem
          autorização escrita.
        </p>
      </Clause>

      <Clause n="6" title="Dados pessoais">
        <p>
          O tratamento de dados pessoais é regido pela{" "}
          <a
            href={campaign.documentos.privacidade}
            className="font-black text-navy underline underline-offset-2"
          >
            Política de Privacidade
          </a>
          , parte integrante destes termos.
        </p>
      </Clause>

      <Clause n="7" title="Alterações e foro">
        <p>
          Estes termos podem ser atualizados para refletir mudanças técnicas ou
          legais, com aviso na página. Alterações não podem reduzir direitos de
          participação já adquiridos.
        </p>
        <p>
          Aplica-se a legislação brasileira, incluindo o Código de Defesa do
          Consumidor. Fica eleito o foro do domicílio do consumidor para
          dirimir controvérsias.
        </p>
      </Clause>
    </LegalPage>
  );
}
