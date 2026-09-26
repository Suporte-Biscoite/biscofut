/**
 * Chave única do tema visual — ver BRAND.md, seção 2.
 *
 *  - "futi": cores invertidas, puxadas para o azul das caixas da coleção.
 *    Onde o tema clássico tinha branco, entra azul; onde tinha azul, entra
 *    branco. Pedido da Biscoitê para a página ter "mais cara de Futi".
 *  - "classico": azul-marinho sobre off-white, como no board original.
 *
 * Os valores de cada tema moram em app/globals.css (variáveis --c-*). Os
 * nomes das classes (text-navy, bg-paper…) não mudam entre temas: eles
 * descrevem o papel da cor no tema clássico, e o tema futi troca o valor.
 */
export const TEMA: "futi" | "classico" = "futi";

/**
 * Os logotipos são PNG — não herdam a cor do tema. Quem chama pede o tom do
 * tema clássico ("navy" em fundo claro, "light" em fundo escuro); no tema
 * futi os fundos se invertem, então a variante do arquivo também.
 */
export function tomDoLogo(tone: "navy" | "light"): "navy" | "light" {
  if (TEMA === "classico") return tone;
  return tone === "navy" ? "light" : "navy";
}
