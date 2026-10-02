"use client";

import gsap from "gsap";
import Image, { type StaticImageData } from "next/image";
import { useLayoutEffect, useRef } from "react";
import styles from "./helmet-reveal.module.css";

type HelmetRevealProps = {
  baseSrc: string | StaticImageData;
  helmetSrc: string | StaticImageData;
  alt: string;
  className?: string;
  radius?: number;
};

export function HelmetReveal({
  baseSrc,
  helmetSrc,
  alt,
  className,
  radius = 160,
}: HelmetRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const mask = maskRef.current;
    if (!container || !mask) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(hover: none), (pointer: coarse)").matches
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        container,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" },
      );

      gsap.set(mask, {
        "--mx": "0px",
        "--my": "0px",
        "--radius": `${radius}px`,
        "--reveal": 0,
      });

      const position = { x: 0, y: 0, radius };
      const moveX = gsap.quickTo(position, "x", {
        duration: 0.45,
        ease: "power3.out",
        onUpdate: () => mask.style.setProperty("--mx", `${position.x}px`),
      });
      const moveY = gsap.quickTo(position, "y", {
        duration: 0.45,
        ease: "power3.out",
        onUpdate: () => mask.style.setProperty("--my", `${position.y}px`),
      });
      const growRadius = gsap.quickTo(position, "radius", {
        duration: 0.24,
        ease: "power2.out",
        onUpdate: () =>
          mask.style.setProperty("--radius", `${position.radius}px`),
      });
      const limitScale = gsap.utils.clamp(1, 1.35);

      let previousX = 0;
      let previousY = 0;
      let previousTime = 0;

      function point(event: PointerEvent) {
        const rect = container!.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const now = performance.now();
        const elapsed = Math.max(16, now - previousTime);
        const velocity = previousTime
          ? Math.hypot(x - previousX, y - previousY) / elapsed
          : 0;

        moveX(x);
        moveY(y);
        growRadius(radius * limitScale(1 + velocity * 0.16));

        previousX = x;
        previousY = y;
        previousTime = now;
      }

      function enter(event: PointerEvent) {
        previousTime = 0;
        point(event);
        gsap.to(mask, {
          "--reveal": 1,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        });
      }

      function leave() {
        previousTime = 0;
        gsap.to(mask, {
          "--reveal": 0,
          duration: 0.32,
          ease: "power2.inOut",
          overwrite: true,
        });
      }

      container!.addEventListener("pointerenter", enter);
      container!.addEventListener("pointermove", point);
      container!.addEventListener("pointerleave", leave);

      return () => {
        container!.removeEventListener("pointerenter", enter);
        container!.removeEventListener("pointermove", point);
        container!.removeEventListener("pointerleave", leave);
        gsap.killTweensOf(position);
        gsap.killTweensOf(mask);
      };
    }, container);

    return () => ctx.revert();
  }, [radius]);

  return (
    <div
      ref={containerRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      <Image src={baseSrc} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className={styles.image} draggable={false} />
      <div ref={maskRef} className={styles.helmetLayer} aria-hidden="true">
        <Image src={helmetSrc} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className={styles.image} draggable={false} />
      </div>
    </div>
  );
}
