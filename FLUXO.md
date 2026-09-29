# Fluxo de cadastro e validação — Promoção Futi

Documento técnico do fluxo implementado nesta landing page.

O briefing registra que o protocolo na SPA/MF exige, entre outros itens, **a
descrição detalhada do fluxo de cadastro e validação na Landing Page** e
**print/descrição visual da mesma**. Este arquivo é a fonte para essa parte da
documentação: o que está aqui descreve exatamente o que o código faz.

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

## 3.5. Canal 2 — compra na loja, via webhook da Nexaas

Além do cadastro manual de nota fiscal (canal 1, acima), a campanha também
gera números da sorte automaticamente quando a pessoa compra os produtos
participantes direto na loja (Nexaas). Não há formulário nesse canal: a
Nexaas nos avisa do pedido pago, e o participante consulta o resultado
depois em `/meus-numeros`, com CPF + e-mail.

```
Nexaas (pedido pago) ──POST──> /api/webhooks/nexaas ──> lib/store.ts
                                                              │
Participante ──CPF + e-mail──> /api/meus-numeros ────────────┘
```

**⚠️ Contrato do webhook ainda não confirmado com a Nexaas.** O formato do
payload, o nome do evento de "pedido pago" e o header de assinatura em
`lib/nexaas.ts` são uma suposição razoável (padrão de e-commerce), só para
destravar o resto do fluxo. Antes de ligar de verdade:

1. Confirmar com a Nexaas: nome do evento, formato exato do JSON, nome e
   algoritmo do header de assinatura.
2. Ajustar `NexaasWebhookEvent` e a leitura do payload em
   `app/api/webhooks/nexaas/route.ts`.
3. Preencher `NEXAAS_SKU_PARA_PRODUTO` (`lib/nexaas.ts`) com os SKUs reais
   cadastrados na loja — hoje são placeholders iguais aos nossos próprios
   SKUs (`FUTI-CARD`, `FUTI-COL`, `FUTI-ARE`).
4. Configurar a variável de ambiente `NEXAAS_WEBHOOK_SECRET` (sem ela, o
   endpoint recusa qualquer webhook em produção — de propósito, para nunca
   aceitar um payload não verificado por engano).

**Login em `/meus-numeros` é por CPF + senha** (`app/api/meus-numeros/route.ts`),
não CPF + e-mail — CPF sozinho pode vazar ou ser adivinhado, e antes disso
qualquer pessoa que soubesse CPF e e-mail de alguém (dado bem menos secreto
do que se gostaria) via quantos números aquele CPF tinha. Como nenhum
cadastro anterior (nota fiscal ou pedido Nexaas) coleta senha, o primeiro
acesso é uma etapa própria — `app/api/meus-numeros/senha/route.ts` — que
confirma CPF + e-mail da compra (a mesma verificação que valia antes) e só
então define a senha, uma única vez por CPF (`definirSenha` em
`lib/store.ts` recusa redefinir se já existe hash). Senha é hasheada com
scrypt em `lib/senha.ts`, sem dependência nova. Não há fluxo de "esqueci
minha senha" ainda — depende de e-mail transacional, ver §6.2. A mensagem
de erro é sempre a mesma (CPF, senha ou combinação inexistente), para não
vazar se um CPF já participou.

**Cada compra gera números conforme o produto**, usando os mesmos pesos do
canal manual (`lib/numeroDaSorte.ts`): Futi Card = 1, Futi Collection
(Bonequinho) = 6, Futi Arena (Campo) = 25. Comprar Card + Arena na mesma
compra gera 1 + 25 = 26 números, todos no mesmo CPF.

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
| Upload assinado | §5 |
| Rate limiting | por IP e por CPF, no endpoint de cadastro, em `/api/meus-numeros` (login) e em `/api/meus-numeros/senha` (criação) — este último é o alvo óbvio de força bruta contra o par CPF+e-mail |
| CAPTCHA | contra automação em massa, principalmente em `/api/meus-numeros/senha` |
| E-mail transacional | confirmação com os números emitidos; e viabiliza um fluxo de "esqueci minha senha" em `/meus-numeros`, que hoje não existe |
| Área do participante | `/meus-numeros`, com login por CPF + senha (§3.5), lendo do banco |
| Webhook Nexaas | contrato ainda não confirmado com a Nexaas — ver §3.5 |
| Apuração | entrada dos resultados oficiais da Loteria Federal |
| `robots: index` | hoje `noindex` em `app/layout.tsx` — liberar na publicação |
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
- [ ] `robots: index` liberado
- [ ] Teste de ponta a ponta com nota fiscal real
- [ ] Confirmar com a Nexaas o contrato do webhook e ajustar `lib/nexaas.ts`
      (§3.5)
- [ ] Preencher `NEXAAS_SKU_PARA_PRODUTO` com os SKUs reais da loja
- [ ] Configurar `NEXAAS_WEBHOOK_SECRET` no ambiente de produção
- [ ] Teste de ponta a ponta com um pedido real na loja
