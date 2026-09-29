"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import FutiWordmark from "@/components/FutiWordmark";
import { Field, Input } from "@/components/ui/Field";
import { campaign } from "@/lib/campaign";
import { formatCPF, isValidCPF, isValidEmail } from "@/lib/masks";

/**
 * Consulta de números da sorte, com login por CPF + senha.
 *
 * Os números chegam pelas compras com CPF na loja, via webhook da Nexaas
 * (ver app/api/webhooks/nexaas), e ficam no participante daquele CPF em
 * lib/store.ts.
 *
 * A senha não existe no pedido da Nexaas, então o primeiro acesso é uma etapa própria: confirma
 * CPF + e-mail da compra (a mesma verificação que valia antes da senha
 * existir) e define a senha ali. Da em diante, é CPF + senha — CPF sozinho
 * (que pode vazar ou ser adivinhado) não abre mais os números de ninguém.
 *
 * Página fora do fluxo de marketing da home, por isso usa um cabeçalho
 * mínimo (como as páginas legais) em vez do Header com âncoras de seção,
 * que não fazem sentido fora da home.
 */

type Numero = { numero: string; origem: "nexaas"; emitidoEm: string };
type Resultado = { nome: string | null; acumulado: number; limite: number; numeros: Numero[] };
type Modo = "entrar" | "criar";

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
            : "Primeiro acesso: confirme o CPF e o e-mail informados na compra e crie uma senha."}
        </p>

        <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-line bg-white p-1 text-xs">
          {(["entrar", "criar"] as const).map((opcao) => (
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
              {opcao === "entrar" ? "Entrar" : "Primeiro acesso"}
            </button>
          ))}
        </div>

        {modo === "entrar" ? (
          <FormularioEntrar onSucesso={setResultado} />
        ) : (
          <FormularioCriarSenha onSucesso={setResultado} />
        )}

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

function FormularioEntrar({ onSucesso }: { onSucesso: (r: Resultado) => void }) {
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

      onSucesso({ nome: data.nome, acumulado: data.acumulado, limite: data.limite, numeros: data.numeros });
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
    </form>
  );
}

function FormularioCriarSenha({ onSucesso }: { onSucesso: (r: Resultado) => void }) {
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erros, setErros] = useState<{ cpf?: string; email?: string; senha?: string; confirmarSenha?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const novosErros: typeof erros = {};
    if (!isValidCPF(cpf)) novosErros.cpf = "CPF inválido.";
    if (!isValidEmail(email)) novosErros.email = "E-mail inválido.";
    if (senha.length < 6) novosErros.senha = "A senha precisa ter pelo menos 6 caracteres.";
    if (confirmarSenha !== senha) novosErros.confirmarSenha = "As senhas não coincidem.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setCarregando(true);
    setErroGeral("");

    try {
      const response = await fetch("/api/meus-numeros/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, email, senha }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setErroGeral(data.mensagem ?? "Não foi possível criar sua senha agora.");
        return;
      }

      onSucesso({ nome: data.nome, acumulado: data.acumulado, limite: data.limite, numeros: data.numeros });
    } catch {
      setErroGeral("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6 sm:p-8" noValidate>
      <Field id="cpf-criar" label="CPF" error={erros.cpf} hint="O mesmo CPF informado na compra.">
        <Input
          id="cpf-criar"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          value={cpf}
          error={erros.cpf}
          hasHint
          onChange={(e) => setCpf(formatCPF(e.target.value))}
          placeholder="000.000.000-00"
        />
      </Field>

      <Field id="email-criar" label="E-mail" error={erros.email} hint="O mesmo e-mail informado na compra.">
        <Input
          id="email-criar"
          type="email"
          autoComplete="email"
          value={email}
          error={erros.email}
          hasHint
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@exemplo.com"
        />
      </Field>

      <Field id="nova-senha" label="Crie uma senha" error={erros.senha}>
        <Input
          id="nova-senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          error={erros.senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
      </Field>

      <Field id="confirmar-senha" label="Confirme a senha" error={erros.confirmarSenha}>
        <Input
          id="confirmar-senha"
          type="password"
          autoComplete="new-password"
          value={confirmarSenha}
          error={erros.confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          placeholder="Repita a senha"
        />
      </Field>

      {erroGeral && (
        <p role="alert" className="rounded-xl bg-alert/8 px-5 py-4 text-sm font-medium text-alert">
          {erroGeral}
        </p>
      )}

      <button type="submit" disabled={carregando} className="btn-primary w-full">
        {carregando ? "Criando…" : "Criar senha e ver meus números"}
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
            title="Gerado por compra na loja"
            className="rounded-lg bg-navy px-3.5 py-2 font-mono text-sm font-black tracking-wider text-white"
          >
            {n.numero}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-ink/70">
        Total acumulado: <strong className="text-navy">{resultado.acumulado}</strong> de{" "}
        {resultado.limite} números permitidos por CPF em toda a promoção.
      </p>
    </div>
  );
}
