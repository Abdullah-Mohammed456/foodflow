"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Image from "next/image";
import { editorialPhotoFor } from "@/lib/foodflow";

gsap.registerPlugin(ScrollTrigger);

export function FastFoodHero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let started = false;
    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>(".poster-word", section);
      const move = words.map((word) => gsap.quickTo(word, "y", { duration: .6, ease: "power3.out" }));
      const shift = words.map((word) => {
        const position = { x: 50 };
        return gsap.quickTo(position, "x", { duration: .8, ease: "power3.out", onUpdate: () => { word.style.backgroundPosition = `${position.x}% 51%`; } });
      });
      const enter = (event: PointerEvent) => {
        if (event.pointerType === "touch" || !started) return;
        words.forEach((word, index) => {
          const box = word.getBoundingClientRect();
          const influence = Math.max(0, 1 - Math.abs(event.clientY - (box.top + box.height / 2)) / box.height);
          move[index]?.(-8 * influence);
          shift[index]?.(gsap.utils.clamp(48, 52, 48 + (event.clientX - box.left) / box.width * 4));
        });
      };
      const leave = () => { move.forEach((to) => to(0)); shift.forEach((to) => to(50)); };
      section.addEventListener("pointermove", enter);
      section.addEventListener("pointerleave", leave);
      return () => { section.removeEventListener("pointermove", enter); section.removeEventListener("pointerleave", leave); };
    }, section);
    const start = () => {
      if (started) return;
      started = true;
      ctx.add(() => {
        gsap.fromTo(".poster-word", { y: 55, opacity: .2 }, { y: 0, opacity: 1, duration: 1.05, stagger: .12, ease: "power3.out" });
        gsap.fromTo(".poster-side figure", { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: .85, stagger: .12, ease: "power3.out" });
        gsap.fromTo(".poster-line span", { yPercent: 110 }, {
          yPercent: 0, duration: .9, stagger: .14, ease: "power3.out",
          scrollTrigger: { trigger: ".poster-headline", start: "top 90%", once: true },
        });
        ScrollTrigger.refresh();
      });
    };
    window.addEventListener("foodflow:intro-complete", start);
    if (!document.querySelector(".landing-intro")) start();
    return () => { window.removeEventListener("foodflow:intro-complete", start); ctx.revert(); };
  }, []);

  return <section className="poster-hero" ref={root} aria-label="FoodFlow fast food collection">
    <div className="poster">
      <div className="poster-meta"><span>FOOD FLOW / THE CRAVING COLLECTION</span><span>08 CATEGORIES. NO WRONG CHOICES.</span></div>
      <h1 className="poster-type" aria-label="FAST FOOD"><span className="poster-word" aria-hidden="true">FAST</span><span className="poster-word" aria-hidden="true">FOOD</span></h1>
      <div className="poster-note"><i />FOR THE BIG APPETITES.<br />THE EXTRA-FRIES PEOPLE.<br />THE ONE MORE BITE PEOPLE.</div>
      <div className="poster-side"><figure><Image src={editorialPhotoFor("pizza")} alt="Freshly baked pizza" width={500} height={350} draggable={false}/><figcaption>01 — PIZZA / SLICE INTO IT</figcaption></figure><figure><Image src={editorialPhotoFor("fries-sides")} alt="Golden French fries" width={500} height={350} draggable={false}/><figcaption>04 — FRIES & SIDES</figcaption></figure></div>
      <div className="poster-headline"><span className="eyebrow">WHATEVER YOU&apos;RE HUNGRY FOR.</span><h2 aria-label="All your favourites. Full volume."><span className="poster-line" aria-hidden="true"><span>ALL YOUR FAVOURITES.</span></span><span className="poster-line" aria-hidden="true"><span>FULL VOLUME.</span></span></h2></div>
      <Link className="poster-order" href="/menu"><span>FIND YOUR<br />NEXT BITE</span><b aria-hidden="true">→</b></Link>
      <div className="poster-foot"><span>DINE IN / TAKEAWAY / DELIVERY</span><span>SCROLL TO EXPLORE ↓</span></div>
    </div>
  </section>;
}
