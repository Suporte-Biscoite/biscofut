"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import FutiWordmark from "@/components/FutiWordmark";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { campaign } from "@/lib/campaign";
import {
  ageOn,
  formatCPF,
  formatPhone,
  isValidCPF,
  isValidEmail,
  isValidFullName,
  isValidPhone,
} from "@/lib/masks";

/**
 * Consulta de números da sorte, com login por CPF + senha.
 *
 * Os números chegam pelas compras com CPF na loja: a cada cadastro e login,
 * o servidor busca as compras do CPF na API da IOTA (lib/sincronizacao.ts)
 * e emite os números das novas.
 *
 * A compra no PDV só traz CPF e nome, então o cadastro é feito aqui, com os
 * dados da cláusula 4 do regulamento e uma senha. Depois disso, é CPF +
 * senha — CPF sozinho (que pode vazar ou ser adivinhado) não abre os
 * números de ninguém.
 *
 * Página fora do fluxo de marketing da home, por isso usa um cabeçalho
 * mínimo (como as páginas legais) em vez do Header com âncoras de seção,
 * que não fazem sentido fora da home.
 */

type Numero = { numero: string; emitidoEm: string };
type Resultado = {
  nome: string | null;
  acumulado: number;
  limite: number;
  numeros: Numero[];
  /** "indisponivel": a leitura das compras falhou — mostra o que já existe. */
  compras: "ok" | "bloqueada" | "indisponivel";
};
type Modo = "entrar" | "cadastrar" | "esqueci";

function paraResultado(data: Resultado): Resultado {
  return {
    nome: data.nome,
    acumulado: data.acumulado,
    limite: data.limite,
    numeros: data.numeros,
    compras: data.compras,
  };
}

export default function MeusNumeros() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Voltar para a promoção">
            <BrandLockup className="text-sm" />
            <span className="hidden h-7 w-px bg-navy/20 sm:block" aria-hidden="true" />
            <FutiWordmark className="hidden h-5 w-auto text-navy sm:block" />
          </Link>
          <Link
            href="/"
            className="ml-auto text-[11px] font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <p className="eyebrow">{campaign.nome}</p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-headline sm:text-4xl">
          Meus números da sorte
        </h1>
        <p className="mt-5 leading-relaxed text-ink/75">
          {modo === "entrar"
            ? "Informe seu CPF e a senha cadastrada para ver os números da sorte já emitidos."
            : modo === "esqueci"
              ? "Informe seu CPF. Enviamos um link para criar uma nova senha no e-mail do cadastro."
              : "Cadastre seu CPF uma vez. Depois disso, toda compra de produto participante feita com esse CPF gera números da sorte automaticamente."}
        </p>

        <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-line bg-white p-1 text-xs">
          {(["entrar", "cadastrar"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => {
                setModo(opcao);
                setResultado(null);
              }}
              aria-pressed={modo === opcao}
              className={`rounded-full px-4 py-2 font-black uppercase tracking-label transition-colors ${
                modo === opcao ? "bg-navy text-white" : "text-ink/55 hover:text-navy"
              }`}
            >
              {opcao === "entrar" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        {modo === "entrar" && (
          <FormularioEntrar onSucesso={setResultado} onEsqueci={() => setModo("esqueci")} />
        )}
        {modo === "cadastrar" && <FormularioCadastro onSucesso={setResultado} />}
        {modo === "esqueci" && <FormularioEsqueci onVoltar={() => setModo("entrar")} />}

        {resultado && <ResultadoNumeros resultado={resultado} />}

        <p className="mt-8 text-xs leading-relaxed text-ink/50">
          Em caso de divergência, prevalece o{" "}
          <Link
            href={campaign.documentos.regulamento}
            className="font-black text-navy underline underline-offset-2"
          >
            regulamento
          </Link>{" "}
          protocolado.
        </p>
      </main>
    </>
  );
}

function FormularioEntrar({
  onSucesso,
  onEsqueci,
}: {
  onSucesso: (r: Resultado) => void;
  onEsqueci: () => void;
}) {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ cpf?: string; senha?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const novosErros: { cpf?: string; senha?: string } = {};
    if (!isValidCPF(cpf)) novosErros.cpf = "CPF inválido.";
    if (!senha) novosErros.senha = "Informe sua senha.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setCarregando(true);
    setErroGeral("");

    try {
      const response = await fetch("/api/meus-numeros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, senha }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setErroGeral(data.mensagem ?? "Não foi possível entrar agora.");
        return;
      }

      onSucesso(paraResultado(data));
    } catch {
      setErroGeral("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6 sm:p-8" noValidate>
      <Field id="cpf" label="CPF" error={erros.cpf}>
        <Input
          id="cpf"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          value={cpf}
          error={erros.cpf}
          onChange={(e) => setCpf(formatCPF(e.target.value))}
          placeholder="000.000.000-00"
        />
      </Field>

      <Field id="senha" label="Senha" error={erros.senha}>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          error={erros.senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Sua senha"
        />
      </Field>

      {erroGeral && (
        <p role="alert" className="rounded-xl bg-alert/8 px-5 py-4 text-sm font-medium text-alert">
          {erroGeral}
        </p>
      )}

      <button type="submit" disabled={carregando} className="btn-primary w-full">
        {carregando ? "Entrando…" : "Entrar"}
      </button>

      <button
        type="button"
        onClick={onEsqueci}
        className="block w-full text-center text-xs font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

function FormularioEsqueci({ onVoltar }: { onVoltar: () => void }) {
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const [enviado, setEnviado] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidCPF(cpf)) {
      setErro("CPF inválido.");
      return;
    }
    setErro("");
    setCarregando(true);
    setErroGeral("");

    try {
      const response = await fetch("/api/meus-numeros/esqueci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setErroGeral(data.mensagem ?? "Não foi possível enviar o link agora.");
        return;
      }
      setEnviado(data.mensagem);
    } catch {
      setErroGeral("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6 sm:p-8" noValidate>
      {enviado ? (
        <p role="status" className="rounded-xl bg-sky/15 px-5 py-4 text-sm leading-relaxed text-ink/80">
          {enviado}
        </p>
      ) : (
        <>
          <Field id="cpf-esqueci" label="CPF" error={erro}>
            <Input
              id="cpf-esqueci"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              value={cpf}
              error={erro}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </Field>

          {erroGeral && (
            <p role="alert" className="rounded-xl bg-alert/8 px-5 py-4 text-sm font-medium text-alert">
              {erroGeral}
            </p>
          )}

          <button type="submit" disabled={carregando} className="btn-primary w-full">
            {carregando ? "Enviando…" : "Enviar link por e-mail"}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onVoltar}
        className="block w-full text-center text-xs font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
      >
        ← Voltar para o login
      </button>
    </form>
  );
}


function FormularioCadastro({ onSucesso }: { onSucesso: (r: Resultado) => void }) {
  const [dados, setDados] = useState({
    nome: "",
    cpf: "",
    nascimento: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
  });
  const [aceites, setAceites] = useState({ documentos: false, comunicacoes: false });
  const [erros, setErros] = useState<Partial<Record<keyof typeof dados | "documentos", string>>>({});
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");

  const campo = (nome: keyof typeof dados, formatar?: (v: string) => string) => ({
    value: dados[nome],
    error: erros[nome],
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setDados((d) => ({ ...d, [nome]: formatar ? formatar(e.target.value) : e.target.value })),
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const novosErros: typeof erros = {};
    if (!isValidFullName(dados.nome)) novosErros.nome = "Informe nome e sobrenome.";
    if (!isValidCPF(dados.cpf)) novosErros.cpf = "CPF inválido.";
    if (!dados.nascimento) novosErros.nascimento = "Informe sua data de nascimento.";
    else if (!(ageOn(dados.nascimento, new Date()) >= campaign.regras.idadeMinima))
      novosErros.nascimento = `A promoção é só para maiores de ${campaign.regras.idadeMinima} anos.`;
    if (!isValidEmail(dados.email)) novosErros.email = "E-mail inválido.";
    if (!isValidPhone(dados.telefone)) novosErros.telefone = "Telefone inválido.";
    if (dados.senha.length < 6) novosErros.senha = "A senha precisa ter pelo menos 6 caracteres.";
    if (dados.confirmarSenha !== dados.senha) novosErros.confirmarSenha = "As senhas não coincidem.";
    if (!aceites.documentos) novosErros.documentos = "Obrigatório para participar.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setCarregando(true);
    setErroGeral("");

    try {
      const response = await fetch("/api/meus-numeros/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: dados.nome,
          cpf: dados.cpf,
          nascimento: dados.nascimento,
          email: dados.email,
          telefone: dados.telefone,
          senha: dados.senha,
          aceiteDocumentos: aceites.documentos,
          aceiteComunicacoes: aceites.comunicacoes,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setErroGeral(data.mensagem ?? "Não foi possível concluir o cadastro agora.");
        return;
      }

      onSucesso(paraResultado(data));
    } catch {
      setErroGeral("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6 sm:p-8" noValidate>
      <Field id="cad-nome" label="Nome completo" error={erros.nome}>
        <Input id="cad-nome" autoComplete="name" placeholder="Seu nome e sobrenome" {...campo("nome")} />
      </Field>

      <Field id="cad-cpf" label="CPF" error={erros.cpf} hint="O mesmo CPF que você informa no caixa.">
        <Input
          id="cad-cpf"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          placeholder="000.000.000-00"
          hasHint
          {...campo("cpf", formatCPF)}
        />
      </Field>

      <Field id="cad-nascimento" label="Data de nascimento" error={erros.nascimento}>
        <Input id="cad-nascimento" type="date" autoComplete="bday" {...campo("nascimento")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cad-email" label="E-mail" error={erros.email}>
          <Input
            id="cad-email"
            type="email"
            autoComplete="email"
            placeholder="seuemail@exemplo.com"
            {...campo("email")}
          />
        </Field>
        <Field id="cad-telefone" label="Celular" error={erros.telefone}>
          <Input
            id="cad-telefone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={15}
            placeholder="(11) 90000-0000"
            {...campo("telefone", formatPhone)}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cad-senha" label="Crie uma senha" error={erros.senha}>
          <Input
            id="cad-senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            {...campo("senha")}
          />
        </Field>
        <Field id="cad-confirmar" label="Confirme a senha" error={erros.confirmarSenha}>
          <Input
            id="cad-confirmar"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            {...campo("confirmarSenha")}
          />
        </Field>
      </div>

      <div className="space-y-3 pt-1">
        <Checkbox
          id="cad-documentos"
          checked={aceites.documentos}
          onChange={(v) => setAceites((a) => ({ ...a, documentos: v }))}
          error={erros.documentos}
        >
          Li e aceito o{" "}
          <Link
            href={campaign.documentos.regulamento}
            target="_blank"
            className="font-black text-navy underline underline-offset-2"
          >
            regulamento
          </Link>{" "}
          e a{" "}
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="font-black text-navy underline underline-offset-2"
          >
            política de privacidade
          </Link>
          .
        </Checkbox>
        <Checkbox
          id="cad-comunicacoes"
          checked={aceites.comunicacoes}
          onChange={(v) => setAceites((a) => ({ ...a, comunicacoes: v }))}
        >
          Quero receber novidades e ofertas da Biscoitê (opcional).
        </Checkbox>
      </div>

      {erroGeral && (
        <p role="alert" className="rounded-xl bg-alert/8 px-5 py-4 text-sm font-medium text-alert">
          {erroGeral}
        </p>
      )}

      <button type="submit" disabled={carregando} className="btn-primary w-full">
        {carregando ? "Cadastrando…" : "Cadastrar e ver meus números"}
      </button>
    </form>
  );
}

function ResultadoNumeros({ resultado }: { resultado: Resultado }) {
  return (
    <div className="card mt-6 p-6 sm:p-8">
      <p className="text-[11px] font-black uppercase tracking-label text-steel">
        {resultado.nome ? `Olá, ${resultado.nome.split(" ")[0]}` : "Participação encontrada"}
      </p>
      <h2 className="mt-2 text-xl font-black uppercase tracking-headline">
        {resultado.numeros.length === 1
          ? "1 número da sorte"
          : `${resultado.numeros.length} números da sorte`}
      </h2>

      <ul className="mt-6 flex flex-wrap gap-2">
        {resultado.numeros.map((n) => (
          <li
            key={n.numero}
            className="rounded-lg bg-navy px-3.5 py-2 font-mono text-sm font-black tracking-wider text-white"
          >
            {/* "3-48213": série 3, número 48213 (lib/numeroDaSorte.ts). */}
            <span className="mr-1.5 text-[10px] font-medium uppercase tracking-label opacity-60">
              série {n.numero.split("-")[0]}
            </span>
            {n.numero.split("-")[1]}
          </li>
        ))}
      </ul>

      {resultado.numeros.length === 0 && (
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          Ainda não há compras de produtos participantes com este CPF. Informe seu CPF no caixa
          ao comprar e os números aparecem aqui.
        </p>
      )}

      {resultado.compras === "indisponivel" && (
        <p role="status" className="mt-4 rounded-xl bg-sky/15 px-4 py-3 text-sm leading-relaxed text-ink/75">
          Não conseguimos consultar suas compras mais recentes agora. Os números acima já estão
          garantidos — tente de novo em alguns minutos para ver os novos.
        </p>
      )}

      <p className="mt-6 text-sm leading-relaxed text-ink/70">
        Total acumulado: <strong className="text-navy">{resultado.acumulado}</strong> de{" "}
        {resultado.limite} números permitidos por CPF em toda a promoção.
      </p>
    </div>
  );
}
