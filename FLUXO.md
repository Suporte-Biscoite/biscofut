# Fluxo de cadastro e validação — Promoção Futi

Documento técnico do fluxo implementado nesta landing page.

O briefing registra que o protocolo na SPA/MF exige, entre outros itens, **a
descrição detalhada do fluxo de cadastro e validação na Landing Page** e
**print/descrição visual da mesma**. Este arquivo é a fonte para essa parte da
documentação: o que está aqui descreve exatamente o que o código faz.

> **Mudança de mecânica (29/09/2026).** O cadastro de nota fiscal saiu. A
> participação agora é só por CPF: o cliente informa o CPF no caixa, se
> cadastra uma vez em `/meus-numeros` e os números das compras chegam pela
> API da IOTA — ver **§3.5**, que é a descrição vigente. As seções 1 a 3 e 5
> ainda descrevem o fluxo antigo de nota fiscal e precisam ser reescritas
> antes do protocolo.

---

## 1. Arquitetura em uma tela

```
┌─────────────────────────────────────────────────────────────────────┐
│  LANDING PAGE (Next.js App Router)                                  │
│                                                                     │
│  /                    seções institucionais + fluxo de participação │
│  /regulamento         documento legal (rota própria)                │
│  /politica-privacidade                                              │
│  /termos-de-uso                                                     │
│  /meus-numeros        consulta por CPF + e-mail (canais 1 e 2)      │
│                                                                     │
│  Interruptor mestre: lib/promoStatus.ts                             │
│    PRE_LAUNCH ──> página institucional, ZERO transação              │
│    ACTIVE     ──> fluxo completo (só com nº de CA registrado)        │
└──────────────┬──────────────────────────────────┬────────────────────┘
              │  POST /api/participacao          │  POST (webhook) da Nexaas
              │  (canal 1: nota fiscal manual)   │  /api/webhooks/nexaas
              ▼                                  │  (canal 2: compra na loja)
┌─────────────────────────────────────────────┐  ▼
│  VALIDAÇÃO NO SERVIDOR                       │  ┌───────────────────────────┐
│  (app/api/participacao/route.ts)             │  │ app/api/webhooks/nexaas   │
│                                               │  │                           │
│  0. autorização  ── sem CA -> 503             │  │ 0. assinatura HMAC        │
│  1. participante ── nome, CPF, idade ≥ 18,     │  │ 1. status pago? senão 200 │
│                     e-mail, telefone com DDD  │  │    (ignora, sem reenvio)  │
│  2. consentimentos ── regulamento +           │  │ 2. autorização (§0 igual) │
│                       privacidade obrigatórios │  │ 3. pedido já processado? │
│  3. nota fiscal  ── chave de 44 dígitos + DV,  │  │ 4. CPF do comprador       │
│                     emissão na vigência,       │  │ 5. SKU Nexaas -> produto  │
│                     produto participante,      │  │ 6. teto por CPF           │
│                     imagem anexada             │  │ 7. emissão                │
│  4. unicidade    ── chave já usada? -> 409     │  └───────────────────────────┘
│  5. teto por CPF ── aplica limite               │
│  6. emissão      ── série sequencial única      │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
         ambos gravam em lib/store.ts (participante por CPF,
         compartilhado entre os dois canais — ver §3.5)
```

---

## 2. Os dois estados da página, e por que existem

A dependência legal do briefing — "a campanha não pode ser iniciada sem
autorização prévia da SPA" — não é satisfeita escondendo o botão. Se o
endpoint existe e responde, a campanha começou.

Por isso `transactionsAllowed()` exige **duas** condições:

```ts
status === "ACTIVE" && campaign.certificado.numero !== null
```

O número do CA funciona como a chave física do interruptor: alguém que mude a
variável de ambiente por engano não liga a promoção. E o endpoint revalida a
mesma regra antes de olhar o corpo da requisição — a interface não é a
fronteira de segurança.

| | PRE_LAUNCH | ACTIVE |
| --- | --- | --- |
| Seções institucionais | visíveis | visíveis |
| Formulário de cadastro | **não renderiza** | completo |
| `POST /api/participacao` | **503** | processa |
| Números da sorte | não existem | emitidos |
| Captura de e-mail | permitida, rotulada como "não é inscrição" | — |
| Documentos legais | publicados | publicados |
| CA na página | "aguardando emissão" | nº + link do PDF |

---

## 3. Fluxo do participante, passo a passo

### Passo 1 — Identificação

Campos, todos obrigatórios (os quatro do briefing, mais nascimento):

| Campo | Validação no cliente | Por que é coletado |
| --- | --- | --- |
| Nome completo | ≥ 2 nomes, sem dígitos | Identificação e entrega do prêmio |
| CPF | dígito verificador | Chave da participação e do teto por pessoa |
| Data de nascimento | idade ≥ 18 na data | Restrição legal de participação |
| E-mail | formato | Confirmação e comunicação do resultado |
| Telefone | DDD 11–99; celular começa com 9 | Contato do contemplado |

Três aceites, deliberadamente separados:

1. Regulamento + Termos de Uso — **obrigatório**
2. Tratamento de dados para participar — **obrigatório** (base: execução de contrato)
3. Comunicações de marketing — **opcional**, desmarcado

O terceiro é separado porque, sob a LGPD, consentimento para marketing não
pode ser condição de participação. Amarrar os três num checkbox só é o erro
mais comum desse tipo de campanha, e é o que gera questionamento depois.

### Passo 2 — Validação da compra

Aqui está a decisão de produto mais importante do fluxo: **um campo em vez de
cinco.**

O caminho óbvio seria pedir número da nota, série, CNPJ do emitente, data e
valor total. São cinco campos, cinco chances de erro de digitação, e um
formulário que ninguém preenche na fila do caixa. A alternativa usa a
**chave de acesso de 44 dígitos**, que já está impressa no rodapé de todo
cupom fiscal ao lado do QR Code.

Funciona porque a chave não é um identificador opaco — ela é estruturada:

```
35 2608 12345678000199 65 001 000012345 1 87654321 5
│   │    │              │  │   │         │ │        └ DV (módulo 11)
│   │    │              │  │   │         │ └────────── código numérico
│   │    │              │  │   │         └──────────── tipo de emissão
│   │    │              │  │   └────────────────────── número da NF
│   │    │              │  └────────────────────────── série
│   │    │              └───────────────────────────── modelo (65 = NFC-e)
│   │    └──────────────────────────────────────────── CNPJ do emitente
│   └───────────────────────────────────────────────── ano/mês de emissão
└───────────────────────────────────────────────────── UF (35 = SP)
```

Consequências práticas, todas verificadas em `lib/notaFiscal.ts`:

- **Erro de digitação é pego no navegador.** O 44º dígito é verificador
  (módulo 11, pesos 2–9 cíclicos). Um dígito trocado não passa.
- **CNPJ, UF, data, série e número saem da própria chave**, sem consulta
  externa — não precisamos pedir o que já está ali.
- **A tela devolve o que entendeu.** Assim que a chave fica válida, aparece um
  painel com CNPJ do estabelecimento, mês de emissão, número e série. Isso
  transforma 44 dígitos numa conferência de um segundo: o participante
  reconhece a loja, ou percebe na hora que pegou o cupom errado.
- **Nota fora da vigência é recusada** comparando o ano/mês da chave com o
  início da promoção.

Além da chave, o passo coleta:

- **quantidade por produto participante** (contador com botões grandes — isso
  é preenchido no celular, não no desktop);
- **imagem do cupom** (JPG/PNG/PDF, até 5 MB), que é a prova documental para
  auditoria e para conferir que a nota contém produto elegível.

### Passo 3 — Emissão

Nota validada, a resposta traz os números da sorte, o total acumulado no CPF e
quanto ainda cabe no teto. Se o teto cortou parte dos números, **o corte
aparece na tela** — o participante não descobre depois que comprou esperando
números que não vieram.

---

## 3.5. Participação por CPF — compra na loja, lida pela API da IOTA

A compra acontece no PDV da loja (Nexaas). A IOTA expõe os pedidos de cada
CPF numa API, e o site busca esses pedidos quando o participante entra em
`/meus-numeros`. Não há formulário de compra.

```
Caixa da loja (CPF na compra) ──> PDV Nexaas ──> API da IOTA
                                                     │  GET get-customer-orders/{cpf}
Participante ──cadastro / login──> /api/meus-numeros ┘──> lib/sincronizacao.ts ──> Postgres
```

1. **Cadastro** (`/api/meus-numeros/cadastro`): nome, CPF, nascimento
   (18+), e-mail, celular, senha e aceite do regulamento + política
   (obrigatório) e de comunicações (opcional). Um CPF se cadastra uma vez só
   (`cadastrarParticipante` em `lib/store.ts`). A API da IOTA só devolve CPF
   e nome — sem e-mail —, então não há dado da compra para conferir quem se
   cadastra: o CPF é o identificador, e o prêmio só é entregue ao titular,
   com documento.
2. **Sincronização** (`lib/sincronizacao.ts`), no cadastro e em cada login:
   busca os pedidos do CPF (`lib/iota.ts`), descarta os de fora da vigência
   (pela data local da compra), traduz os SKUs do PDV para os produtos
   participantes (variável `IOTA_SKUS`) e emite os números de cada pedido
   ainda não processado, em ordem de compra — se o teto de 200 cortar, corta
   as compras mais novas. Pedido já processado não gera de novo (PK em
   `pedidos`).
3. **IOTA fora do ar**: o login funciona e mostra os números que já estão no
   banco, com um aviso; as compras novas entram no próximo login.
4. **Antes do CA**: cadastro e emissão recusados (só liberados em
   `next dev`, para testar).

**Variáveis de ambiente** (Vercel):

| Variável | Valor |
| --- | --- |
| `IOTA_API_KEY` | `X-API-Key` enviado pela IOTA |
| `IOTA_API_TOKEN` | `X-API-Token` enviado pela IOTA |
| `IOTA_SKUS` | opcional — substitui os SKUs padrão do código (Card 4001292, Collection 4001293, Arena 4001261); formato `4001292:FUTI-CARD,4001293:FUTI-COL,4001261:FUTI-ARE` |
| `IOTA_CAMPAIGN` | opcional, padrão `NEYMARJR` |
| `IOTA_API_URL` | opcional, padrão `https://api.hub.iotaapp.com.br/provider/biscoite/campaigns` |

**Formato da resposta** (conferido em 29/09/2026): `ordersData.customer`
(`document`, `name`, `id`) e `ordersData.orders[]` (`id`,
`salesChannelName`, `createdAt` com fuso, `items[]` com `sku`, `name`,
`quantity`). Não vem status do pedido — cancelamento e estorno ainda não
são tratados. CPF sem compras volta 200 com a lista vazia.

**Números por produto** (`lib/numeroDaSorte.ts`): Futi Card = 1, Futi
Collection = 6, Futi Arena = 25. Card + Arena na mesma compra = 26 números.

**Login** é por CPF + senha (`app/api/meus-numeros/route.ts`), com a mesma
mensagem de erro para CPF sem cadastro e senha errada. Senha com scrypt em
`lib/senha.ts`. Não há "esqueci minha senha" ainda — depende de e-mail
transacional, ver §6.2.

---

## 4. Regras de negócio, e onde cada uma vive

Todas em `lib/campaign.ts`, num objeto só. Nenhum valor de prêmio, data,
limite ou número de CA é escrito direto num componente: se estiver em dois
lugares, um dia os dois divergem — e divergência entre a LP e o regulamento
protocolado é problema de conformidade, não de layout.

| Regra | Valor | Onde |
| --- | --- | --- |
| Idade mínima | 18 anos | `campaign.regras.idadeMinima` |
| Teto por CPF | 200 números | `campaign.regras.maxNumerosPorCpf` |
| Nota única na campanha | sim | `campaign.regras.notaFiscalUnica` |
| Prazo p/ cadastrar após a compra | 30 dias | `campaign.regras.prazoCadastroNotaDias` |
| Números por produto | 1 (Card) / 6 (Bonequinho) / 25 (Campo) | `lib/numeroDaSorte.ts` |
| Prêmios | 22 camisetas autografadas | `campaign.premios` |

**Campos que o jurídico precisa preencher antes do protocolo** — hoje `null`,
e a página mostra `[A CONFIRMAR]` de propósito, para gritar o que falta:

- `certificado.numero` e `certificado.pdf`
- `contato.sacTelefone`

---

## 5. O upload do cupom

O arquivo **não** deve trafegar pelo servidor da aplicação. O caminho correto,
e o que o código já assume:

1. cliente pede uma URL assinada de upload (`POST /api/upload-url`);
2. cliente envia o arquivo **direto ao object storage**, com expiração curta;
3. cliente manda a chave devolvida em `nota.cupomKey`;
4. o servidor grava só a chave; o bucket é privado, sem URL pública.

O ponto de integração está marcado no `fetch` de `components/Participation.tsx`.
Hoje ele envia `upload-pendente/<nome do arquivo>` como placeholder.

Por que assim: imagem de cupom é dado pessoal (nome do titular, itens
comprados, às vezes CPF na nota). Passar o binário pelo app server significa
guardar dado pessoal em log, em disco temporário e em memória de processo, sem
nenhum ganho.

---

## 6. O que falta para produção

O que está pronto: interface completa, validações de cliente e de servidor,
regras de negócio, gating por autorização, documentos legais e o contrato da
API. O que falta é persistência e infraestrutura.

### 6.1 Banco — feito

Postgres no Neon, pelo Marketplace da Vercel. Conexão em `lib/db.ts`, que
também cria o esquema sozinho na primeira requisição; operações em
`lib/store.ts`.

```sql
participantes(cpf PK, nome, email, senha_hash, criado_em, atualizado_em)
pedidos(origem, referencia, cpf, numeros_solicitados, numeros_concedidos,
        recebido_em, PK (origem, referencia))
pool_numeros(posicao PK, numero UNIQUE)   -- 00000–99999, embaralhados 1 vez
contador_numeros(proximo)                 -- próxima posição livre da fila
numeros(numero PK, cpf, origem, referencia, emitido_em)
```

As invariantes ficam no banco, não na aplicação:

- **Pedido processado uma vez só** — PK `(origem, referencia)` em `pedidos`;
  reenvio do webhook cai no `ON CONFLICT DO NOTHING` e não gera nada.
- **Número com um dono só** — PK em `numeros.numero`. A emissão reserva
  posições da fila embaralhada com `UPDATE contador_numeros ... RETURNING`,
  que trava a linha: compras simultâneas saem uma depois da outra.
- **Teto por CPF** — conferido na mesma transação, com a linha do
  participante travada pelo upsert.
- **Distribuição aleatória** (regulamento, cláusula 6) — a série inteira é
  embaralhada na criação do banco e a ordem fica gravada em
  `pool_numeros`, auditável.

Pendente: `consentimento` (aceites com IP, user-agent e versão do
documento) — depende de onde o aceite do regulamento vai acontecer agora
que não há mais formulário de cadastro de nota.

### 6.2 Restante

| Item | Observação |
| --- | --- |
| Rate limiting | **feito** (`lib/limite.ts`, no Postgres): login 30/15 min por IP e 10 erros/15 min por CPF (zera no login certo); cadastro 10/h por IP; esqueci 3/h por CPF e 10/h por IP; redefinir 20/h por IP. O IP entra só como hash e sai em 1 dia |
| CAPTCHA | contra automação em massa no cadastro, se o rate limiting não bastar |
| E-mail transacional | **"esqueci minha senha" feito** (`/api/meus-numeros/esqueci` + `/meus-numeros/redefinir`, link de uso único válido por 1 h, via Resend — `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`). Falta: e-mail de confirmação com os números emitidos |
| Área do participante | `/meus-numeros`, com login por CPF + senha (§3.5), lendo do banco |
| API da IOTA | tratamento de cancelamento/estorno — ver §3.5 |
| Apuração | entrada dos resultados oficiais da Loteria Federal |
| `robots: index` | automático: `app/layout.tsx` só libera o Google quando `transactionsAllowed()` |
| Aviso de cookies | se houver medição de audiência |

---

## 7. Checklist antes do protocolo na SPA/MF

- [ ] Preencher todos os campos `null` de `lib/campaign.ts` (§4)
- [ ] Substituir as minutas legais pelo texto final do jurídico
  (`app/regulamento`, `app/politica-de-privacidade`, `app/termos-de-uso`) e
  remover o aviso de minuta (`draft={false}` em `LegalPage`)
- [x] Trocar o logotipo `futï` pelo PNG oficial (`components/FutiWordmark.tsx`)
- [ ] Trocar as assinaturas Biscoitê e Neymar Jr. pelos SVGs oficiais
  (`components/BrandLockup.tsx`) — a "Biscoitê" já está com o PNG oficial;
  falta o "NEYMAR JR." com o monograma NJ
- [x] Variante clara (branca) dos logos futi e Biscoitê para o Footer
  (`bg-ink`) — falta ainda uma versão clara do "NEYMAR JR." (item acima)
- [ ] Favicon (`public/favicon.png`) está com o "B" da Biscoitê, mas em PNG
  retangular (714×1110) — gerar um `.ico`/PNG quadrado de verdade quando
  possível, e reconsiderar usar a convenção `app/icon.png` do Next (tentei
  e travou neste ambiente, provavelmente por faltar o pacote `sharp`)
- [ ] Instalar a Noka licenciada e descomentar o `@font-face`
  (`app/globals.css`)
- [ ] Conferir que os pesos de números por produto batem com o regulamento
- [ ] Gerar os prints da LP para anexar ao protocolo (`/`, formulário passo 1,
      passo 2, passo 3, e as três páginas legais)
- [ ] Confirmar se o encontro com o Neymar Jr. entra ou não no CA e ajustar
      `campaign.premios.encontro.confirmado`

## 8. Depois da emissão do CA

- [ ] `certificado.numero` e `certificado.pdf` preenchidos
- [ ] `NEXT_PUBLIC_PROMO_STATUS=ACTIVE`
- [ ] Verificar que o CA aparece na seção "Documentos oficiais" e no rodapé
- [ ] PDF do CA em `public/docs/certificado-autorizacao.pdf` (o link aparece sozinho)
- [ ] `RESEND_API_KEY`, `EMAIL_FROM` e `SITE_URL` configuradas, domínio verificado na Resend
- [ ] `IOTA_API_KEY` e `IOTA_API_TOKEN` configuradas em produção
      (§3.5), com chave e token novos (os atuais circularam no WhatsApp)
- [ ] Teste de ponta a ponta com um pedido real na loja
