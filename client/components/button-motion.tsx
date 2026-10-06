"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

const SELECTOR = "button:not(.theme-toggle),.action:not(.hero-cta-anim),.small-action,.text-button,.hero-order";

export function ButtonMotion() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {});
      const motion = new WeakMap<HTMLElement, { y: ReturnType<typeof gsap.quickTo>; scaleX: ReturnType<typeof gsap.quickTo>; scaleY: ReturnType<typeof gsap.quickTo> }>();
      const animate = (button: HTMLElement, active: boolean) => {
        let move = motion.get(button);
        if (!move) {
          ctx.add(() => { move = { y: gsap.quickTo(button, "y", { duration: .25, ease: "power2.out" }), scaleX: gsap.quickTo(button, "scaleX", { duration: .25, ease: "power2.out" }), scaleY: gsap.quickTo(button, "scaleY", { duration: .25, ease: "power2.out" }) }; });
          if (move) motion.set(button, move);
        }
        move?.y(active ? -3 : 0); move?.scaleX(active ? 1.025 : 1); move?.scaleY(active ? 1.025 : 1);
      };
      const target = (event: Event) => event.target instanceof Element ? event.target.closest<HTMLElement>(SELECTOR) : null;
      const enter = (event: Event) => {
        const button = target(event);
        if (!button || button.matches(":disabled")) return;
        if (event instanceof PointerEvent && event.pointerType !== "mouse") return;
        if (event instanceof PointerEvent && event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) return;
        animate(button, true);
      };
      const leave = (event: Event) => {
        const button = target(event);
        if (!button) return;
        if (event instanceof PointerEvent && event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) return;
        animate(button, false);
      };
      document.addEventListener("pointerover", enter); document.addEventListener("pointerout", leave);
      document.addEventListener("focusin", enter); document.addEventListener("focusout", leave);
      return () => { document.removeEventListener("pointerover", enter); document.removeEventListener("pointerout", leave); document.removeEventListener("focusin", enter); document.removeEventListener("focusout", leave); ctx.revert(); };
    });
    return () => mm.revert();
  }, [pathname]);
  return null;
}
