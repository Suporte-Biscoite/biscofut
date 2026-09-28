/* eslint-disable @next/next/no-img-element */

/**
 * Chuva de biscoitos: os 5 biscoitos temáticos caindo pela tela, girando e
 * balançando de leve, por cima do site inteiro. Chove só ao abrir a página
 * (uma queda por biscoito, ~10 s no total) e depois para.
 *
 * - `pointer-events-none`: nunca bloqueia clique, seleção ou formulário.
 * - Fica abaixo do header (z-30 < z-40).
 * - Some para quem pediu movimento reduzido no sistema.
 * - Posições e tempos saem de um gerador pseudoaleatório com semente fixa:
 *   servidor e navegador geram a mesma chuva, sem erro de hidratação.
 *
 * Para mais ou menos biscoitos, mude QUANTIDADE. Imagens em
 * public/images/biscoitos/web/ (160px, reduzidas dos originais).
 */

const QUANTIDADE = 16;
const BISCOITOS = [1, 2, 3, 4, 5].map((n) => `/images/biscoitos/web/biscoito-${n}.png`);

function gerador(semente: number) {
  return () => {
    semente = (semente * 16807) % 2147483647;
    return (semente - 1) / 2147483646;
  };
}

const aleatorio = gerador(20261001);
const GOTAS = Array.from({ length: QUANTIDADE }, (_, i) => {
  const duracao = 4 + aleatorio() * 3; // 4–7 s por queda
  return {
    src: BISCOITOS[i % BISCOITOS.length],
    // Espalha em faixas para não amontoar, com variação dentro de cada faixa.
    left: ((i + aleatorio() * 0.8) / QUANTIDADE) * 100,
    tamanho: 30 + Math.round(aleatorio() * 30), // 30–60 px
    duracao,
    // Cada biscoito entra em um momento dos primeiros 2,5 s e cai uma vez só.
    atraso: aleatorio() * 2.5,
    giro: aleatorio() > 0.5 ? 1 : -1,
    // Só alguns biscoitos aparecem no celular, para não poluir a tela pequena.
    soDesktop: i % 2 === 1,
  };
});

export default function CookieRain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden motion-reduce:hidden"
    >
      {GOTAS.map((gota, i) => (
        <div
          key={i}
          className={`absolute top-0 animate-cookieFall ${gota.soDesktop ? "hidden md:block" : ""}`}
          style={{
            left: `${gota.left}%`,
            width: gota.tamanho,
            animationDuration: `${gota.duracao}s`,
            animationDelay: `${gota.atraso}s`,
            // Uma queda só; "both" segura o biscoito acima da tela durante o
            // atraso e abaixo dela depois que termina.
            animationIterationCount: 1,
            animationFillMode: "both",
          }}
        >
          <img
            src={gota.src}
            alt=""
            className="h-auto w-full animate-cookieSway opacity-90 drop-shadow-[0_6px_8px_rgba(0,0,0,0.3)]"
            style={{
              animationDuration: `${gota.duracao / 3}s`,
              animationDirection: gota.giro > 0 ? "alternate" : "alternate-reverse",
            }}
          />
        </div>
      ))}
    </div>
  );
}
