import fs from "node:fs";
import path from "node:path";
import BonecosGaleria, { type Boneco } from "./BonecosGaleria";

/**
 * Seção extra da página do Futi Collection: os 6 bonequinhos.
 *
 * A grade usa os renders 3D (fundo transparente, mesmo enquadramento) em
 * public/images/collection/web/render-<arquivo>.webp, 640 px de largura, e
 * não as fotos de estúdio — elas tinham fundo branco e cada bonequinho numa
 * posição diferente. As fotos continuam em web/<arquivo>.jpg, sem uso.
 *
 * Arte ampliada: ao clicar num bonequinho, abre a imagem de
 * public/images/collection/bonecos/<arquivo>.webp (ou .svg / .png), se ela
 * existir — ex.: bonecos/amarelo.webp. Os PNG exportados do Figma ficam em
 * bonecos/original/. Sem arquivo lá, amplia a própria foto.
 * Basta soltar o arquivo com o nome certo na pasta; o código não muda.
 */

const BONECOS = [
  { arquivo: "amarelo", nome: "Amarelo" },
  { arquivo: "branco", nome: "Branco" },
  { arquivo: "azul-claro", nome: "Azul-claro" },
  { arquivo: "preto", nome: "Preto" },
  { arquivo: "vermelho-e-azul", nome: "Vermelho e azul" },
  { arquivo: "dourado", nome: "Dourado" },
] as const;

const PASTA_DETALHE = path.join(process.cwd(), "public/images/collection/bonecos");
const FORMATOS_DETALHE = ["webp", "svg", "png"];

function comDetalhe(boneco: (typeof BONECOS)[number]): Boneco {
  const foto = `/images/collection/web/render-${boneco.arquivo}.webp`;
  const formato = FORMATOS_DETALHE.find((ext) =>
    fs.existsSync(path.join(PASTA_DETALHE, `${boneco.arquivo}.${ext}`)),
  );
  const detalhe = formato ? `/images/collection/bonecos/${boneco.arquivo}.${formato}` : foto;
  return { ...boneco, foto, detalhe };
}

export default function CollectionShowcase() {
  return (
    <section className="mt-16">
      <h2 className="text-xl font-black uppercase tracking-headline">Os 6 bonequinhos</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/70">
        Cada caixa traz 1 dos 6 modelos, surpresa. Junte todos para completar a coleção.
        Toque num bonequinho para ver de perto.
      </p>

      <BonecosGaleria bonecos={BONECOS.map(comDetalhe)} />
    </section>
  );
}
