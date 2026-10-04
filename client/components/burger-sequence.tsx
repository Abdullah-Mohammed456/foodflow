"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const FRAMES = Array.from({ length: 120 }, (_, index) => `/food/burger-sequence/frame-${String(index + 1).padStart(3, "0")}.webp`);

export function BurgerSequence() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    const canvas = section?.querySelector<HTMLCanvasElement>("canvas");
    const context = canvas?.getContext("2d", { alpha: false });
    if (!section || !canvas || !context || matchMedia("(prefers-reduced-motion: reduce), (max-width: 650px)").matches) return;

    let disposed = false;
    let ctx: gsap.Context | undefined;
    const frames: HTMLImageElement[] = [];
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      await Promise.all(FRAMES.map((src) => new Promise<void>((resolve) => {
        const frame = new window.Image();
        frames.push(frame);
        frame.onload = () => resolve();
        frame.onerror = () => resolve();
        frame.src = src;
      })));
      if (disposed || frames.some((frame) => !frame.naturalWidth)) return;
      const playhead = { frame: 0 };
      const draw = () => {
        const lower = Math.floor(playhead.frame);
        const fraction = playhead.frame - lower;
        const first = frames[lower];
        const second = frames[Math.min(lower + 1, frames.length - 1)];
        if (!first || !second) return;
        context.globalAlpha = 1;
        context.drawImage(first, 0, 0, canvas.width, canvas.height);
        context.globalAlpha = fraction;
        context.drawImage(second, 0, 0, canvas.width, canvas.height);
        context.globalAlpha = 1;
      };
      draw();
      canvas.style.opacity = "1";
      ctx = gsap.context(() => {
        gsap.to(playhead, {
          frame: FRAMES.length - 1,
          ease: "none",
          onUpdate: draw,
          scrollTrigger: { trigger: section, start: "top top", end: "+=80%", pin: true, scrub: .15, invalidateOnRefresh: true },
        });
        gsap.fromTo(".sequence-copy", { yPercent: 18, opacity: .6 }, {
          yPercent: -18, opacity: 1, ease: "none",
          scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: .35 },
        });
        ScrollTrigger.refresh();
      }, section);
    }, { rootMargin: "900px" });
    observer.observe(section);
    return () => {
      disposed = true;
      observer.disconnect();
      ctx?.revert();
      frames.forEach((frame) => { frame.onload = null; frame.onerror = null; frame.src = ""; });
    };
  }, []);

  return <section className="burger-sequence" ref={root} aria-label="Burger film">
    <Image unoptimized src={FRAMES[0] ?? ""} alt="Double cheeseburger on a dark backdrop" width={800} height={450} draggable={false} />
    <canvas width={800} height={450} aria-hidden="true" />
    <div className="sequence-shade" />
    <div className="sequence-top"><span>THE FOOD FLOW FILM</span><span>01 / THE BURGER</span></div>
    <div className="sequence-copy"><span className="eyebrow">SCROLL THROUGH THE CRAVING</span><h2>BUILT<br /><em>TO BITE.</em></h2><p>Every layer. Every angle. All appetite.</p></div>
    <span className="sequence-bottom">KEEP SCROLLING / GET CLOSER</span>
  </section>;
}
