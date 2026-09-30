"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import FutiWordmark from "@/components/FutiWordmark";
import { Field, Input } from "@/components/ui/Field";
import { campaign } from "@/lib/campaign";

/**
 * Página do link de "esqueci minha senha" (/meus-numeros/redefinir?token=…).
 * O token só é conferido no servidor, ao enviar — abrir o link não gasta.
 * Mesmo cabeçalho mínimo de /meus-numeros.
 */
export default function RedefinirSenha({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erros, setErros] = useState<{ senha?: string; confirmar?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState(token ? "" : "Link incompleto. Abra o link exatamente como veio no e-mail.");
  const [pronto, setPronto] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const novosErros: typeof erros = {};
    if (senha.length < 6) novosErros.senha = "A senha precisa ter pelo menos 6 caracteres.";
    if (confirmar !== senha) novosErros.confirmar = "As senhas não coincidem.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || !token) return;

    setCarregando(true);
    setErroGeral("");
    try {
      const response = await fetch("/api/meus-numeros/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setErroGeral(data.mensagem ?? "Não foi possível trocar a senha agora.");
        return;
      }
      setPronto(true);
    } catch {
      setErroGeral("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

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
            href={campaign.documentos.meusNumeros}
            className="ml-auto text-[11px] font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
          >
            ← Meus números
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <p className="eyebrow">{campaign.nome}</p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-headline sm:text-4xl">
          Criar nova senha
        </h1>

        {pronto ? (
          <div className="card mt-8 p-6 sm:p-8">
            <p role="status" className="leading-relaxed text-ink/80">
              Senha trocada. Agora é só entrar com seu CPF e a nova senha.
            </p>
            <Link href={campaign.documentos.meusNumeros} className="btn-primary mt-6 w-full">
              Ver meus números
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card mt-8 space-y-5 p-6 sm:p-8" noValidate>
            <Field id="nova-senha" label="Nova senha" error={erros.senha}>
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
            <Field id="confirmar-senha" label="Confirme a nova senha" error={erros.confirmar}>
              <Input
                id="confirmar-senha"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                error={erros.confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repita a senha"
              />
            </Field>

            {erroGeral && (
              <p role="alert" className="rounded-xl bg-alert/8 px-5 py-4 text-sm font-medium text-alert">
                {erroGeral}
              </p>
            )}

            <button type="submit" disabled={carregando || !token} className="btn-primary w-full">
              {carregando ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
