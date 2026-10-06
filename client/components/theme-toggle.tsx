"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { CustomWiggle } from "gsap/CustomWiggle";

gsap.registerPlugin(CustomEase, CustomWiggle);


function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== "foodflow-theme") return;
    document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    callback();
  };
  window.addEventListener("foodflow:theme", callback);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener("foodflow:theme", callback); window.removeEventListener("storage", storage); };
}
function snapshot() { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  const root = useRef<HTMLButtonElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const button = root.current;
    if (!button) return;
    gsap.registerPlugin(CustomEase, CustomWiggle);
    CustomWiggle.create("foodflow-switch-wiggle", { wiggles: 5 });
    const animate = !first.current && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    first.current = false;
    const ctx = gsap.context(() => {
      const shape = button.querySelector(".theme-character");
      const limbs = button.querySelectorAll(".theme-limb");
      const target = theme === "dark" ? 92 : 0;
      gsap.fromTo(shape, { x: animate ? 92 - target : target }, { x: target, duration: animate ? .85 : 0, ease: "elastic.out(1,.6)" });
      if (animate) gsap.fromTo(limbs, { rotation: theme === "dark" ? -30 : 30, transformOrigin: "50% 0%" }, { rotation: 0, duration: .85, ease: "foodflow-switch-wiggle" });
      const eyes = button.querySelector(".theme-eyes");
      const x = gsap.quickTo(eyes, "x", { duration: .2 });
      const y = gsap.quickTo(eyes, "y", { duration: .2 });
      const move = (event: PointerEvent) => { if (event.pointerType !== "mouse" || !animate && matchMedia("(prefers-reduced-motion: reduce)").matches) return; const bounds = button.getBoundingClientRect(); x(gsap.utils.clamp(-3, 3, (event.clientX - bounds.left - bounds.width / 2) / 12)); y(gsap.utils.clamp(-2, 2, (event.clientY - bounds.top - bounds.height / 2) / 12)); };
      const reset = () => { x(0); y(0); };
      button.addEventListener("pointermove", move); button.addEventListener("pointerleave", reset);
      return () => { button.removeEventListener("pointermove", move); button.removeEventListener("pointerleave", reset); };
    }, button);
    return () => ctx.revert();
  }, [theme]);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("foodflow-theme", next); } catch {}
    window.dispatchEvent(new Event("foodflow:theme"));
  };
  return <button className="theme-toggle" type="button" ref={root} role="switch" aria-checked={theme === "dark"} aria-label="Dark mode" onClick={toggle}>
    <svg viewBox="0 0 160 66" aria-hidden="true"><rect className="theme-track" x="1" y="1" width="158" height="64" rx="32"/><circle cx="32" cy="33" r="10" fill="#edbd6b"/><path d="M125 22a12 12 0 1 0 11 17 13 13 0 0 1-11-17" fill="#f7f4ec"/>
      <g className="theme-character"><circle cx="34" cy="33" r="28" fill="#f7f4ec"/><g className="theme-limb" stroke="#673c26" strokeWidth="3" strokeLinecap="round"><path d="M14 36l-5 5M53 36l5 5M24 47l-3 6M43 47l3 6"/></g><path d="M16 29c0-20 36-20 36 0" fill="#e8ae59"/><rect x="15" y="30" width="38" height="5" rx="2" fill="#5a794e"/><rect x="15" y="35" width="38" height="7" rx="3" fill="#673c26"/><path d="M16 43h36c-2 11-34 11-36 0" fill="#e8ae59"/><g className="theme-eyes" fill="#191b18"><circle cx="28" cy="23" r="2"/><circle cx="40" cy="23" r="2"/></g></g>
    </svg><span>{theme === "dark" ? "DARK" : "LIGHT"}</span>
  </button>;
}
