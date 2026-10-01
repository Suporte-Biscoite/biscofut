"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo da hero que não para.
 *
 * O atributo `loop` sozinho não basta no celular: o Safari do iPhone (e
 * alguns Android em economia de bateria) pausa ou trava o vídeo depois de
 * algumas voltas, quando ele sai da tela ou quando a aba volta do segundo
 * plano. Além de recomeçar no fim e ao reaparecer, um vigia confere a cada
 * 1,5 s: se o vídeo está na tela e parou ou travou, toca de novo.
 *
 * MP4 (H.264) vem antes do WebM: no celular ele é decodificado pelo chip de
 * vídeo e repete de forma mais estável.
 */
const INTERVALO_VIGIA_MS = 1500;

export default function HeroVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let naTela = true;
    let ultimoTempo = -1;

    const tocar = () => {
      // Sem som e inline, o navegador permite tocar sem toque do usuário. Se
      // ainda assim recusar (economia de bateria), fica no poster.
      video.play().catch(() => {});
    };
    const recomecar = () => {
      video.currentTime = 0;
      tocar();
    };
    const podeTocar = () => naTela && document.visibilityState === "visible";

    const vigia = window.setInterval(() => {
      if (!podeTocar()) return;
      const perto_do_fim = video.duration > 0 && video.currentTime >= video.duration - 0.25;
      const travado = !video.paused && !video.seeking && video.currentTime === ultimoTempo;
      if (video.ended || perto_do_fim && (video.paused || travado)) recomecar();
      else if (video.paused || travado) tocar();
      ultimoTempo = video.currentTime;
    }, INTERVALO_VIGIA_MS);

    const aoMudarAba = () => {
      if (podeTocar()) tocar();
    };
    video.addEventListener("ended", recomecar);
    document.addEventListener("visibilitychange", aoMudarAba);
    const observador = new IntersectionObserver(([entrada]) => {
      naTela = entrada.isIntersecting;
      if (podeTocar() && video.paused) tocar();
    });
    observador.observe(video);
    tocar();

    return () => {
      window.clearInterval(vigia);
      video.removeEventListener("ended", recomecar);
      document.removeEventListener("visibilitychange", aoMudarAba);
      observador.disconnect();
    };
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/gif/web/neymar-assinando-poster.jpg"
    >
      <source src="/gif/web/neymar-assinando.mp4" type="video/mp4" />
      <source src="/gif/web/neymar-assinando.webm" type="video/webm" />
    </video>
  );
}
