"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart-provider";
import { CATEGORY_ORDER, human, itemPhoto, money, photoFor, type MenuItem } from "@/lib/foodflow";
import { useMenu } from "@/lib/queries";

const labels: Record<string, string> = { pizza: "Pizza", burgers: "Burgers", sandwiches: "Sandwiches", "fries-sides": "Fries & Sides", chicken: "Chicken", drinks: "Drinks", desserts: "Desserts", "combos-deals": "Combos & Deals" };

function ProductCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const variants = item.variants.filter((variant) => variant.isAvailable);
  const [size, setSize] = useState(variants[0]?.size ?? "REGULAR");
  const selected = variants.find((variant) => variant.size === size) ?? variants[0];
  return <article className="product-card">
    <div className="product-image"><Image src={itemPhoto(item)} alt={item.name} width={600} height={500} sizes="(max-width: 650px) 50vw, (max-width: 1000px) 45vw, 23vw" unoptimized draggable={false} />{item.isCombo && <span className="photo-tag">THE WHOLE DEAL</span>}{item.isSpicy && <span className="photo-tag">SPICY</span>}</div>
    <div className="product-meta"><div><span className="eyebrow muted">{item.category.name}</span><h3>{item.name}</h3><p>{item.description}</p></div><span className="price">{selected && money(selected.price)}</span></div>
    <div className="product-actions"><label>Size <select value={size} onChange={(event) => setSize(event.target.value as typeof size)} aria-label={`Size for ${item.name}`}>{variants.map((variant) => <option key={variant.id} value={variant.size}>{human(variant.size)}</option>)}</select></label><button className="small-action" type="button" disabled={!selected} onClick={() => selected && add({ menuItemId: item.id, name: item.name, image: itemPhoto(item), size: selected.size, unitPrice: selected.price, quantity: 1 })}>ADD +</button></div>
  </article>;
}

export function MenuExplorer({ compact = false, initialCategory = "" }: { compact?: boolean; initialCategory?: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const menu = useMenu(category, query, page);
  const orderedCategories = useMemo(() => [...(menu.data?.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [menu.data]);
  const items = compact ? menu.data?.items.slice(0, 8) : menu.data?.items;
  return <section className="menu-section wrap" id="menu"><div className="heading-row"><div><span className="eyebrow">THE CRAVING COLLECTION</span><h2>{compact ? "Whatever the mood." : "The menu."}</h2></div><p>Eight ways to make today taste better. Pick what you love and make it yours.</p></div>
    {!compact && <form className="search-row" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><label className="sr-only" htmlFor="menu-search">Search the menu</label><input id="menu-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your craving" maxLength={100} /><button type="submit">SEARCH →</button></form>}
    <div className="category-tabs" role="group" aria-label="Food categories"><button type="button" aria-pressed={!category} onClick={() => { setCategory(""); setPage(1); }}>All food</button>{CATEGORY_ORDER.map((slug) => <button type="button" key={slug} aria-pressed={category === slug} onClick={() => { setCategory(slug); setPage(1); }}>{orderedCategories.find((entry) => entry.slug === slug)?.name ?? labels[slug]}</button>)}</div>
    {menu.isPending && <p className="state-message" role="status">Bringing the good stuff in…</p>}
    {menu.isError && <div className="state-message" role="alert">The menu could not load. <button type="button" onClick={() => menu.refetch()}>Try again →</button></div>}
    {menu.data && <><div className="product-grid">{items?.map((item) => <ProductCard key={item.id} item={item} />)}</div>{!items?.length && <p className="state-message">Nothing on the menu matches that craving. Try another category or search.</p>}</>}
    {!compact && menu.data && menu.data.pagination.pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button><span>{page} / {menu.data.pagination.pageCount}</span><button disabled={page >= menu.data.pagination.pageCount} onClick={() => setPage(page + 1)}>Next →</button></div>}
    {compact && <div className="more-menu"><Link className="action" href="/menu">SEE THE FULL MENU <span>→</span></Link></div>}
  </section>;
}

export function CategoryRibbon() { return <div className="category-ribbon">{CATEGORY_ORDER.map((slug, index) => <span key={slug}>{labels[slug]} <i>{index < 7 ? "•" : ""}</i></span>)}</div>; }

export function CategoryShowcase() {
  return <section className="showcase wrap" aria-label="Food categories"><div className="heading-row"><div><span className="eyebrow">ONE MOOD. THEN ANOTHER.</span><h2>Follow your appetite.</h2></div><p>From first bite to last sip, every craving has a place here.</p></div><div className="showcase-grid">{CATEGORY_ORDER.map((slug, index) => <article key={slug} className="showcase-card"><Image src={photoFor(slug)} alt="" width={600} height={500} sizes="(max-width: 1000px) 50vw, 25vw" draggable={false}/><span className="showcase-number">0{index + 1}</span><Link className="showcase-label" href={`/menu?category=${slug}`}>{labels[slug]} ↗</Link></article>)}</div></section>;
}
