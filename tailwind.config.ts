import type { Config } from "tailwindcss";

/**
 * Paleta e tipografia derivadas de duas fontes de verdade:
 *  1. o board de tipografia da campanha (Noka Medium/Black + logotipo "futï");
 *  2. o CSS de produção de https://www.biscoite.com.br/.
 *
 * Ver BRAND.md para a origem de cada valor e as regras de uso.
 *
 * Os valores vêm de variáveis CSS (app/globals.css), porque há dois temas —
 * o clássico e o "futi", com as cores invertidas. Os nomes descrevem o papel
 * da cor no tema clássico; a chave do tema fica em lib/theme.ts.
 */
const cor = (nome: string) => `rgb(var(--c-${nome}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // `white` também troca de valor: no tema futi, superfície "branca" é azul.
        white: cor("white"),
        // Azul-marinho institucional da Biscoitê — cor mais frequente do site.
        ink: cor("ink"),
        // Azul da campanha, amostrado do board de tipografia.
        navy: {
          DEFAULT: cor("navy"),
          deep: cor("navy-deep"),
        },
        steel: {
          DEFAULT: cor("steel"),
          soft: cor("steel-soft"),
        },
        sky: {
          DEFAULT: cor("sky"),
          light: cor("sky-light"),
        },
        paper: cor("paper"),
        line: cor("line"),
        alert: cor("alert"),
        // Raridade "Golden" das cartas e o bonequinho dourado.
        gold: cor("gold"),
      },
      fontFamily: {
        // Uma única família em todo o site — o board não prevê segunda voz.
        noka: ["var(--font-noka)"],
      },
      letterSpacing: {
        headline: "0.01em",
        label: "0.16em",
      },
      maxWidth: {
        prose: "68ch",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        // Zoom lento de câmera nas fotos de estádio (efeito Ken Burns).
        kenBurns: {
          "0%": { transform: "scale(1) translate(0, 0)" },
          "100%": { transform: "scale(1.1) translate(-1.5%, -1%)" },
        },
        // Flutuação suave das embalagens.
        hover: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // Chuva de biscoitos: a queda (fora do topo → abaixo da tela)…
        cookieFall: {
          "0%": { transform: "translateY(-15vh)" },
          "100%": { transform: "translateY(115vh)" },
        },
        // …e, na imagem, o balanço lateral com giro.
        cookieSway: {
          "0%": { transform: "translateX(-18px) rotate(-35deg)" },
          "100%": { transform: "translateX(18px) rotate(35deg)" },
        },
        // Brilho que atravessa a foto do bonequinho dourado.
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "60%, 100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
      },
      animation: {
        floatUp: "floatUp 0.7s ease-out forwards",
        kenBurns: "kenBurns 18s ease-in-out infinite alternate",
        hover: "hover 4s ease-in-out infinite",
        shine: "shine 3.5s ease-in-out infinite",
        // Durações reais vêm por `style` em CookieRain.tsx (cada biscoito tem a sua).
        cookieFall: "cookieFall 15s linear infinite",
        cookieSway: "cookieSway 5s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
