"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { human, money } from "@/lib/foodflow";

export function FloatingBag() {
  const { lines, count, ready, change, changeSize } = useCart();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const total = lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
  const close = () => { dialog.current?.close(); setOpen(false); };
  const show = () => { dialog.current?.showModal(); setOpen(true); };
  if (!ready || pathname.startsWith("/admin") || pathname.startsWith("/kitchen")) return null;
  return <>
    {count > 0 && <div className="floating-bag" aria-label="Your bag quick access"><button type="button" onClick={show} aria-haspopup="dialog" aria-expanded={open} aria-controls="quick-bag"><span className="bag-count">{count}</span><span><strong>YOUR BAG</strong><small>{money(total)} · {count === 1 ? "1 item" : `${count} items`}</small></span><span aria-hidden="true">↗</span></button><Link href="/checkout">CHECKOUT <span aria-hidden="true">→</span></Link></div>}
    <dialog id="quick-bag" className="bag-drawer" aria-labelledby="quick-bag-title" ref={dialog} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="bag-drawer-inner"><header><div><span className="eyebrow">GOOD CHOICES, ALL TOGETHER</span><h2 id="quick-bag-title">YOUR BAG.</h2></div><button type="button" className="bag-close" aria-label="Close your bag" onClick={close}>×</button></header>
        <div className="bag-drawer-items">{lines.length ? lines.map((line) => <article className="bag-drawer-item" key={`${line.menuItemId}-${line.size}`}><Image src={line.image} alt="" width={90} height={90} unoptimized draggable={false}/><div><h3>{line.name}</h3>{line.variants && line.variants.length > 1 ? <select aria-label={`Size for ${line.name} in your bag`} value={line.size} onChange={(event) => changeSize(line.menuItemId, line.size, event.target.value)}>{line.variants.map((variant) => <option key={variant.size} value={variant.size}>{human(variant.size)} · {money(variant.price)}</option>)}</select> : <p>{human(line.size)} · {money(line.unitPrice)} each</p>}<div className="quantity"><button type="button" aria-label={`Remove one ${line.name} from your bag`} onClick={() => change(line.menuItemId, line.size, line.quantity - 1)}>−</button><span>{line.quantity}</span><button type="button" disabled={line.quantity >= 20} aria-label={`Add one ${line.name} to your bag`} onClick={() => change(line.menuItemId, line.size, line.quantity + 1)}>+</button></div></div><strong>{money(Number(line.unitPrice) * line.quantity)}</strong></article>) : <div className="bag-empty"><h3>Room for something good.</h3><p>Your bag is empty.</p><Link className="action" href="/menu" onClick={close}>EXPLORE THE MENU →</Link></div>}</div>
        {count > 0 && <footer><div><span>Estimated total</span><strong>{money(total)}</strong></div><p>Current prices and availability are checked before you order.</p><Link className="action" href="/checkout" onClick={close}>CHECKOUT →</Link><Link className="text-button" href="/cart" onClick={close}>Open the full bag →</Link></footer>}
      </div>
    </dialog>
  </>;
}
