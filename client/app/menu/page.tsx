import { MenuExplorer } from "@/components/menu-explorer";
import { CATEGORY_ORDER } from "@/lib/foodflow";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const { category } = await searchParams; return <main className="page-main"><div className="page-banner wrap"><span className="eyebrow">PICK YOUR FAVOURITE</span><h1>GOOD FOOD.<br /><em>YOUR MOOD.</em></h1></div><MenuExplorer initialCategory={category && CATEGORY_ORDER.includes(category) ? category : ""} /></main>; }
