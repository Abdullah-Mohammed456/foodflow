"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const FRAMES = Array.from({ length: 24 }, (_, index) => `/food/burger-sequence/frame-${String(index + 1).padStart(2, "0")}.webp`);

export function BurgerSequence() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    const image = section?.querySelector<HTMLImageElement>("[data-sequence-image]");
    if (!section || !image || matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(max-width: 650px)").matches) return;

    const frames = FRAMES.map((src) => {
      const frame = new window.Image();
      frame.src = src;
      return frame;
    });
    let current = 0;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=140%",
        pin: true,
        scrub: true,
        onUpdate: ({ progress }) => {
          const next = Math.min(FRAMES.length - 1, Math.round(progress * (FRAMES.length - 1)));
          const frame = frames[next];
          if (next === current || !frame?.complete) return;
          current = next;
          image.src = frame.src;
        },
      });
      gsap.fromTo(".sequence-copy", { yPercent: 14, opacity: .6 }, {
        yPercent: -14,
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: .8 },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return <section className="burger-sequence" ref={root} aria-label="Burger film">
    <Image data-sequence-image unoptimized src={FRAMES[0] ?? ""} alt="Double cheeseburger on a dark backdrop" width={960} height={540} draggable={false} />
    <div className="sequence-shade" />
    <div className="sequence-top"><span>THE FOOD FLOW FILM</span><span>01 / THE BURGER</span></div>
    <div className="sequence-copy"><span className="eyebrow">SCROLL THROUGH THE CRAVING</span><h2>BUILT<br /><em>TO BITE.</em></h2><p>Layers worth slowing down for.</p></div>
    <span className="sequence-bottom">ONE FRAME AT A TIME / ONE BIG APPETITE</span>
  </section>;
}
