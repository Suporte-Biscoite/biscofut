import Image from "next/image";

/**
 * Logo "NEY [rosto] NEY" — public/images/neyneybranco.png, 1751×521.
 *
 * As letras são brancas: só funciona sobre fundo escuro (hero, seções azuis,
 * a faixa azul do rodapé). Sobre as seções claras (`secao-clara`) some.
 */
export default function NeyNeyLogo({ className = "" }: { className?: string }) {
  // Tamanho pela largura (w-*) por padrão; quem passa altura (h-*) fixa a
  // altura e a largura acompanha.
  const proporcao = /(^|\s)h-/.test(className) ? "w-auto" : "h-auto";
  return (
    <Image
      src="/images/neyneybranco.png"
      alt="NeyNey"
      width={1751}
      height={521}
      className={`select-none ${proporcao} ${className}`}
    />
  );
}
