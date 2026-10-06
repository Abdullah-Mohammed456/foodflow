"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { CATEGORY_ORDER, editorialPhotoFor } from "@/lib/foodflow";

gsap.registerPlugin(ScrollTrigger);

const labels: Record<string, string> = {
  pizza: "PIZZA",
  burgers: "BURGERS",
  sandwiches: "SANDWICHES",
  "fries-sides": "FRIES & SIDES",
  chicken: "CHICKEN",
  drinks: "DRINKS",
  desserts: "DESSERTS",
  "combos-deals": "COMBOS & DEALS",
};

export function HorizontalCategories() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const track = section.querySelector<HTMLElement>(".film-track");
        if (!track) return;
        const horizontal = gsap.to(track, {
          x: () => -(track.scrollWidth - section.clientWidth),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.25,
            invalidateOnRefresh: true,
          },
        });
        track
          .querySelectorAll<HTMLElement>(".film-panel")
          .forEach((panel, index) => {
            const image = panel.querySelector(".film-photo");
            const copy = panel.querySelector(".film-title");
            gsap.fromTo(
              image,
              { xPercent: -7 },
              {
                xPercent: 7,
                ease: "none",
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: horizontal,
                  start: "left right",
                  end: "right left",
                  scrub: 0.5,
                },
              },
            );
            gsap.fromTo(
              copy,
              { x: 65 },
              {
                x: -65,
                ease: "none",
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: horizontal,
                  start: "left right",
                  end: "right left",
                  scrub: 0.5,
                },
              },
            );
            // Depth reveal behind the WebGL gates: dark veil lifts + photo settles forward,
            // scrubbed by the SAME horizontal (containerAnimation) progress that drives
            // mountFilmGates via horizontal.progress(). Same trigger window, ease "none",
            // so scroll forward/backward reverses veil + image in perfect sync with the gate.
            // Targets the inner img (not the .film-photo wrapper above) so the existing
            // wrapper parallax above is preserved, not stacked/replaced. No blur, no filter:
            // veil opacity + transform only (GPU friendly). Covers every panel including index 0.
            const photo = panel.querySelector<HTMLElement>(".film-photo img");
            const veil = panel.querySelector<HTMLElement>(".film-veil");
            if (!photo || !veil) return;
            if (index === 0) {
              gsap.set(veil, { opacity: 0 });
              return;
            }
            const depth = gsap.timeline({
              scrollTrigger: {
                trigger: panel,
                containerAnimation: horizontal,
                start: "left right",
                end: "right left",
                scrub: 0.5,
              },
            });
            depth.fromTo(
              veil,
              { opacity: 1 },
              { opacity: 1, duration: 0.3, ease: "none" },
              0,
            );
            depth.to(veil, { opacity: 0, ease: "none", duration: 0.35 }, 0.3);
            depth.to({}, { duration: 0.35 }, 0.65);
          });
        const resize = new ResizeObserver(() => ScrollTrigger.refresh());
        const before = document.querySelector(".menu-section");
        if (before) resize.observe(before);
        let disposed = false;
        let disposeGates: (() => void) | undefined;
        const gateHost =
          section.querySelector<HTMLElement>(".film-gates-scene");
        if (gateHost)
          import("@/lib/film-gates")
            .then(({ mountFilmGates }) => {
              if (!disposed)
                disposeGates = mountFilmGates(
                  gateHost,
                  () => horizontal.progress(),
                  CATEGORY_ORDER.length,
                );
            })
            .catch(() => {});
        document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });
        return () => {
          disposed = true;
          disposeGates?.();
          resize.disconnect();
        };
      },
      section,
    );
    return () => mm.revert();
  }, []);
  return (
    <section
      className="film"
      ref={root}
      aria-label="Explore our eight food categories"
    >
      <div className="film-window">
        <div className="film-gates-scene" aria-hidden="true" />
        <div className="film-track">
          {CATEGORY_ORDER.map((slug, index) => (
            <article
              className={`film-panel ${index % 2 ? "film-dark" : "film-light"}`}
              key={slug}
            >
              <div className="film-photo">
                <Image
                  src={editorialPhotoFor(slug)}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 100vw, 65vw"
                  draggable={false}
                />
                <div className="film-veil" aria-hidden="true" />
              </div>
              <div className="film-top">
                <span>THE FOOD FLOW CUT</span>
                <span>08 CRAVINGS. YOUR CALL.</span>
              </div>
              <div className="film-title">
                <span>0{index + 1}</span>
                <h2>{labels[slug]}</h2>
                <Link className="action" href={`/menu?category=${slug}`}>
                  EXPLORE {labels[slug]}
                </Link>
              </div>
              <div className="film-bottom">
                <span>GOOD FOOD. EVERY MOOD.</span>
                <span>0{index + 1} / 08</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ParallaxMotion() {
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const deal = document.querySelector<HTMLElement>(".deal-image img");
      if (deal)
        gsap.fromTo(
          deal,
          { yPercent: -8, scale: 1.2 },
          {
            yPercent: 8,
            scale: 1.2,
            ease: "none",
            scrollTrigger: {
              trigger: ".deal-section",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          },
        );
      document
        .querySelectorAll<HTMLElement>(".showcase-card img")
        .forEach((image) => {
          gsap.fromTo(
            image,
            { yPercent: -12, scale: 1.3, rotate: -2 },
            {
              yPercent: 12,
              scale: 1.3,
              rotate: 2,
              ease: "none",
              scrollTrigger: {
                trigger: image.parentElement ?? image,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.45,
              },
            },
          );
        });
      gsap.fromTo(
        ".showcase-card",
        { y: 65, opacity: 0.25 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".showcase-grid",
            start: "top 85%",
            once: true,
          },
        },
      );
      gsap.fromTo(
        ".deal-copy",
        { y: 60 },
        {
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: ".deal-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.4,
          },
        },
      );
      gsap.fromTo(
        ".ways>div",
        { y: 45, opacity: 0.3 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".ways", start: "top 85%", once: true },
        },
      );
    });
    return () => ctx.revert();
  }, []);
  return null;
}
