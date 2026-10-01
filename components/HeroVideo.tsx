"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo da hero que não para.
 *
 * O atributo `loop` sozinho não basta no celular: o Safari do iPhone (e
 * alguns Android em economia de bateria) pausa o vídeo quando ele sai da tela
 * ou quando a aba volta do segundo plano, e às vezes ignora o loop no fim.
 * Aqui o vídeo recomeça no fim e volta a tocar sempre que reaparece na tela
 * ou a aba volta a ficar visível.
 */
export default function HeroVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const tocar = () => {
      // Sem som e inline, o navegador permite tocar sem toque do usuário. Se
      // ainda assim recusar (economia de bateria), fica no poster.
      video.play().catch(() => {});
    };
    const recomecar = () => {
      video.currentTime = 0;
      tocar();
    };
    const aoMudarAba = () => {
      if (document.visibilityState === "visible") tocar();
    };

    video.addEventListener("ended", recomecar);
    document.addEventListener("visibilitychange", aoMudarAba);
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting && video.paused) tocar();
    });
    observador.observe(video);
    tocar();

    return () => {
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
      <source src="/gif/web/neymar-assinando.webm" type="video/webm" />
      <source src="/gif/web/neymar-assinando.mp4" type="video/mp4" />
    </video>
  );
}
