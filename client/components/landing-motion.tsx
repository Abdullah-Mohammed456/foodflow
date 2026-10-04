"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { CATEGORY_ORDER, photoFor } from "@/lib/foodflow";

gsap.registerPlugin(ScrollTrigger);

const labels: Record<string, string> = { pizza: "PIZZA", burgers: "BURGERS", sandwiches: "SANDWICHES", "fries-sides": "FRIES & SIDES", chicken: "CHICKEN", drinks: "DRINKS", desserts: "DESSERTS", "combos-deals": "COMBOS & DEALS" };

export function LandingIntro() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (sessionStorage.getItem("foodflow-intro-seen") || matchMedia("(prefers-reduced-motion: reduce)").matches) { element.style.visibility = "hidden"; requestAnimationFrame(() => setVisible(false)); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const ctx = gsap.context(() => {
      const bites = element.querySelectorAll<SVGCircleElement>(".intro-bite");
      const loop = gsap.timeline({ repeat: -1 });
      loop.to(bites, { attr: { r: 40 }, duration: .35, stagger: .22, ease: "power2.out" }).to(bites, { attr: { r: 0 }, duration: .1, stagger: .02, delay: .4 });
      const images = ["/food/cosmos_1965868063.webp", "/food/pizza.jpg", "/food/cosmos_1096855834.webp", "/food/combo.jpg"];
      const preloads = images.map((src) => new Promise<void>((resolve) => { const img = new window.Image(); img.onload = () => resolve(); img.onerror = () => resolve(); img.src = src; if (img.complete) resolve(); }));
      let ended = false;
      const finish = () => {
        if (ended) return;
        ended = true;
        loop.kill();
        sessionStorage.setItem("foodflow-intro-seen", "1");
        gsap.timeline({ onComplete: () => { setVisible(false); document.body.style.overflow = previousOverflow; } })
          .to(element, { yPercent: -100, duration: .8, ease: "power3.inOut" })
          .fromTo(document.querySelector(".poster-hero"), { y: 120 }, { y: 0, duration: .8, ease: "power3.out" }, "<.15");
      };
      Promise.all(preloads).then(() => window.setTimeout(finish, 1000));
      const timeout = window.setTimeout(finish, 4500);
      const skip = element.querySelector<HTMLButtonElement>(".intro-skip");
      skip?.addEventListener("click", finish);
      return () => { window.clearTimeout(timeout); skip?.removeEventListener("click", finish); loop.kill(); };
    }, element);
    return () => { ctx.revert(); document.body.style.overflow = previousOverflow; };
  }, []);
  if (!visible) return null;
  return <div className="landing-intro" ref={root} aria-label="Loading Food Flow"><div className="intro-brand"><span>FOOD</span> <span>FLOW</span><sup>®</sup></div><span className="intro-edition">GOOD FOOD. WORTH THE WAIT.</span><div className="intro-center"><svg viewBox="0 0 260 200" role="img" aria-label="Burger being eaten"><defs><mask id="intro-bites"><rect width="260" height="200" fill="white"/><circle className="intro-bite" cx="220" cy="43" r="0" fill="black"/><circle className="intro-bite" cx="231" cy="113" r="0" fill="black"/><circle className="intro-bite" cx="196" cy="167" r="0" fill="black"/><circle className="intro-bite" cx="112" cy="178" r="0" fill="black"/><circle className="intro-bite" cx="44" cy="142" r="0" fill="black"/><circle className="intro-bite" cx="39" cy="62" r="0" fill="black"/><circle className="intro-bite" cx="123" cy="45" r="0" fill="black"/></mask></defs><g mask="url(#intro-bites)"><path d="M26 83C27 4 233 4 234 83Z" fill="#d69545"/><path d="M32 70C45 8 210 12 227 70" fill="#e6b56c"/><g stroke="#f7e4b8" strokeWidth="5" strokeLinecap="round"><path d="M70 43l5 -3M110 29l5 2M148 34l5 -2M184 48l5 3M93 60l5 -3M139 57l5 2"/></g><rect x="21" y="88" width="218" height="14" rx="7" fill="#ab3d28"/><path d="M20 109l20 -8 23 9 21 -9 25 9 24 -10 25 10 28 -9 22 9 30 -6v18H20Z" fill="#55745c"/><rect x="22" y="119" width="216" height="25" rx="12" fill="#593320"/><path d="M24 119h209l-43 26 -38 -16 -46 20 -32 -17Z" fill="#e8b944"/><rect x="28" y="144" width="204" height="15" rx="7" fill="#633c27"/><path d="M25 161h210c-5 31 -21 33 -105 33S29 191 25 161" fill="#d69545"/></g></svg><h2>ONE BITE CLOSER.</h2><p>GETTING THE GOOD STUFF READY</p><div className="intro-progress"><span/></div></div><span className="intro-bottom">PIZZA / BURGERS / EVERYTHING YOU LOVE</span><button className="intro-skip" type="button">SKIP INTRO →</button></div>;
}

export function HorizontalCategories() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!root.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const track = root.current!.querySelector<HTMLElement>(".film-track");
      if (!track) return;
      const travel = gsap.to(track, { x: () => -(track.scrollWidth - window.innerWidth), ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${track.scrollWidth - window.innerWidth}`, pin: true, scrub: .45, invalidateOnRefresh: true, snap: { snapTo: 1 / (CATEGORY_ORDER.length - 1), duration: .25 } } });
      track.querySelectorAll<HTMLElement>(".film-panel").forEach((panel) => {
        gsap.fromTo(panel.querySelector("img"), { xPercent: -5, scale: 1.16 }, { xPercent: 5, scale: 1.16, ease: "none", scrollTrigger: { trigger: panel, containerAnimation: travel, start: "left right", end: "right left", scrub: true } });
        gsap.fromTo(panel.querySelector(".film-title"), { x: 70, opacity: .35 }, { x: -30, opacity: 1, ease: "none", scrollTrigger: { trigger: panel, containerAnimation: travel, start: "left right", end: "center center", scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);
  return <section className="film" ref={root} aria-label="Explore our eight food categories"><div className="film-track">{CATEGORY_ORDER.map((slug, index) => <article className="film-panel" key={slug}><Image src={photoFor(slug)} alt="" fill sizes="100vw" draggable={false}/><div className="film-shade"/><div className="film-top"><span>THE FOOD FLOW CUT</span><span>ALL YOUR FAVOURITES / IN THE FRAME</span></div><div className="film-title"><span>ONE MOOD.</span><br/>THEN ANOTHER.</div><div className="film-bottom"><span>{labels[slug]}</span><span>0{index + 1} / 08</span></div></article>)}</div></section>;
}

export function ParallaxMotion() {
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const deal = document.querySelector<HTMLElement>(".deal-image img");
      if (deal) gsap.fromTo(deal, { yPercent: -8, scale: 1.2 }, { yPercent: 8, scale: 1.2, ease: "none", scrollTrigger: { trigger: ".deal-section", start: "top bottom", end: "bottom top", scrub: .8 } });
      document.querySelectorAll<HTMLElement>(".showcase-card img").forEach((image) => {
        gsap.fromTo(image, { yPercent: -12, scale: 1.3, rotate: -2 }, { yPercent: 12, scale: 1.3, rotate: 2, ease: "none", scrollTrigger: { trigger: image.parentElement ?? image, start: "top bottom", end: "bottom top", scrub: .45 } });
      });
      gsap.fromTo(".showcase-card", { y: 65, opacity: .25 }, { y: 0, opacity: 1, stagger: .08, duration: .8, ease: "power3.out", scrollTrigger: { trigger: ".showcase-grid", start: "top 85%", once: true } });
      gsap.fromTo(".deal-copy", { y: 60 }, { y: -30, ease: "none", scrollTrigger: { trigger: ".deal-section", start: "top bottom", end: "bottom top", scrub: .4 } });
      gsap.fromTo(".ways>div", { y: 45, opacity: .3 }, { y: 0, opacity: 1, duration: .7, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".ways", start: "top 85%", once: true } });
    });
    return () => ctx.revert();
  }, []);
  return null;
}
