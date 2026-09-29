# Futi — Landing Page da Promoção

Landing page da promoção comercial **Futi** (Biscoitê × Neymar Jr.), na
mecânica **"Compre e Concorra"**: o consumidor compra um produto participante,
cadastra a nota fiscal e recebe números da sorte para concorrer a **22
camisetas autografadas pelo Neymar Jr.**

Três documentos, três assuntos:

| Arquivo | O que responde |
| --- | --- |
| **este README** | como rodar, o que tem dentro |
| **[BRAND.md](./BRAND.md)** | cores e tipografia — de onde cada valor veio |
| **[FLUXO.md](./FLUXO.md)** | o fluxo de cadastro e validação, para o protocolo na SPA/MF |

---

## ⚠️ Status regulatório — leia antes de publicar

A promoção é regida pela **Lei nº 5.768/1971** e pelo **Decreto nº
70.951/1972**, sob regulação da **SPA/MF**, e **não pode ser iniciada sem
autorização prévia**.

O projeto trata isso como regra de código, não como recomendação. Em
[`lib/promoStatus.ts`](./lib/promoStatus.ts):

```ts
transactionsAllowed() === (status === "ACTIVE" && certificado.numero !== null)
```

Duas condições, não uma. Enquanto o número do CA for `null`:

- o formulário de participação **não renderiza**;
- `POST /api/participacao` responde **503** antes de olhar o corpo da
  requisição — esconder o botão não é controle de acesso;
- a seção "Documentos oficiais" mostra "aguardando emissão";
- a página está em `noindex` ([`app/layout.tsx`](./app/layout.tsx)).

Em desenvolvimento, a seção "Participar" tem um alternador **Antes do CA /
Depois do CA** para revisar os dois estados. Ele existe só em
`NODE_ENV !== "production"`.

## ⚠️ O que ainda é minuta

Preencher antes do protocolo — hoje esses campos são `null` e a página exibe
`[A CONFIRMAR]` de propósito, para o que falta ficar visível em revisão:

- datas de vigência e de apuração;
- número e PDF do Certificado de Autorização;
- valor unitário declarado do prêmio;
- CNPJ da promotora e telefone do SAC;
- texto final de regulamento, política de privacidade e termos de uso
  (as três páginas exibem aviso de minuta até `draft={false}`).

Tudo num lugar só: [`lib/campaign.ts`](./lib/campaign.ts). Checklist completo
em [FLUXO.md §7](./FLUXO.md).

Também são placeholders, marcados no topo dos respectivos arquivos: o
logotipo `futï` ([`FutiWordmark.tsx`](./components/FutiWordmark.tsx)), as
assinaturas Biscoitê e Neymar Jr.
([`BrandLockup.tsx`](./components/BrandLockup.tsx)) e a tipografia Noka
(licenciada — ver [BRAND.md §1.2](./BRAND.md)).

---

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Postgres (Neon, pelo Marketplace da Vercel), via `pg` — ver `lib/db.ts`
- Fontes auto-hospedadas via Fontsource: Poppins (substituto da Noka),
  Montserrat (fallback, é a fonte de UI do site da Biscoitê)

## Rodando localmente

Node.js 18.18+.

```bash
npm install
vercel env pull .env.local   # traz a DATABASE_URL do projeto
npm run dev                  # http://localhost:3000
```

As rotas de API precisam de `DATABASE_URL`. **Use uma branch de dev do
Neon**, nunca o banco de produção: no painel do Neon, crie a branch `dev` e
coloque a URL dela no `.env.local`. As tabelas são criadas sozinhas na
primeira requisição (`lib/db.ts`) — não há passo de migração. Em `next dev`
existe um participante de teste (CPF 529.982.247-25, senha `teste123`).

Para ver o fluxo completo de participação sem esperar o CA, crie um
`.env.local` com `NEXT_PUBLIC_PROMO_STATUS=ACTIVE` — ou use o alternador de
prévia na própria página.

## Estrutura

```
app/
├── layout.tsx                  fontes, metadata, skip-link
├── page.tsx                    ordem das seções
├── globals.css                 tokens, @font-face da Noka, componentes base
├── regulamento/                ┐
├── politica-de-privacidade/    ├ documentos legais, rotas próprias
├── termos-de-uso/              ┘
└── api/participacao/route.ts   cadastro + validação + emissão de números

components/
├── FutiWordmark.tsx            logotipo futï em SVG (placeholder)
├── BrandLockup.tsx             Biscoitê | Neymar Jr. (placeholder)
├── Headline.tsx                a regra Medium/Black do board
├── Header.tsx  Hero.tsx  Prizes.tsx  HowItWorks.tsx
├── EligibleProducts.tsx
├── Participation.tsx           fluxo em 3 passos
├── LegalDocs.tsx               documentos + Certificado de Autorização
├── FAQ.tsx  Footer.tsx
├── LegalPage.tsx               moldura das páginas legais
└── ui/Field.tsx                campos acessíveis

lib/
├── campaign.ts                 ⭐ fonte única de datas, prêmios, limites, CA
├── promoStatus.ts              o interruptor mestre
├── notaFiscal.ts               chave de acesso: DV módulo 11 + parsing
├── masks.ts                    CPF, telefone, e-mail, nome, idade
└── numeroDaSorte.ts            pesos por produto, teto por CPF, apuração
```

## Decisões que valem explicação

**Um campo em vez de cinco na validação da nota.** Em vez de pedir número,
série, CNPJ, data e valor, o formulário pede só a **chave de acesso de 44
dígitos** do cupom. Ela tem dígito verificador (módulo 11), então erro de
digitação é pego no navegador; e dela se extraem CNPJ do emitente, UF, mês de
emissão, série e número — sem consulta externa. A tela devolve esses dados
para conferência, o que transforma 44 dígitos num "sim, foi essa compra" de um
segundo. Detalhes em [FLUXO.md §3](./FLUXO.md).

**Consentimentos separados.** Regulamento e tratamento de dados são
obrigatórios; marketing é caixa própria, desmarcada. Sob a LGPD, consentimento
para marketing não pode ser condição de participação — e amarrar os três num
checkbox único é o erro que gera questionamento depois.

**Hierarquia por peso, não por cor.** O board da campanha é monocromático em
azul-marinho: a ênfase vem de Noka Black contra Noka Medium, no mesmo tom.
A UI segue isso — sem amarelo, sem verde, sem dourado. Ver
[BRAND.md §2.2](./BRAND.md).

**O prêmio "encontro com o Neymar Jr." aparece como "em estudo".** O briefing
o trata como possível. Anunciar prêmio que não está no CA é exatamente o que
trava o protocolo, então o card reserva o espaço de layout e diz explicitamente
que não constitui oferta. Vira prêmio de verdade com uma linha:
`campaign.premios.encontro.confirmado = true`.

## Próximos passos

O banco está ligado (`lib/db.ts` e `lib/store.ts`), com as garantias que o
protocolo exige feitas pelo próprio Postgres: pedido processado uma vez só,
número da sorte com um dono só e teto por CPF conferido em transação. O que
falta — contrato real da Nexaas, rate limiting, apuração — está em
[FLUXO.md §6](./FLUXO.md).
