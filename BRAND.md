# Sistema visual — Promoção Futi (Biscoitê × Neymar Jr.)

Documento de referência do design system aplicado nesta landing page. Duas
fontes de verdade foram usadas: **(1)** o board de tipografia da campanha
(`NOKA MEDIUM` / `NOKA BLACK` / logotipo `futï`) e **(2)** o CSS de produção
de <https://www.biscoite.com.br/>.

---

## 1. Tipografia

### 1.1 O que o board da campanha define

| Uso no board | Aplicação |
| --- | --- |
| `NOKA MEDIUM` | Texto corrido, linhas de apoio, primeira parte das chamadas ("CONCORRA A UMA CAMISETA") |
| `NOKA BLACK` | Ênfase dentro da chamada ("AUTOGRAFADA PELO NEYMAR JR."), números, botões |
| Estilo `futï` | **Exclusivo da palavra "futi".** Nunca aplicar esse estilo a outra palavra. |

Duas regras estruturais tiradas do board e respeitadas no código:

1. A hierarquia é feita **por peso, não por cor** — Medium e Black no mesmo
   tom de azul. Ver `components/Headline.tsx`.
2. Chamadas são **caixa-alta** com tracking levemente aberto.

### 1.2 Noka é licenciada — como instalar

Noka é uma família comercial (Latinotype). Não pode ser distribuída no
repositório. O código já está preparado para ela:

```
--font-noka: "Noka", "Poppins", "Montserrat", ui-sans-serif, system-ui, sans-serif;
```

Para ativar a Noka de verdade, quando a licença web estiver disponível:

1. Coloque os arquivos em `public/fonts/`:
   `noka-medium.woff2`, `noka-bold.woff2`, `noka-black.woff2`
2. Descomente o bloco `@font-face` em `app/globals.css` (está marcado com
   `NOKA — ATIVAR AQUI`).

Nada mais precisa mudar: todo o site já pede `font-noka`, e o fallback
sai de cena automaticamente.

### 1.3 Fallback atual e por quê

**Poppins** (500 Medium / 700 Bold / 900 Black), self-hosted via
`@fontsource/poppins`. É o substituto livre mais próximo da Noka nas
características que importam para esta campanha: geométrica monolinear,
caixa-alta larga, contadores generosos, ápice pontiagudo no `A`, perna reta
no `R` — e, decisivo, tem um **900 verdadeiro** para ocupar o papel do Noka
Black. O mapeamento é 1:1:

| Board | CSS | Classe |
| --- | --- | --- |
| Noka Medium | `font-weight: 500` | `font-medium` |
| Noka Black | `font-weight: 900` | `font-black` |

**Montserrat** entra como segundo fallback porque é a fonte de UI real do
site da Biscoitê — se a Poppins falhar em carregar, a página degrada para
algo que já é da marca.

### 1.4 O logotipo `futï`

O board mostra um logotipo desenhado à mão: letras geométricas de terminais
arredondados construídas com **linhas concêntricas (inline de 3 traços)**.
Isso não é fonte, é lettering — e não existe substituto tipográfico.

`components/FutiWordmark.tsx` reproduz a construção em SVG (máscara com
faixas alternadas, herda `currentColor`). É uma **aproximação de layout**,
boa o suficiente para aprovação interna.

> ⚠️ **Antes de publicar:** substituir pelo SVG oficial. O componente tem um
> único ponto de troca, comentado no topo do arquivo.

---

## 2. Cores

Extraídas do CSS de produção de biscoite.com.br (contagem de ocorrências no
HTML servido) e do board da campanha.

### 2.1 Paleta

| Token | Hex | Origem | Uso |
| --- | --- | --- | --- |
| `ink` | `#0A192F` | biscoite.com.br — cor mais frequente do site (20 ocorrências) | Superfícies escuras, footer, texto sobre claro |
| `navy` | `#213B6E` | Board da campanha (amostrado) | Cor primária: títulos, botões, o logotipo `futï` |
| `navy-deep` | `#16294A` | Interpolado entre `ink` e `navy` | Hover de botão, gradientes |
| `steel` | `#5881A5` | biscoite.com.br | Links, rótulos secundários, ícones |
| `steel-soft` | `#6580A2` | biscoite.com.br | Texto de apoio sobre escuro |
| `sky` | `#BED7E7` | biscoite.com.br | Fundos de destaque, badges, barras de progresso |
| `sky-light` | `#9EBDE4` | biscoite.com.br | Estados de foco, detalhes |
| `paper` | `#F5F5F5` | biscoite.com.br | Fundo padrão da página |
| `line` | `#E0E0E0` | biscoite.com.br | Bordas, divisórias, inputs |
| `alert` | `#A21D2D` | biscoite.com.br | Erros de formulário, avisos legais |

### 2.1.1 Tema "futi" (cores invertidas) — ativo

Pedido da Biscoitê (Raul): a página precisa ter mais cara de **Futi**, não só
de Biscoitê. A resposta foi inverter a paleta — onde era branco entra o azul
das caixas da coleção (`#1F3160`, amostrado das embalagens), e onde era azul
entra branco. Botões ficam brancos com texto azul; o footer fica branco.

- A chave fica em `lib/theme.ts` (`TEMA = "futi" | "classico"`). Trocar para
  `"classico"` volta ao visual da tabela acima, sem mexer em mais nada.
- Os valores dos dois temas estão em `app/globals.css` (variáveis `--c-*`).
  Os nomes das classes (`text-navy`, `bg-paper`, `bg-white`…) continuam os do
  tema clássico — no tema futi, `white` é azul e `navy` é branco.
- Os logotipos PNG trocam de variante sozinhos (`tomDoLogo()` em `lib/theme.ts`).
- Branco literal (que não deve inverter) vai em `style`, não em classe.

### 2.2 A regra que segura a identidade

O board é **monocromático em azul-marinho sobre off-white**. Foi essa a
disciplina adotada: sem amarelo, sem verde, sem dourado. A cor não carrega
informação — **peso tipográfico e espaço em branco carregam**. Onde a versão
anterior usava amarelo para chamar atenção, agora usa `font-black` e escala.

A única exceção é `alert`, e só para erro de validação e aviso legal — onde
vermelho é função, não decoração.

### 2.3 Contraste (WCAG AA)

| Combinação | Ratio | Status |
| --- | --- | --- |
| `ink` sobre `paper` | 15.0:1 | AAA |
| `navy` sobre `paper` | 8.6:1 | AAA |
| `navy` sobre `white` | 9.2:1 | AAA |
| `steel` sobre `white` | 4.6:1 | AA (texto normal) |
| `white` sobre `navy` | 9.2:1 | AAA |
| `sky` sobre `ink` | 11.4:1 | AAA |
| `alert` sobre `white` | 7.1:1 | AAA |

`steel` é o piso: só para texto ≥14px. Rótulos menores usam `ink/70`.

---

## 3. O lockup

O board fecha com `Biscoitê | NEYMAR JR.` — as duas marcas lado a lado,
separadas por um filete vertical, em peso visual igual. Isso é contrato de
co-branding, não escolha de layout: `components/BrandLockup.tsx` mantém a
ordem, o filete e a paridade de altura. Não redimensionar uma marca sem a
outra.

---

## 4. Espaçamento e forma

- **Raio:** `rounded-2xl` (16px) em cards, `rounded-full` em botões e badges.
  O board tem terminais arredondados; a UI acompanha.
- **Ritmo vertical:** seções em `py-24 md:py-32`, conteúdo em `max-w-6xl`.
- **Bordas:** `1px solid line` — sem bordas tracejadas (a versão anterior
  usava tracejado como recurso gráfico; não vem do board).
- **Sombra:** praticamente ausente. Elevação por cor de fundo (`white` sobre
  `paper`), não por sombra.
