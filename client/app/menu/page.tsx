import { MenuExplorer } from "@/components/menu-explorer";
import { CATEGORY_ORDER } from "@/lib/foodflow";
import Image from "next/image";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <main className="page-main">
    <section className="menu-hero" aria-labelledby="menu-title">
      <div className="menu-hero-copy"><span className="eyebrow">FOOD FLOW / THE CRAVING COLLECTION</span><h1 id="menu-title">GOOD FOOD.<br /><em>YOUR MOOD.</em></h1><p>One menu. Every kind of craving. Find the bite that has your name on it.</p><span className="menu-hero-index">01 — 08 / PICK YOUR LANE</span></div>
      <div className="menu-hero-photo"><Image src="/food/cosmos_1965868063.webp" alt="Freshly made burger" fill sizes="(max-width: 700px) 100vw, 48vw" priority draggable={false}/><div className="menu-hero-stamp">PICK<br/>YOUR<br/>FAVOURITE <span>→</span></div></div>
    </section>
    <MenuExplorer initialCategory={category && CATEGORY_ORDER.includes(category) ? category : ""} />
  </main>;
}
