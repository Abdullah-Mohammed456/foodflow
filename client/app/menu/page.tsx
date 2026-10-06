import type { Metadata } from "next";
import { MenuExplorer } from "@/components/menu-explorer";
import { CATEGORY_ORDER } from "@/lib/foodflow";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the FoodFlow menu: pizza, burgers, sandwiches, fries & sides, chicken, drinks, desserts and combo deals. Order dine-in, takeaway or delivery.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <main className="page-main">
    <section className="menu-hero" aria-labelledby="menu-title">
      <div className="menu-hero-copy"><span className="eyebrow">FOOD FLOW / THE CRAVING COLLECTION</span><h1 id="menu-title">GOOD FOOD.<br /><em>YOUR MOOD.</em></h1><p>One menu. Every kind of craving. Find the bite that has your name on it.</p><span className="menu-hero-index">01 — 08 / PICK YOUR LANE</span></div>
      <div className="menu-hero-photo"><Image src="/media/menu/cosmos_1965868063.webp" alt="Freshly made burger" fill sizes="(max-width: 700px) 100vw, 48vw" priority draggable={false}/><div className="menu-hero-stamp">PICK<br/>YOUR<br/>FAVOURITE <span>→</span></div></div>
    </section>
    <MenuExplorer initialCategory={category && CATEGORY_ORDER.includes(category) ? category : ""} />
  </main>;
}
