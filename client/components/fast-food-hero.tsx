"use client";

import { useLayoutEffect, useRef, type PointerEvent } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import Link from "next/link";
import Image from "next/image";
import { photoFor } from "@/lib/foodflow";

const LETTERS = ["FAST", "FOOD"].map((word) => [...word]);
const RADIUS = 240;
gsap.registerPlugin(SplitText);

function applyInfluence(el: HTMLElement, k: number) {
  el.style.transform = `translate3d(0, ${(-26 * k).toFixed(1)}px, 0) scale(${(1 + .38 * k).toFixed(3)})`;
  el.style.filter = `blur(${(1.5 * (1 - k)).toFixed(2)}px)`;
  el.style.opacity = String(.78 + .22 * k);
  el.style.webkitTextStrokeColor = `rgba(255,255,255,${(.14 + .45 * k).toFixed(2)})`;
}

function resetLetter(el: HTMLElement) { applyInfluence(el, 0); }

export function FastFoodHero() {
  const root = useRef<HTMLElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!root.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".poster-type", { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", delay: .25 });
      const headline = root.current?.querySelector<HTMLElement>(".poster-headline h2");
      if (headline) {
        const split = SplitText.create(headline, { type: "words", mask: "words" });
        gsap.fromTo(split.words, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .75, ease: "power3.out", stagger: .075, delay: .55, onComplete: () => split.revert() });
      }
      gsap.fromTo(".poster-side figure", { y: 70, opacity: 0, rotate: 0 }, { y: 0, opacity: 1, rotate: (i: number) => i ? -5 : 5, duration: .85, ease: "power3.out", stagger: .15, delay: .75 });
    }, root);
    return () => { ctx.revert(); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, []);

  const onMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!pointer.current) return;
      root.current?.querySelectorAll<HTMLElement>("[data-letter]").forEach((el) => {
        const box = el.getBoundingClientRect();
        const transform = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const distance = Math.hypot(pointer.current!.x - (box.left + box.width / 2), pointer.current!.y - (box.top + box.height / 2 - transform.m42));
        const t = Math.max(0, 1 - distance / RADIUS);
        applyInfluence(el, t * t * (3 - 2 * t));
      });
    });
  };
  const onLeave = () => {
    pointer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    root.current?.querySelectorAll<HTMLElement>("[data-letter]").forEach(resetLetter);
  };

  return <section className="poster-hero" ref={root} onPointerMove={onMove} onPointerLeave={onLeave} aria-label="FoodFlow fast food collection">
    <div className="poster">
      <div className="poster-meta"><span>FOOD FLOW / THE CRAVING COLLECTION</span><span>08 CATEGORIES. NO WRONG CHOICES.</span></div>
      <h1 className="poster-type" aria-label="FAST FOOD">
        {LETTERS.map((word, wi) => <span className="poster-word" aria-hidden="true" key={wi}>{word.map((letter, li) => <span data-letter key={`${wi}-${li}`}>{letter}</span>)}</span>)}
      </h1>
      <div className="poster-note"><i />FOR THE BIG APPETITES.<br />THE EXTRA-FRIES PEOPLE.<br />THE ONE MORE BITE PEOPLE.</div>
      <div className="poster-side"><figure><Image src={photoFor("pizza")} alt="Pepperoni pizza" width={500} height={350} draggable={false}/><figcaption>01 — PIZZA / SLICE INTO IT</figcaption></figure><figure><Image src={photoFor("fries-sides")} alt="Golden French fries" width={500} height={350} draggable={false}/><figcaption>04 — FRIES & SIDES</figcaption></figure></div>
      <div className="poster-headline"><span className="eyebrow">WHATEVER YOU&apos;RE HUNGRY FOR.</span><h2>ALL YOUR FAVOURITES.<br />FULL VOLUME.</h2></div>
      <Link className="poster-order" href="/menu"><span>FIND YOUR<br />NEXT BITE</span><b aria-hidden="true">→</b></Link>
      <div className="poster-foot"><span>DINE IN / TAKEAWAY / DELIVERY</span><span>SCROLL TO EXPLORE ↓</span></div>
    </div>
  </section>;
}
