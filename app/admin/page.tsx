"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import BrandLockup from "@/components/BrandLockup";
import { Field, Input } from "@/components/ui/Field";
import { campaign } from "@/lib/campaign";
import { formatCPF, formatPhone } from "@/lib/masks";

/**
 * Área de administração: apuração do sorteio, dono de um número e ficha de
 * um CPF. Protegida pela senha ADMIN_SENHA (lib/admin.ts); cada rota de
 * /api/admin confere a sessão. Mostra dados pessoais completos — não
 * compartilhar a tela nem a senha.
 */

type Ganhador = {
  numero: string;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cadastradoEm: string | null;
  pedido: { id: string; loja: string | null; compradoEm: string | null; status: string | null };
  criterio?: string;
};

type Ficha = {
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cadastradoEm: string | null;
  aceitaComunicacoes: boolean;
  numeros: Array<{ numero: string; pedido: string; anulado: boolean }>;
  pedidos: Array<{ id: string; loja: string | null; compradoEm: string | null; status: string | null; numeros: number; cancelado: boolean }>;
};

type Aba = "apuracao" | "numero" | "cpf";

async function chamar<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; mensagem?: string } & T> {
  try {
    const resposta = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    return await resposta.json();
  } catch {
    return { ok: false, mensagem: "Falha de conexão." } as { ok: boolean; mensagem?: string } & T;
  }
}

/** Data de apuração do regulamento mais recente até hoje (ou a primeira). */
function sorteioMaisRecente(): string {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const passadas = campaign.apuracao.datas.filter((d) => d <= hoje);
  return passadas[passadas.length - 1] ?? campaign.apuracao.datas[0];
}

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const nascimento = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default function Admin() {
  const [logado, setLogado] = useState<boolean | null>(null);
  const [aba, setAba] = useState<Aba>("apuracao");

  useEffect(() => {
    chamar<object>("/api/admin/login").then((r) => setLogado(r.ok));
  }, []);

  async function sair() {
    await chamar<object>("/api/admin/sair", { method: "POST" });
    setLogado(false);
  }

  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <BrandLockup className="text-sm" />
          <span className="text-[11px] font-black uppercase tracking-label text-steel">Administração</span>
          {logado && (
            <button
              type="button"
              onClick={sair}
              className="ml-auto text-[11px] font-black uppercase tracking-label text-steel transition-colors hover:text-navy"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {logado === null && <p className="text-sm text-ink/60">Carregando…</p>}
        {logado === false && <Login onEntrar={() => setLogado(true)} />}
        {logado && (
          <>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-1 text-xs">
              {(
                [
                  ["apuracao", "Apuração"],
                  ["numero", "Buscar número"],
                  ["cpf", "Buscar CPF"],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setAba(valor)}
                  aria-pressed={aba === valor}
                  className={`rounded-full px-4 py-2 font-black uppercase tracking-label transition-colors ${
                    aba === valor ? "bg-navy text-white" : "text-ink/55 hover:text-navy"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {aba === "apuracao" && <Apuracao onSessaoExpirada={() => setLogado(false)} />}
            {aba === "numero" && <BuscarNumero onSessaoExpirada={() => setLogado(false)} />}
            {aba === "cpf" && <BuscarCpf onSessaoExpirada={() => setLogado(false)} />}
          </>
        )}
      </main>
    </>
  );
}

function Login({ onEntrar }: { onEntrar: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const r = await chamar<object>("/api/admin/login", { method: "POST", body: JSON.stringify({ senha }) });
    setCarregando(false);
    if (r.ok) onEntrar();
    else setErro(r.mensagem ?? "Não foi possível entrar.");
  }

  return (
    <form onSubmit={entrar} className="card mx-auto max-w-md space-y-5 p-6 sm:p-8" noValidate>
      <h1 className="text-xl font-black uppercase tracking-headline">Entrar</h1>
      <Field id="senha-admin" label="Senha da administração" error={erro}>
        <Input
          id="senha-admin"
          type="password"
          autoComplete="current-password"
          value={senha}
          error={erro}
          onChange={(e) => setSenha(e.target.value)}
        />
      </Field>
      <button type="submit" disabled={carregando} className="btn-primary w-full">
        {carregando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

function Erro({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-6 rounded-xl bg-alert/8 px-5 py-4 text-sm font-medium text-alert">
      {children}
    </p>
  );
}

function Apuracao({ onSessaoExpirada }: { onSessaoExpirada: () => void }) {
  const [dataSorteio, setDataSorteio] = useState(sorteioMaisRecente);
  const [concurso, setConcurso] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [serie, setSerie] = useState("");
  const [premios, setPremios] = useState(["", "", "", "", ""]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{
    serie: number;
    referencias: string[];
    ganhadores: Ganhador[];
    incompleto: boolean;
  } | null>(null);

  async function buscarNaCaixa() {
    setBuscando(true);
    setErro("");
    setConcurso("");
    const r = await chamar<{ resultado: { concurso: number; data: string; premios: string[] } }>(
      `/api/admin/loteria?data=${dataSorteio}`
    );
    setBuscando(false);
    if (r.ok) {
      setPremios(r.resultado.premios);
      setConcurso(`Concurso ${r.resultado.concurso} da Loteria Federal, de ${nascimento(r.resultado.data)} — confira com o site da Caixa.`);
    } else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível buscar na Caixa.");
  }

  async function apurar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const r = await chamar<{ resultado: NonNullable<typeof resultado> }>("/api/admin/apuracao", {
      method: "POST",
      body: JSON.stringify({ serie: Number(serie), premios }),
    });
    setCarregando(false);
    if (r.ok) setResultado(r.resultado);
    else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível apurar.");
  }

  return (
    <section className="mt-8">
      <form onSubmit={apurar} className="card space-y-5 p-6 sm:p-8" noValidate>
        <p className="text-sm leading-relaxed text-ink/70">
          Escolha a data do sorteio e busque os 5 prêmios na Caixa (ou digite à mão) e informe a
          série contemplada, conforme a regra do regulamento. A busca segue a cláusula 7: 1º e 2º
          prêmios, depois 3º a 5º e, faltando ganhador, a aproximação superior ao 1º prêmio.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field id="data-sorteio" label="Data do sorteio">
            <Input
              id="data-sorteio"
              type="date"
              value={dataSorteio}
              onChange={(e) => setDataSorteio(e.target.value)}
              className="max-w-[12rem]"
            />
          </Field>
          <button type="button" onClick={buscarNaCaixa} disabled={buscando || !dataSorteio} className="btn-secondary">
            {buscando ? "Buscando…" : "Buscar na Caixa"}
          </button>
        </div>
        {concurso && (
          <p role="status" className="rounded-xl bg-sky/15 px-4 py-3 text-sm text-ink/80">
            {concurso}
          </p>
        )}
        <Field id="serie-apuracao" label="Série contemplada (0 a 9)">
          <Input
            id="serie-apuracao"
            inputMode="numeric"
            maxLength={1}
            value={serie}
            onChange={(e) => setSerie(e.target.value.replace(/\D/g, ""))}
            className="max-w-[6rem]"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-5">
          {premios.map((valor, i) => (
            <Field key={i} id={`premio-${i}`} label={`${i + 1}º prêmio`}>
              <Input
                id={`premio-${i}`}
                inputMode="numeric"
                maxLength={6}
                value={valor}
                placeholder="059074"
                onChange={(e) =>
                  setPremios((atuais) => atuais.map((p, j) => (j === i ? e.target.value.replace(/\D/g, "") : p)))
                }
              />
            </Field>
          ))}
        </div>
        <button type="submit" disabled={carregando} className="btn-primary">
          {carregando ? "Apurando…" : "Apurar"}
        </button>
      </form>

      {erro && <Erro>{erro}</Erro>}

      {resultado && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ink/70">
            Série {resultado.serie} · números de referência {resultado.referencias.join(", ")}
          </p>
          {resultado.ganhadores.map((g, i) => (
            <CartaoGanhador key={g.numero} titulo={`${i + 1}º ganhador`} ganhador={g} />
          ))}
          {resultado.incompleto && (
            <Erro>
              {resultado.ganhadores.length === 0
                ? "Nenhum número desta série tem dono. Pelo regulamento, vale o resultado da Loteria Federal do sábado seguinte."
                : "Não há números suficientes nesta série para todos os ganhadores. Pelo regulamento, vale o resultado da Loteria Federal do sábado seguinte para o restante."}
            </Erro>
          )}
          <p className="text-xs leading-relaxed text-ink/50">
            Resultado de apoio: confira com o regulamento e registre a apuração oficial antes de
            contatar e divulgar os ganhadores.
          </p>
        </div>
      )}
    </section>
  );
}

function BuscarNumero({ onSessaoExpirada }: { onSessaoExpirada: () => void }) {
  const [serie, setSerie] = useState("");
  const [numero, setNumero] = useState("");
  const [erro, setErro] = useState("");
  const [dono, setDono] = useState<Ganhador | null | undefined>(undefined);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const r = await chamar<{ dono: Ganhador | null }>(
      `/api/admin/numero?serie=${encodeURIComponent(serie)}&numero=${encodeURIComponent(numero)}`
    );
    if (r.ok) setDono(r.dono);
    else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível buscar.");
  }

  return (
    <section className="mt-8">
      <form onSubmit={buscar} className="card flex flex-wrap items-end gap-4 p-6 sm:p-8" noValidate>
        <Field id="serie-busca" label="Série">
          <Input
            id="serie-busca"
            inputMode="numeric"
            maxLength={1}
            value={serie}
            onChange={(e) => setSerie(e.target.value.replace(/\D/g, ""))}
            className="max-w-[5rem]"
          />
        </Field>
        <Field id="numero-busca" label="Número (5 dígitos)">
          <Input
            id="numero-busca"
            inputMode="numeric"
            maxLength={5}
            value={numero}
            placeholder="48213"
            onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
            className="max-w-[9rem]"
          />
        </Field>
        <button type="submit" className="btn-primary">
          Buscar
        </button>
      </form>
      {erro && <Erro>{erro}</Erro>}
      {dono === null && <Erro>Este número ainda não foi emitido (ou foi anulado por cancelamento).</Erro>}
      {dono && (
        <div className="mt-8">
          <CartaoGanhador titulo="Dono do número" ganhador={dono} />
        </div>
      )}
    </section>
  );
}

function BuscarCpf({ onSessaoExpirada }: { onSessaoExpirada: () => void }) {
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [ficha, setFicha] = useState<Ficha | null | undefined>(undefined);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const r = await chamar<{ ficha: Ficha | null }>(`/api/admin/cpf?cpf=${encodeURIComponent(cpf)}`);
    if (r.ok) setFicha(r.ficha);
    else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível buscar.");
  }

  return (
    <section className="mt-8">
      <form onSubmit={buscar} className="card flex flex-wrap items-end gap-4 p-6 sm:p-8" noValidate>
        <Field id="cpf-busca" label="CPF">
          <Input
            id="cpf-busca"
            inputMode="numeric"
            maxLength={14}
            value={cpf}
            placeholder="000.000.000-00"
            onChange={(e) => setCpf(formatCPF(e.target.value))}
          />
        </Field>
        <button type="submit" className="btn-primary">
          Buscar
        </button>
      </form>
      {erro && <Erro>{erro}</Erro>}
      {ficha === null && <Erro>Nenhum participante com este CPF.</Erro>}
      {ficha && (
        <div className="card mt-8 space-y-6 p-6 sm:p-8">
          <Contato
            nome={ficha.nome}
            cpf={ficha.cpf}
            email={ficha.email}
            telefone={ficha.telefone}
            nascimento={ficha.nascimento}
            cadastradoEm={ficha.cadastradoEm}
          />
          <p className="text-sm text-ink/70">
            Aceita comunicações de marketing: <strong>{ficha.aceitaComunicacoes ? "sim" : "não"}</strong>
          </p>
          <div>
            <h3 className="text-sm font-black uppercase tracking-label">Pedidos</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink/75">
              {ficha.pedidos.length === 0 && <li>Nenhum pedido com produto participante.</li>}
              {ficha.pedidos.map((p) => (
                <li key={p.id} className={p.cancelado ? "line-through opacity-60" : undefined}>
                  Pedido {p.id} · {p.loja ?? "loja não informada"} · {data(p.compradoEm)} · {p.numeros} números
                  {p.status ? ` · ${p.status}` : ""}
                  {p.cancelado ? " · cancelado" : ""}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-label">
              Números ({ficha.numeros.filter((n) => !n.anulado).length} válidos)
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ficha.numeros.map((n) => (
                <li
                  key={n.numero}
                  title={`Pedido ${n.pedido}${n.anulado ? " — anulado" : ""}`}
                  className={`rounded-lg px-3 py-1.5 font-mono text-xs font-black ${
                    n.anulado ? "bg-line text-ink/40 line-through" : "bg-navy text-white"
                  }`}
                >
                  {n.numero}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function CartaoGanhador({ titulo, ganhador }: { titulo: string; ganhador: Ganhador }) {
  return (
    <article className="card space-y-4 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-label text-steel">{titulo}</p>
        <p className="font-mono text-lg font-black text-navy">
          série {ganhador.numero.split("-")[0]} · {ganhador.numero.split("-")[1]}
        </p>
      </div>
      {ganhador.criterio && <p className="text-sm text-ink/70">{ganhador.criterio}</p>}
      <Contato
        nome={ganhador.nome}
        cpf={ganhador.cpf}
        email={ganhador.email}
        telefone={ganhador.telefone}
        nascimento={ganhador.nascimento}
        cadastradoEm={ganhador.cadastradoEm}
      />
      <p className="text-sm text-ink/70">
        Compra: pedido {ganhador.pedido.id} · {ganhador.pedido.loja ?? "loja não informada"} ·{" "}
        {data(ganhador.pedido.compradoEm)}
        {ganhador.pedido.status ? ` · ${ganhador.pedido.status}` : ""}
      </p>
    </article>
  );
}

function Contato(p: {
  nome: string | null;
  cpf: string;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cadastradoEm: string | null;
}) {
  const whatsapp = p.telefone ? `https://wa.me/55${p.telefone}` : null;
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <Item rotulo="Nome">{p.nome ?? "—"}</Item>
      <Item rotulo="CPF">{formatCPF(p.cpf)}</Item>
      <Item rotulo="E-mail">
        {p.email ? (
          <a href={`mailto:${p.email}`} className="font-black text-navy underline underline-offset-2">
            {p.email}
          </a>
        ) : (
          "—"
        )}
      </Item>
      <Item rotulo="Celular">
        {p.telefone ? (
          <>
            {formatPhone(p.telefone)}{" "}
            <a href={whatsapp!} target="_blank" rel="noopener" className="font-black text-navy underline underline-offset-2">
              WhatsApp
            </a>
          </>
        ) : (
          "—"
        )}
      </Item>
      <Item rotulo="Nascimento">{nascimento(p.nascimento)}</Item>
      <Item rotulo="Cadastro no site">{data(p.cadastradoEm)}</Item>
    </dl>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-label text-steel">{rotulo}</dt>
      <dd className="mt-1 font-medium text-ink/85">{children}</dd>
    </div>
  );
}
