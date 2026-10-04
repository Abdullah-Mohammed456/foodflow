import { FastFoodHero } from "@/components/fast-food-hero";
import { HealthPanel } from "@/components/health-panel";
import { API_BASE, type HealthData } from "@/lib/api";
import { CategoryRibbon, CategoryShowcase, MenuExplorer } from "@/components/menu-explorer";
import Link from "next/link";
import Image from "next/image";
import { photoFor } from "@/lib/foodflow";
import { HorizontalCategories, LandingIntro, ParallaxMotion } from "@/components/landing-motion";
import { FeatureReveal } from "@/components/feature-reveal";

async function getServerHealth(): Promise<HealthData | null> {
  try {
    const apiBase = process.env["API_INTERNAL_URL"] ?? API_BASE;
    const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: HealthData };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const serverHealth = await getServerHealth();

  return (
    <main>
      <LandingIntro />
      <ParallaxMotion />
      <FastFoodHero />
      <CategoryRibbon />
      <CategoryShowcase />
      <FeatureReveal />
      <HorizontalCategories />
      <MenuExplorer compact />
      <section className="deal-section"><div className="deal-image"><Image src={photoFor("combos-deals")} alt="Burger, fries and a drink" fill sizes="(max-width: 650px) 100vw, 50vw" draggable={false}/><span>BETTER<br />TOGETHER</span></div><div className="deal-copy"><span className="eyebrow">THE COMBO CLUB</span><h2>Why stop<br />at <em>one?</em></h2><p>Make a meal of it. Your favourite main, golden fries, and an ice-cold drink. All the good stuff, one order.</p><Link className="action light" href="/menu?category=combos-deals">MEET THE COMBOS <span>→</span></Link></div></section>
      <section className="ways wrap"><div><span className="eyebrow">YOUR FOOD. YOUR RULES.</span><h2>Good food.<br />Any way.</h2></div><div><span className="eyebrow">01 / STAY A WHILE</span><h3>Dine in.</h3><p>Grab a seat. Bring your people. Make a meal of the moment.</p></div><div><span className="eyebrow">02 / GRAB & GO</span><h3>Take away.</h3><p>Your favourites, packed and ready for wherever life takes you.</p></div><div><span className="eyebrow">03 / WE COME TO YOU</span><h3>Delivery.</h3><p>Big flavour. Front-door service. The best kind of staying in.</p></div></section>
      <section className="final-cta"><div className="wrap"><h2>Your next bite awaits.</h2><Link className="action light" href="/menu">FIND YOUR FAVOURITE <span>→</span></Link></div></section>
      <details className="health-details wrap"><summary>Connection status</summary><section aria-label="Backend connectivity"><p>{serverHealth ? `API connected (${serverHealth.uptimeSeconds}s uptime).` : `API is not reachable at ${API_BASE}.`}</p><HealthPanel /></section></details>
    </main>
  );
}
