"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

function HeroCta() {
  const root = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(hover: hover) and (prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const inner = el.querySelector(".hero-cta-inner");
        const fill = el.querySelector(".hero-cta-fill");
        const sheen = el.querySelector(".hero-cta-sheen");
        const press = el.querySelector(".hero-cta-press");
        gsap.set(fill, { scale: 0, xPercent: -50, yPercent: -50 });
        gsap.set(".hero-cta-second", { y: 0, yPercent: 100 });
        gsap.set(".hero-cta-arrow-dup", { x: -28 });
        gsap.set(inner, { transformPerspective: 600 });
        const timeline = gsap
          .timeline({
            paused: true,
            defaults: { overwrite: "auto", ease: "power3.out" },
          })
          .to(fill, { scale: 2.5, duration: 0.6 }, 0)
          .to(
            inner,
            {
              y: -3,
              boxShadow: "0 14px 40px rgba(255,138,76,.45)",
              duration: 0.4,
            },
            0,
          )
          .to(".hero-cta-first", { yPercent: -100, duration: 0.45 }, 0)
          .to(".hero-cta-second", { yPercent: 0, duration: 0.45 }, 0)
          .to(".hero-cta-arrow-main", { x: 28, duration: 0.45 }, 0)
          .to(".hero-cta-arrow-dup", { x: 0, duration: 0.45 }, 0);
        const tiltX = gsap.quickTo(inner, "rotationX", {
          duration: 0.5,
          ease: "power3.out",
        });
        const tiltY = gsap.quickTo(inner, "rotationY", {
          duration: 0.5,
          ease: "power3.out",
        });
        const place = (event?: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          gsap.set(fill, {
            left: event ? event.clientX - rect.left : rect.width / 2,
            top: event ? event.clientY - rect.top : rect.height / 2,
          });
        };
        const play = (event?: PointerEvent) => {
          place(event);
          timeline.timeScale(1).play();
          gsap.fromTo(
            sheen,
            { xPercent: -120 },
            {
              xPercent: 120,
              duration: 0.8,
              ease: "power2.inOut",
              overwrite: "auto",
              onComplete: () => {
                gsap.set(sheen, { xPercent: -120 });
              },
            },
          );
        };
        const resetTilt = () => {
          tiltX(0);
          tiltY(0);
        };
        const enter = (event: PointerEvent) => {
          if (event.pointerType === "mouse") play(event);
        };
        const leave = (event: PointerEvent) => {
          resetTilt();
          gsap.to(press, {
            scale: 1,
            duration: 0.25,
            ease: "back.out(2)",
            overwrite: "auto",
          });
          if (el.matches(":focus-visible")) return;
          place(event);
          timeline.timeScale(Math.max(timeline.time() / 0.45, 0.1)).reverse();
        };
        const move = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const rect = el.getBoundingClientRect();
          tiltX(
            gsap.utils.clamp(
              -6,
              6,
              -((event.clientY - rect.top) / rect.height - 0.5) * 12,
            ),
          );
          tiltY(
            gsap.utils.clamp(
              -6,
              6,
              ((event.clientX - rect.left) / rect.width - 0.5) * 12,
            ),
          );
        };
        const focus = () => {
          if (el.matches(":focus-visible")) play();
        };
        const blur = () => {
          resetTilt();
          if (!el.matches(":hover"))
            timeline.timeScale(Math.max(timeline.time() / 0.45, 0.1)).reverse();
        };
        const down = () => {
          gsap.to(press, { scale: 0.96, duration: 0.15, overwrite: "auto" });
        };
        const up = () => {
          gsap.to(press, {
            scale: 1,
            duration: 0.35,
            ease: "back.out(2)",
            overwrite: "auto",
          });
        };
        // contextSafe-style registration keeps event-created tweens in the same cleanup scope.
        const events = {
          pointerenter: enter,
          pointerleave: leave,
          pointermove: move,
          focus,
          blur,
          pointerdown: down,
          pointerup: up,
          pointercancel: up,
        };
        const handlers = Object.entries(events).map(([name, handler]) => {
          const wrapped = (event: Event) => {
            ctx.add(() => handler(event as PointerEvent));
          };
          el.addEventListener(name, wrapped);
          return [name, wrapped] as const;
        });
        return () =>
          handlers.forEach(([name, handler]) =>
            el.removeEventListener(name, handler),
          );
      }, el);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <Link
      ref={root}
      className="action restaurant-cta hero-cta-anim"
      href="/menu"
    >
      <span className="hero-cta-press">
        <span className="hero-cta-inner">
          <span className="hero-cta-fill" aria-hidden="true" />
          <span className="hero-cta-sheen" aria-hidden="true" />
          <span className="hero-cta-labelmask">
            <span className="hero-cta-first">LET’S EAT</span>
            <span className="hero-cta-second" aria-hidden="true">
              LET’S EAT
            </span>
          </span>
          <span className="hero-cta-arrowmask">
            <span
              className="hero-cta-arrow hero-cta-arrow-main"
              aria-hidden="true"
            >
              →
            </span>
            <span
              className="hero-cta-arrow hero-cta-arrow-dup"
              aria-hidden="true"
            >
              →
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}

export function RestaurantHero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("@/lib/restaurant-scene")
      .then(({ mountRestaurantScene }) => {
        if (!cancelled) dispose = mountRestaurantScene(section);
      })
      .catch(() => {
        if (!cancelled) {
          section.setAttribute("data-scene", "fallback");
          window.dispatchEvent(new Event("foodflow:scene-ready"));
        }
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  return (
    <section
      ref={root}
      className="restaurant-hero"
      aria-label="FoodFlow — good food, good mood"
    >
      <a href="#menu" className="story-skip">
        Skip to the menu
      </a>
      <div className="restaurant-stage">
        <div className="restaurant-orbit" aria-hidden="true" />
        <div className="restaurant-scene" aria-hidden="true" />
        <div className="restaurant-copy">
          <span className="eyebrow">FOOD FLOW / MADE FOR YOUR MOOD</span>
          <h1>
            GOOD FOOD
            <br />
            GOOD MOOD
          </h1>
          <p>
            Your favourites. Your people.
            <br />A little something worth slowing down for.
          </p>
          <HeroCta />
        </div>
        <div className="restaurant-third">
          <span className="eyebrow">BRING YOUR APPETITE</span>
          <h2>
            A little chill.
            <br />A lot of flavour.
          </h2>
          <p>
            From the first bite to the last sip.
            <br />
            Make room for your favourites.
          </p>
        </div>
        <div className="restaurant-fourth">
          <span className="eyebrow">GOOD TIMES ON THE WAY</span>
          <h2>
            Sip. Smile.
            <br />
            Repeat.
          </h2>
        </div>
        <div className="restaurant-second">
          <span className="eyebrow">A FRESH PERSPECTIVE</span>
          <h2>
            Make it
            <br />a moment.
          </h2>
          <Link href="/menu" className="action restaurant-cta">
            EXPLORE THE MENU <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="restaurant-foot">
          <span>DINE IN / TAKE AWAY / DELIVERY</span>
          <span>
            SCROLL TO GET A TASTE <span aria-hidden="true">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}
