"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { lockBodyScroll } from "@/lib/scroll-lock";

export function LandingIntro() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.style.visibility = "hidden";
      const frame = requestAnimationFrame(() => {
        setVisible(false);
        window.dispatchEvent(new Event("foodflow:intro-complete"));
      });
      return () => cancelAnimationFrame(frame);
    }
    const unlock = lockBodyScroll();
    const ctx = gsap.context(() => {
      const bites = element.querySelectorAll<SVGCircleElement>(".intro-bite");
      const loop = gsap.timeline({ repeat: -1 });
      loop
        .to(bites, {
          attr: { r: 40 },
          duration: 0.35,
          stagger: 0.22,
          ease: "power2.out",
        })
        .to(bites, {
          attr: { r: 0 },
          duration: 0.1,
          stagger: 0.02,
          delay: 0.4,
        });
      let ended = false;
      let disposed = false;
      let exit: gsap.core.Timeline | undefined;
      let loadedTimer: number | undefined;
      const finish = () => {
        if (ended || disposed) return;
        ended = true;
        loop.kill();
        exit = gsap
          .timeline({
            onComplete: () => {
              setVisible(false);
              unlock();
              window.dispatchEvent(new Event("foodflow:intro-complete"));
            },
          })
          .to(bites, {
            attr: { r: 54 },
            duration: 0.18,
            stagger: 0.025,
            ease: "power2.out",
          })
          .to(element, {
            yPercent: -100,
            duration: 0.65,
            ease: "power3.inOut",
          });
      };
      const ready = () => {
        document.fonts.ready.then(() => {
          if (!disposed) loadedTimer = window.setTimeout(finish, 350);
        });
      };
      window.addEventListener("foodflow:scene-ready", ready, { once: true });
      if (
        document.querySelector(
          ".restaurant-hero[data-scene=ready],.restaurant-hero[data-scene=fallback]",
        )
      )
        ready();
      const timeout = window.setTimeout(finish, 8000);
      const skip = element.querySelector<HTMLButtonElement>(".intro-skip");
      skip?.addEventListener("click", finish);
      return () => {
        disposed = true;
        window.removeEventListener("foodflow:scene-ready", ready);
        window.clearTimeout(timeout);
        window.clearTimeout(loadedTimer);
        skip?.removeEventListener("click", finish);
        loop.kill();
        exit?.kill();
      };
    }, element);
    return () => {
      ctx.revert();
      unlock();
    };
  }, []);
  if (!visible) return null;
  return (
    <div className="landing-intro" ref={root} aria-label="Loading Food Flow">
      <div className="intro-brand">
        <span>FOOD</span> <span>FLOW</span>
        <sup>®</sup>
      </div>
      <span className="intro-edition">GOOD FOOD. WORTH THE WAIT.</span>
      <div className="intro-center">
        <svg viewBox="0 0 260 200" role="img" aria-label="Burger being eaten">
          <defs>
            <mask id="intro-bites">
              <rect width="260" height="200" fill="white" />
              <circle
                className="intro-bite"
                cx="220"
                cy="43"
                r="0"
                fill="black"
              />
              <circle
                className="intro-bite"
                cx="231"
                cy="113"
                r="0"
                fill="black"
              />
              <circle
                className="intro-bite"
                cx="196"
                cy="167"
                r="0"
                fill="black"
              />
              <circle
                className="intro-bite"
                cx="112"
                cy="178"
                r="0"
                fill="black"
              />
              <circle
                className="intro-bite"
                cx="44"
                cy="142"
                r="0"
                fill="black"
              />
              <circle
                className="intro-bite"
                cx="39"
                cy="62"
                r="0"
                fill="black"
              />
              <circle
                className="intro-bite"
                cx="123"
                cy="45"
                r="0"
                fill="black"
              />
            </mask>
          </defs>
          <g mask="url(#intro-bites)">
            <path d="M26 83C27 4 233 4 234 83Z" fill="#d69545" />
            <path d="M32 70C45 8 210 12 227 70" fill="#e6b56c" />
            <g stroke="#f7e4b8" strokeWidth="5" strokeLinecap="round">
              <path d="M70 43l5 -3M110 29l5 2M148 34l5 -2M184 48l5 3M93 60l5 -3M139 57l5 2" />
            </g>
            <rect x="21" y="88" width="218" height="14" rx="7" fill="#ab3d28" />
            <path
              d="M20 109l20 -8 23 9 21 -9 25 9 24 -10 25 10 28 -9 22 9 30 -6v18H20Z"
              fill="#55745c"
            />
            <rect
              x="22"
              y="119"
              width="216"
              height="25"
              rx="12"
              fill="#593320"
            />
            <path
              d="M24 119h209l-43 26 -38 -16 -46 20 -32 -17Z"
              fill="#e8b944"
            />
            <rect
              x="28"
              y="144"
              width="204"
              height="15"
              rx="7"
              fill="#633c27"
            />
            <path
              d="M25 161h210c-5 31 -21 33 -105 33S29 191 25 161"
              fill="#d69545"
            />
          </g>
        </svg>
        <h2>ONE BITE CLOSER.</h2>
        <p>GETTING THE GOOD STUFF READY</p>
        <div className="intro-progress">
          <span />
        </div>
      </div>
      <span className="intro-bottom">
        PIZZA / BURGERS / EVERYTHING YOU LOVE
      </span>
      <button className="intro-skip" type="button">
        SKIP INTRO →
      </button>
    </div>
  );
}
