"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import BrandLockup from "@/components/BrandLockup";
import { Field, Input } from "@/components/ui/Field";
import { campaign } from "@/lib/campaign";
import { CATALOGO } from "@/lib/catalogo";
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
  cidade: string | null;
  uf: string | null;
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
  cidade: string | null;
  uf: string | null;
  cadastradoEm: string | null;
  aceitaComunicacoes: boolean;
  numeros: Array<{ numero: string; pedido: string; anulado: boolean }>;
  pedidos: Array<{
    id: string;
    loja: string | null;
    compradoEm: string | null;
    status: string | null;
    numeros: number;
    cancelado: boolean;
    lancadoPor: string | null;
  }>;
};

type Aba = "apuracao" | "numero" | "cpf" | "diagnostico" | "relatorio";

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
  const expirou = useCallback(() => setLogado(false), []);

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
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-white p-1 text-xs">
              {(
                [
                  ["apuracao", "Apuração"],
                  ["numero", "Buscar número"],
                  ["cpf", "Buscar CPF"],
                  ["diagnostico", "Diagnóstico"],
                  ["relatorio", "Relatório"],
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
            {aba === "diagnostico" && <Diagnostico onSessaoExpirada={expirou} />}
            {aba === "relatorio" && <Relatorio onSessaoExpirada={expirou} />}
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
  const [compras, setCompras] = useState<string | null>(null);

  async function buscar(e?: FormEvent) {
    e?.preventDefault();
    setErro("");
    const r = await chamar<{ ficha: Ficha | null; compras: string | null }>(`/api/admin/cpf?cpf=${encodeURIComponent(cpf)}`);
    if (r.ok) {
      setFicha(r.ficha);
      setCompras(r.compras);
    }
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
      {ficha && !ficha.cadastradoEm && (
        <Erro>Este CPF ainda não se cadastrou em Meus Números: as compras só viram números depois do cadastro.</Erro>
      )}
      {compras === "indisponivel" && (
        <Erro>Não foi possível consultar a IOTA agora — a ficha mostra o que já estava no banco. Veja a aba Diagnóstico.</Erro>
      )}
      {ficha && (
        <div className="card mt-8 space-y-6 p-6 sm:p-8">
          <Contato
            nome={ficha.nome}
            cpf={ficha.cpf}
            email={ficha.email}
            telefone={ficha.telefone}
            nascimento={ficha.nascimento}
            cidade={ficha.cidade}
            uf={ficha.uf}
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
                  Pedido {p.id} · {p.loja ?? "loja não informada"} · {data(p.compradoEm)} · {p.numeros} {p.numeros === 1 ? "número" : "números"}
                  {p.status ? ` · ${p.status}` : ""}
                  {p.cancelado ? " · cancelado" : ""}
                  {p.lancadoPor ? ` · lançado à mão por ${p.lancadoPor}` : ""}
                  {!p.cancelado && (
                    <BotaoAnular cpf={ficha.cpf} pedido={p.id} onFeito={() => buscar()} onSessaoExpirada={onSessaoExpirada} />
                  )}
                </li>
              ))}
            </ul>
          </div>
          {ficha.cadastradoEm && (
            <LancamentoManual key={ficha.cpf} cpf={ficha.cpf} onFeito={() => buscar()} onSessaoExpirada={onSessaoExpirada} />
          )}
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

type DiagnosticoIota = {
  ok: boolean;
  resumo: string;
  explicacao: string;
  mensagemIota: string | null;
  pedidos: Array<{
    id: string;
    status: string | null;
    situacao: string;
    loja: string | null;
    criadoEm: string;
    itens: Array<{ sku: string; nome: string | null; quantidade: number; daCampanha: boolean; aConfirmar: boolean }>;
  }>;
};

type EstadoVigia = { ok: boolean; detalhe: string; verificadoEm: string; mudouEm: string };

const SITUACAO: Record<string, string> = {
  valido: "gera números",
  cancelado: "cancelado — anula números",
  pendente: "em andamento — aguardando",
  desconhecido: "status desconhecido",
};

function Diagnostico({ onSessaoExpirada }: { onSessaoExpirada: () => void }) {
  const [vigia, setVigia] = useState<EstadoVigia | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [diag, setDiag] = useState<DiagnosticoIota | null>(null);

  useEffect(() => {
    chamar<{ vigia: EstadoVigia | null }>("/api/admin/diagnostico").then((r) => {
      if (r.ok) setVigia(r.vigia);
      else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    });
  }, [onSessaoExpirada]);

  async function verificarAgora() {
    setVerificando(true);
    const r = await chamar<{ vigia: EstadoVigia }>("/api/admin/diagnostico", { method: "POST" });
    setVerificando(false);
    if (r.ok) setVigia(r.vigia);
    else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
  }

  async function diagnosticar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const r = await chamar<{ diagnostico: DiagnosticoIota }>(`/api/admin/diagnostico?cpf=${encodeURIComponent(cpf)}`);
    setCarregando(false);
    if (r.ok) setDiag(r.diagnostico);
    else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível consultar.");
  }

  return (
    <section className="mt-8 space-y-8">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-black uppercase tracking-label">Vigia da integração (a cada 15 min)</h2>
          <button type="button" onClick={verificarAgora} disabled={verificando} className="btn-secondary">
            {verificando ? "Verificando…" : "Verificar agora"}
          </button>
        </div>
        {vigia ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className={`font-black ${vigia.ok ? "text-navy" : "text-alert"}`}>
              {vigia.ok ? "✅ Funcionando" : "🔴 Com problema"}
            </p>
            <p className="leading-relaxed text-ink/75">{vigia.detalhe}</p>
            <p className="text-xs text-ink/50">
              Última verificação: {data(vigia.verificadoEm)} · neste estado desde {data(vigia.mudouEm)}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink/60">Ainda não houve verificação. Clique em &quot;Verificar agora&quot;.</p>
        )}
      </div>

      <form onSubmit={diagnosticar} className="card flex flex-wrap items-end gap-4 p-6 sm:p-8" noValidate>
        <p className="w-full text-sm leading-relaxed text-ink/70">
          Cliente reclamou que a compra não apareceu? Digite o CPF para ver exatamente o que a IOTA
          devolve, e o porquê.
        </p>
        <Field id="cpf-diag" label="CPF">
          <Input
            id="cpf-diag"
            inputMode="numeric"
            maxLength={14}
            value={cpf}
            placeholder="000.000.000-00"
            onChange={(e) => setCpf(formatCPF(e.target.value))}
          />
        </Field>
        <button type="submit" disabled={carregando} className="btn-primary">
          {carregando ? "Consultando…" : "Consultar IOTA"}
        </button>
      </form>

      {erro && <Erro>{erro}</Erro>}

      {diag && (
        <div className="card space-y-4 p-6 sm:p-8">
          <p className={`font-black ${diag.ok ? "text-navy" : "text-alert"}`}>
            {diag.ok ? "✅ " : "🔴 "}
            {diag.resumo}
          </p>
          <p className="text-sm leading-relaxed text-ink/75">{diag.explicacao}</p>
          <p className="text-xs text-ink/50">Resposta da IOTA: {diag.mensagemIota ?? "—"}</p>
          {diag.pedidos.length > 0 && (
            <ul className="space-y-3 text-sm text-ink/75">
              {diag.pedidos.map((p) => (
                <li key={p.id} className="rounded-xl border border-line p-4">
                  <p className="font-black text-navy">
                    Pedido {p.id} · {p.loja ?? "loja não informada"} · {data(p.criadoEm)}
                  </p>
                  <p className="mt-1">
                    Status: {p.status ?? "—"} ({SITUACAO[p.situacao] ?? p.situacao})
                  </p>
                  <ul className="mt-1">
                    {p.itens.map((i, k) => (
                      <li key={k}>
                        {i.daCampanha ? "✅" : i.aConfirmar ? "⏳" : "▫️"} {i.sku} × {i.quantidade} {i.nome ?? ""}
                        {i.daCampanha
                          ? ""
                          : i.aConfirmar
                            ? " (kit sem composição cadastrada — o pedido inteiro espera)"
                            : " (não é da campanha)"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

type ResumoRelatorio = {
  cadastrados: number;
  comNumeros: number;
  numerosValidos: number;
  numerosAnulados: number;
  pedidos: number;
  pedidosCancelados: number;
  nuncaAtualizados: number;
};

type LinhaRelatorio = {
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  cadastradoEm: string | null;
  sincronizadoEm: string | null;
  pedidos: number;
  numeros: number;
};

type Lote = { consultados: number; comNumerosNovos: number; numerosNovos: number; numerosAnulados: number; falhas: number; restantes: number };

function Relatorio({ onSessaoExpirada }: { onSessaoExpirada: () => void }) {
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "sem-numeros">("todos");
  const [atualizando, setAtualizando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    const r = await chamar<{ resumo: ResumoRelatorio; participantes: LinhaRelatorio[] }>("/api/admin/relatorio");
    if (r.ok) {
      setResumo(r.resumo);
      setLinhas(r.participantes);
    } else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível carregar o relatório.");
  }, [onSessaoExpirada]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Vai em lotes de 150 até não sobrar ninguém, mostrando o andamento. */
  async function atualizarTodos() {
    setAtualizando(true);
    setErro("");
    const desde = new Date().toISOString();
    let total = { consultados: 0, numerosNovos: 0, comNumerosNovos: 0, numerosAnulados: 0, falhas: 0 };
    for (let volta = 0; volta < 100; volta++) {
      const r = await chamar<{ lote: Lote }>("/api/admin/relatorio", { method: "POST", body: JSON.stringify({ desde }) });
      if (!r.ok) {
        if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
        else setErro(r.mensagem ?? "A atualização parou no meio. Clique de novo para continuar.");
        break;
      }
      total = {
        consultados: total.consultados + r.lote.consultados,
        numerosNovos: total.numerosNovos + r.lote.numerosNovos,
        comNumerosNovos: total.comNumerosNovos + r.lote.comNumerosNovos,
        numerosAnulados: total.numerosAnulados + r.lote.numerosAnulados,
        falhas: total.falhas + r.lote.falhas,
      };
      setProgresso(
        `${total.consultados} consultados · ${total.numerosNovos} números novos para ${total.comNumerosNovos} pessoas` +
          (total.numerosAnulados ? ` · ${total.numerosAnulados} anulados por cancelamento` : "") +
          (total.falhas ? ` · ${total.falhas} sem resposta da IOTA` : "") +
          (r.lote.restantes > 0 ? ` · faltam ${r.lote.restantes}…` : " · concluído")
      );
      if (r.lote.restantes === 0 || r.lote.consultados === 0) break;
    }
    setAtualizando(false);
    carregar();
  }

  const visiveis = filtro === "sem-numeros" ? linhas.filter((l) => l.numeros === 0) : linhas;

  return (
    <section className="mt-8 space-y-8">
      {resumo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Cadastrados", resumo.cadastrados],
              ["Com números", resumo.comNumeros],
              ["Números válidos", resumo.numerosValidos],
              ["Pedidos", resumo.pedidos],
              ["Sem números", resumo.cadastrados - resumo.comNumeros],
              ["Nunca atualizados", resumo.nuncaAtualizados],
              ["Pedidos cancelados", resumo.pedidosCancelados],
              ["Números anulados", resumo.numerosAnulados],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo} className="card p-4">
              <p className="text-[10px] font-black uppercase tracking-label text-steel">{rotulo}</p>
              <p className="mt-1 text-2xl font-black text-navy">{valor.toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-4 p-6 sm:p-8">
        <p className="text-sm leading-relaxed text-ink/70">
          Busca na IOTA as compras de <strong>todos os cadastrados</strong>, mesmo de quem não voltou ao
          site. O vigia já faz isso aos poucos a cada 15 minutos; use o botão para atualizar todo mundo
          agora. Quem comprou e não se cadastrou não aparece aqui — só num relatório de vendas da Nexaas.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={atualizarTodos} disabled={atualizando} className="btn-primary">
            {atualizando ? "Atualizando…" : "Atualizar compras de todos"}
          </button>
          <a href="/api/admin/relatorio/csv" className="btn-secondary">
            Baixar planilha (CSV)
          </a>
        </div>
        {progresso && (
          <p role="status" className="rounded-xl bg-sky/15 px-4 py-3 text-sm text-ink/80">
            {progresso}
          </p>
        )}
      </div>

      {erro && <Erro>{erro}</Erro>}

      <div className="card overflow-x-auto p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
          {(
            [
              ["todos", `Todos (${linhas.length})`],
              ["sem-numeros", `Sem números (${linhas.filter((l) => l.numeros === 0).length})`],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
              className={`rounded-full px-3 py-1.5 font-black uppercase tracking-label ${
                filtro === valor ? "bg-navy text-white" : "text-ink/55 hover:text-navy"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-[10px] font-black uppercase tracking-label text-steel">
            <tr>
              <th className="py-2 pr-3">Nome</th>
              <th className="py-2 pr-3">CPF</th>
              <th className="py-2 pr-3">Cidade</th>
              <th className="py-2 pr-3 text-right">Pedidos</th>
              <th className="py-2 pr-3 text-right">Números</th>
              <th className="py-2">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink/80">
            {visiveis.slice(0, 500).map((l) => (
              <tr key={l.cpf}>
                <td className="py-2 pr-3">{l.nome ?? "—"}</td>
                <td className="py-2 pr-3 font-mono text-xs">{formatCPF(l.cpf)}</td>
                <td className="py-2 pr-3">{l.cidade ? `${l.cidade}/${l.uf}` : "—"}</td>
                <td className="py-2 pr-3 text-right">{l.pedidos}</td>
                <td className={`py-2 pr-3 text-right font-black ${l.numeros === 0 ? "text-alert" : "text-navy"}`}>{l.numeros}</td>
                <td className="py-2 text-xs text-ink/55">{data(l.sincronizadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visiveis.length > 500 && (
          <p className="mt-3 text-xs text-ink/55">Mostrando 500 de {visiveis.length}. A planilha tem todos.</p>
        )}
      </div>
    </section>
  );
}

/** Nome de quem está operando o admin, lembrado só neste navegador. */
function useOperador(): [string, (v: string) => void] {
  const [operador, setOperador] = useState("");
  useEffect(() => {
    try {
      setOperador(localStorage.getItem("futi-admin-operador") ?? "");
    } catch {}
  }, []);
  const salvar = (v: string) => {
    setOperador(v);
    try {
      localStorage.setItem("futi-admin-operador", v);
    } catch {}
  };
  return [operador, salvar];
}

function LancamentoManual({
  cpf,
  onFeito,
  onSessaoExpirada,
}: {
  cpf: string;
  onFeito: () => void;
  onSessaoExpirada: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [operador, setOperador] = useOperador();
  const [pedido, setPedido] = useState("");
  const [chave, setChave] = useState("");
  const [dataCompra, setDataCompra] = useState("");
  const [loja, setLoja] = useState("");
  const [itens, setItens] = useState([{ sku: CATALOGO[0].sku, quantidade: 1 }]);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function lancar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setEnviando(true);
    const r = await chamar<{ numeros: Array<{ numero: string }>; excedente: number }>("/api/admin/manual", {
      method: "POST",
      body: JSON.stringify({ cpf, pedido, chaveNfce: chave, data: dataCompra, loja, itens, operador, observacao }),
    });
    setEnviando(false);
    if (r.ok) {
      setSucesso(
        `${r.numeros.length} número(s) gerado(s): ${r.numeros.map((n) => n.numero).join(", ") || "—"}` +
          (r.excedente ? ` · ${r.excedente} não gerado(s) por causa do limite de 200 por CPF` : "")
      );
      setPedido("");
      setChave("");
      setObservacao("");
      setItens([{ sku: CATALOGO[0].sku, quantidade: 1 }]);
      setAberto(false);
      onFeito();
    } else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível lançar.");
  }

  if (!aberto) {
    return (
      <div className="space-y-3">
        {sucesso && (
          <p role="status" className="rounded-xl bg-sky/15 px-4 py-3 text-sm text-ink/80">
            ✅ {sucesso}
          </p>
        )}
        <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
          + Lançar compra manualmente
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={lancar} className="space-y-4 rounded-2xl border border-line p-5" noValidate>
      <h3 className="text-sm font-black uppercase tracking-label">Lançar compra manualmente</h3>
      <p className="text-xs leading-relaxed text-ink/60">
        Para venda feita sem o CPF no caixa (&quot;Consumidor: não identificado&quot;). Confira o cupom
        que o cliente enviou: número do pedido, data, produtos e chave da NFC-e. O mesmo pedido nunca gera
        números duas vezes.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="man-pedido"
          label="Nº do PEDIDO Nexaas"
          hint='Topo do cupom: "PEDIDO: 4808933" (7 dígitos). Não é o número da NFC-e.'
        >
          <Input id="man-pedido" inputMode="numeric" value={pedido} hasHint onChange={(e) => setPedido(e.target.value)} placeholder="4808933" />
        </Field>
        <Field id="man-data" label="Data da compra">
          <Input id="man-data" type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
        </Field>
        <Field
          id="man-chave"
          label="Chave da NFC-e ou link do QR Code"
          hint="Confere se a nota é da Biscoitê e do mês da compra."
        >
          <Input
            id="man-chave"
            value={chave}
            hasHint
            onChange={(e) => setChave(e.target.value)}
            placeholder="Cole a chave (44 dígitos) ou o link do QR Code"
          />
        </Field>
        <LerQrCode onLido={setChave} />
        <Field id="man-loja" label="Loja">
          <Input id="man-loja" value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="BISCOITE TRAILER" />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-label text-steel">Produtos do cupom</p>
        {itens.map((item, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={item.sku}
              onChange={(e) => setItens((atual) => atual.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))}
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
            >
              {CATALOGO.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.nome}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.quantidade}
              onChange={(e) => setItens((atual) => atual.map((x, j) => (j === i ? { ...x, quantidade: Number(e.target.value) } : x)))}
              aria-label="Quantidade"
              className="w-20 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
            />
            {itens.length > 1 && (
              <button type="button" onClick={() => setItens((atual) => atual.filter((_, j) => j !== i))} className="text-xs font-black text-alert">
                remover
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItens((atual) => [...atual, { sku: CATALOGO[0].sku, quantidade: 1 }])}
          className="text-xs font-black uppercase tracking-label text-steel hover:text-navy"
        >
          + outro produto
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="man-operador" label="Seu nome (quem está lançando)">
          <Input id="man-operador" value={operador} onChange={(e) => setOperador(e.target.value)} />
        </Field>
        <Field id="man-obs" label="Observação">
          <Input id="man-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Cupom recebido pelo WhatsApp" />
        </Field>
      </div>

      {erro && <Erro>{erro}</Erro>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={enviando} className="btn-primary">
          {enviando ? "Lançando…" : "Lançar e gerar números"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}

type DetectorDeCodigo = { detect(fonte: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };

/**
 * Lê o QR Code do cupom pela câmera, nos navegadores que têm BarcodeDetector
 * (Chrome no Android, por exemplo). Onde não tem, o botão nem aparece — dá
 * para colar o link do QR Code no campo.
 */
function LerQrCode({ onLido }: { onLido: (texto: string) => void }) {
  const [suportado, setSuportado] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSuportado("BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!lendo) return;
    let ativo = true;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => DetectorDeCodigo }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        while (ativo) {
          const [codigo] = await detector.detect(video).catch(() => []);
          if (codigo?.rawValue) {
            onLido(codigo.rawValue);
            setLendo(false);
            break;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        setErro("Não foi possível abrir a câmera. Cole o link do QR Code no campo.");
        setLendo(false);
      }
    })();
    return () => {
      ativo = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [lendo, onLido]);

  if (!suportado) return null;
  return (
    <div className="sm:col-span-2">
      {lendo ? (
        <div className="space-y-2">
          <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-xl" />
          <button type="button" onClick={() => setLendo(false)} className="btn-secondary">
            Fechar câmera
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => { setErro(""); setLendo(true); }} className="btn-secondary">
          📷 Ler QR Code do cupom
        </button>
      )}
      {erro && <p className="mt-2 text-xs text-alert">{erro}</p>}
    </div>
  );
}

function BotaoAnular({
  cpf,
  pedido,
  onFeito,
  onSessaoExpirada,
}: {
  cpf: string;
  pedido: string;
  onFeito: () => void;
  onSessaoExpirada: () => void;
}) {
  const [operador] = useOperador();
  const [erro, setErro] = useState("");

  async function anular() {
    const motivo = window.prompt(
      `Anular os números do pedido ${pedido}? Eles saem da conta do cliente e do sorteio (não dá para desfazer).\n\nMotivo:`
    );
    if (motivo === null) return;
    const quem = operador || window.prompt("Seu nome (quem está anulando):") || "";
    const r = await chamar<{ anulados: number }>("/api/admin/manual/anular", {
      method: "POST",
      body: JSON.stringify({ cpf, pedido, operador: quem, observacao: motivo }),
    });
    if (r.ok) onFeito();
    else if (r.mensagem?.startsWith("Sessão")) onSessaoExpirada();
    else setErro(r.mensagem ?? "Não foi possível anular.");
  }

  return (
    <>
      <button type="button" onClick={anular} className="ml-2 text-xs font-black uppercase tracking-label text-alert no-underline">
        anular
      </button>
      {erro && <span className="ml-2 text-xs text-alert">{erro}</span>}
    </>
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
        cidade={ganhador.cidade}
        uf={ganhador.uf}
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
  cidade: string | null;
  uf: string | null;
  cadastradoEm: string | null;
}) {
  const whatsapp = p.telefone ? `https://wa.me/55${p.telefone}` : null;
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <Item rotulo="Nome">{p.nome ?? "—"}</Item>
      <Item rotulo="CPF">{formatCPF(p.cpf)}</Item>
      <Item rotulo="Cidade">{p.cidade ? `${p.cidade}/${p.uf}` : "—"}</Item>
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
