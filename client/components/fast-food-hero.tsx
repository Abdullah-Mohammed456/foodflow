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

function applyInfluence(el: HTMLElement, k: number, movement = 0, index = 0) {
  const glitch = k * movement;
  const direction = index % 2 === 0 ? 1 : -1;
  const slice = Math.sin(performance.now() * .045 + index * 2.4);
  el.style.transform = `translate3d(${(direction * 20 * glitch * slice).toFixed(1)}px, ${(-26 * k + (index % 3 - 1) * 12 * glitch).toFixed(1)}px, 0) scale(${(1 + .24 * k).toFixed(3)}) skewX(${(direction * 9 * glitch * slice).toFixed(2)}deg)`;
  el.style.filter = `blur(${(.7 * (1 - k) + .6 * glitch).toFixed(2)}px) drop-shadow(${(direction * 12 * glitch).toFixed(1)}px 0 0 rgba(238,77,54,${(.85 * glitch).toFixed(2)})) drop-shadow(${(-direction * 12 * glitch).toFixed(1)}px 0 0 rgba(87,190,205,${(.85 * glitch).toFixed(2)}))`;
  el.style.backgroundPosition = `${(50 + direction * 12 * glitch * slice).toFixed(1)}% ${51 + glitch * 8}%`;
  el.style.opacity = String(.78 + .22 * k);
  el.style.webkitTextStrokeColor = `rgba(255,255,255,${(.14 + .45 * k + .32 * glitch).toFixed(2)})`;
}

function resetLetter(el: HTMLElement) { applyInfluence(el, 0); }

export function FastFoodHero() {
  const root = useRef<HTMLElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; at: number } | null>(null);
  const frame = useRef<number | null>(null);
  const settle = useRef<number | null>(null);

  const updateLetters = (movement: number) => {
    const point = pointer.current;
    if (!point) return;
    const letters = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-letter]") ?? []);
    const distances = letters.map((el) => {
      const box = el.getBoundingClientRect();
      const transform = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return Math.hypot(point.x - (box.left + box.width / 2 - transform.m41), point.y - (box.top + box.height / 2 - transform.m42));
    });
    letters.forEach((el, index) => {
      const t = Math.max(0, 1 - (distances[index] ?? Infinity) / RADIUS);
      applyInfluence(el, t * t * (3 - 2 * t), movement, index);
    });
  };

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
    return () => { ctx.revert(); if (frame.current !== null) cancelAnimationFrame(frame.current); if (settle.current !== null) window.clearTimeout(settle.current); };
  }, []);

  const onMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (settle.current !== null) window.clearTimeout(settle.current);
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const point = pointer.current;
      if (!point) return;
      const now = performance.now();
      const previous = lastPointer.current;
      const speed = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) / Math.max(16, now - previous.at) : 0;
      lastPointer.current = { ...point, at: now };
      updateLetters(Math.min(1, .22 + speed / .8));
      settle.current = window.setTimeout(() => updateLetters(0), 90);
    });
  };
  const onLeave = () => {
    pointer.current = null;
    lastPointer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (settle.current !== null) window.clearTimeout(settle.current);
    frame.current = null;
    settle.current = null;
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
