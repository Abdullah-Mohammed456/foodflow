"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

export function PageMotion() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const main = document.querySelector("main");
    if (!main || pathname === "/" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const ctx = gsap.context(() => {
      gsap.fromTo(".page-lead-copy", { y: 30, opacity: .3 }, { y: 0, opacity: 1, duration: .65, ease: "power3.out" });
      gsap.fromTo(".page-lead-image", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: .85, ease: "power3.inOut" });
    }, main);
    const viewport = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
      visible.forEach((element) => viewport.unobserve(element));
      if (visible.length) ctx.add(() => {
        gsap.fromTo(visible, { y: 30, opacity: .3 }, { y: 0, opacity: 1, stagger: .055, duration: .55, ease: "power3.out", clearProps: "transform,opacity" });
      });
    }, { threshold: .12 });
    const observe = () => main.querySelectorAll(".product-card,.metric,.panel,.kitchen-card").forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      viewport.observe(element);
    });
    observe();
    const changes = new MutationObserver(observe);
    changes.observe(main, { subtree: true, childList: true });
    return () => { changes.disconnect(); viewport.disconnect(); ctx.revert(); };
  }, [pathname]);
  return null;
}
