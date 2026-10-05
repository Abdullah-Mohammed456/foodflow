"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const INGREDIENTS = [
  { name: "Sesame bun", start: 0, end: 400, assembled: -.32, separated: -.59 },
  { name: "Lettuce", start: 400, end: 630, assembled: -.12, separated: -.34 },
  { name: "Tomato", start: 630, end: 797, assembled: -.025, separated: -.12 },
  { name: "Cheddar and beef", start: 797, end: 1045, assembled: .085, separated: .11 },
  { name: "Second patty", start: 1045, end: 1278, assembled: .235, separated: .34 },
  { name: "Toasted bun", start: 1278, end: 1536, assembled: .36, separated: .57 },
];
const ASSETS = ["/food/burger-story/ingredients.png", "/food/burger-story/empty-box.png"];

export function FastFoodHero() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    let disposed = false;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const poster = section.querySelector(".poster");
      const story = section.querySelector(".burger-story");
      const scene = section.querySelector(".story-scene");
      const burger = section.querySelector<HTMLElement>(".story-burger");
      const slices = section.querySelectorAll<HTMLElement>(".story-ingredient");
      const boxes = section.querySelectorAll<HTMLElement>(".story-box");
      const boxImage = section.querySelector<HTMLElement>(".story-box img");
      const header = document.querySelector(".site-header");
      if (!poster || !story || !scene || !burger || !boxImage) return;
      const burgerWidth = () => slices[0]?.offsetWidth ?? 1;
      const boxWidth = () => boxImage.offsetWidth;
      gsap.set(story, { autoAlpha: 0 });
      gsap.set(boxes, { autoAlpha: 0 });
      slices.forEach((slice, index) => gsap.set(slice, { xPercent: -50, yPercent: -50, y: () => burgerWidth() * (INGREDIENTS[index]?.assembled ?? 0) }));
      if (header) gsap.set(header, { autoAlpha: 0 });
      const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, scrollTrigger: {
        id: "foodflow-burger-story", trigger: section, start: "top top", end: () => `+=${Math.round(window.innerHeight * 4.2)}`,
        pin: true, scrub: .65, invalidateOnRefresh: true, refreshPriority: 100,
      } });
      timeline.to(poster, { autoAlpha: 0, duration: 1.3 }, .5)
        .fromTo(story, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.3 }, .5)
        .fromTo(burger, { x: () => section.clientWidth * .02, y: () => -section.clientHeight * .1, scale: () => section.clientWidth * .27 / burgerWidth() }, { x: 0, y: 0, scale: 1, duration: 1.8 }, .5);
      slices.forEach((slice, index) => {
        timeline.to(slice, { y: () => burgerWidth() * (INGREDIENTS[index]?.separated ?? 0), duration: 1.6 }, 2.6)
          .to(slice, { y: () => burgerWidth() * (INGREDIENTS[index]?.assembled ?? 0), duration: 1.35 }, 5);
      });
      timeline.fromTo(boxes, { y: 160, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.5 }, 6)
        .to(burger, { x: () => -boxWidth() * .185, y: () => boxWidth() * .04, scale: () => boxWidth() * .44 / burgerWidth(), duration: 1.7 }, 6)
        .to(scene, { scale: 2.4, filter: "blur(18px)", autoAlpha: 0, duration: 1.35 }, 8.1)
        .to(section, { backgroundColor: "#f5f1e7", duration: 1.35 }, 8.1)
        .to({}, { duration: .55 }, 9.45);
      if (header) timeline.to(header, { autoAlpha: 1, duration: .5 }, 9.4);
    }, section);
    const refresh = () => { if (!disposed) { ScrollTrigger.sort(); ScrollTrigger.refresh(); } };
    const frame = requestAnimationFrame(refresh);
    document.fonts.ready.then(refresh);
    Promise.all(ASSETS.map((src) => { const image = new window.Image(); image.src = src; return image.decode(); })).then(() => {
      if (!disposed) { section.setAttribute("data-story-ready", "true"); refresh(); }
    }).catch(() => {
      if (!disposed) {
        mm.revert();
        const header = document.querySelector(".site-header");
        if (header) gsap.set(header, { autoAlpha: 1 });
      }
    });
    window.addEventListener("foodflow:intro-complete", refresh);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("foodflow:intro-complete", refresh);
      mm.revert();
    };
  }, []);

  return <section className="cinematic-hero exact-hero" ref={root} data-story-ready="false" aria-label="Burger Bundle hero artwork">
    <div className="poster exact-poster"><h1 className="sr-only">BURGER BUNDLE</h1><Image className="hero-reference" src="/food/hero-reference.png" alt="The supplied Burger Bundle artwork, with the original burger photograph, oversized lettering and red campaign headline" fill sizes="100vw" unoptimized preload draggable={false}/></div>
    <div className="burger-story" aria-hidden="true"><div className="story-scene">
      <div className="story-box story-box-back"><Image src={ASSETS[1]!} alt="" width={1536} height={1024} unoptimized loading="eager" draggable={false}/></div>
      <div className="story-burger">{INGREDIENTS.map((layer) => <div className="story-ingredient" key={layer.name} style={{ "--slice-height": (layer.end - layer.start) / 1024, "--slice-top": -layer.start / 1024 } as CSSProperties}><Image src={ASSETS[0]!} alt="" width={1024} height={1536} unoptimized loading="eager" draggable={false}/></div>)}</div>
      <div className="story-box story-box-front"><Image src={ASSETS[1]!} alt="" width={1536} height={1024} unoptimized loading="eager" draggable={false}/></div>
    </div></div>
    <Link className="story-skip" href="/menu">Skip animation. Open the menu →</Link>
  </section>;
}
