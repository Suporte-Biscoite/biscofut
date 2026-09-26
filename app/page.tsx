import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Prizes from "@/components/Prizes";
import HowItWorks from "@/components/HowItWorks";
import EligibleProducts from "@/components/EligibleProducts";
import Participation from "@/components/Participation";
import LegalDocs from "@/components/LegalDocs";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import CookieRain from "@/components/CookieRain";

/**
 * Ordem das seções: o que o participante quer saber, na ordem em que decide.
 *
 *   o que eu ganho (Prizes) → o que eu faço (HowItWorks) → o que eu compro
 *   (EligibleProducts) → agir (Participation) → é sério? (LegalDocs, FAQ)
 *
 * Os documentos legais vêm depois do formulário, mas cada aceite dentro dele
 * já linka direto para o documento correspondente — quem quiser ler antes de
 * marcar o checkbox não precisa rolar a página inteira.
 */
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Prizes />
        <HowItWorks />
        <EligibleProducts />
        <Participation />
        <LegalDocs />
        <FAQ />
      </main>
      <Footer />
      <CookieRain />
    </>
  );
}
