"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import Image from "next/image";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export function FeatureReveal() {
  const root = useRef<HTMLElement>(null);
  const chicken = useRef<HTMLDivElement>(null);
  const [showChicken, setShowChicken] = useState(false);

  useLayoutEffect(() => {
    if (!root.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const frame = root.current?.querySelector<HTMLElement>(".feature-reveal-frame");
      const route = root.current?.querySelector<SVGPathElement>(".feature-reveal-route");
      const stamp = root.current?.querySelector<SVGGElement>(".feature-reveal-stamp");
      if (!frame || !route || !stamp) return;
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "+=100%", pin: true, scrub: .75 } })
        .fromTo(frame, { clipPath: "inset(38% 0 38% 0 round 22px)" }, { clipPath: "inset(0% 0 0% 0 round 0px)", ease: "none", duration: 1 }, 0)
        .fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: .15 }, .12)
        .to(stamp, { motionPath: { path: route, align: route, alignOrigin: [.5, .5] }, ease: "none", duration: .85 }, .1);
    }, root);
    return () => ctx.revert();
  }, []);

  const toggle = () => {
    const next = !showChicken;
    setShowChicken(next);
    if (!chicken.current) return;
    gsap.to(chicken.current, { clipPath: next ? "inset(0% 0 0% 0)" : "inset(0% 0 100% 0)", duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : .8, ease: "power3.inOut", overwrite: true });
  };

  return <section className="feature-reveal" ref={root} aria-label="Choose your craving">
    <div className="feature-reveal-frame">
      <Image src="/food/pizza.jpg" alt="Freshly baked pizza" fill sizes="100vw" draggable={false}/>
      <div className="feature-reveal-chicken" ref={chicken} aria-hidden={!showChicken}><Image src="/food/chicken.jpg" alt="Crispy fried chicken" fill sizes="100vw" draggable={false}/></div>
      <div className="feature-reveal-shade"/>
      <div className="feature-reveal-top"><span>FOOD FLOW / THE GOOD STUFF</span><span>01 / 02</span></div>
      <div className="feature-reveal-copy"><span className="eyebrow">ONE CRAVING LEADS TO ANOTHER</span><h2>GO BIG.<br/><em>GO AGAIN.</em></h2><p>Pizza tonight. Chicken tomorrow. Every craving gets its moment.</p><div className="feature-reveal-actions"><button type="button" onClick={toggle} aria-pressed={showChicken}>{showChicken ? "SHOW THE PIZZA" : "SHOW THE CHICKEN"}<span aria-hidden="true">→</span></button><Link href="/menu">EXPLORE THE MENU <span aria-hidden="true">→</span></Link></div></div>
      <svg className="feature-reveal-path" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path className="feature-reveal-route" d="M 80 460 C 200 140, 560 70, 860 230" fill="none" stroke="white" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="7 10"/><g className="feature-reveal-stamp"><circle r="43" fill="#e2bf7a"/><text y="-5" textAnchor="middle">GOOD</text><text y="16" textAnchor="middle">FOOD</text></g></svg>
      <span className="feature-reveal-foot">SCROLL TO REVEAL / TAP TO SWITCH</span>
    </div>
  </section>;
}
