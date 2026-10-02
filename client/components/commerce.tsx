"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { apiFetch, API_BASE } from "@/lib/api";
import { human, money, type Order, type OrderType, type Page, type User } from "@/lib/foodflow";
import { useCart } from "@/components/cart-provider";
import { useRestaurant, useStaffAccess, useUser } from "@/lib/queries";

function ErrorText({ error }: { error: unknown }) { return error ? <p className="form-error" role="alert">{error instanceof Error ? error.message : "Something went wrong. Try again."}</p> : null; }

function useOrderUpdates(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const socket = io(API_BASE, { path: "/api/socket.io", withCredentials: true, reconnection: true });
    const refresh = () => { client.invalidateQueries({ queryKey: ["orders"] }); client.invalidateQueries({ queryKey: ["order"] }); };
    socket.on("connect", refresh);
    for (const event of ["order.created", "order.confirmed", "order.preparing", "order.ready", "order.completed", "order.cancelled", "order.updated"]) socket.on(event, refresh);
    return () => { socket.disconnect(); };
  }, [enabled, client]);
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setWorking(true);
    try {
      if (mode === "register") {
        await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) });
        router.push("/login?registered=1");
      } else {
        await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        await client.invalidateQueries({ queryKey: ["me"] });
        router.push(new URLSearchParams(window.location.search).get("next") || "/account");
        router.refresh();
      }
    } catch (caught) { setError(caught); } finally { setWorking(false); }
  };
  return <main className="form-page"><div className="form-photo" aria-hidden="true"/><section className="form-panel"><span className="eyebrow">FOOD FLOW / YOUR TABLE</span><h1>{mode === "login" ? "WELCOME BACK." : "COME ON IN."}</h1><p>{mode === "login" ? "Your next good meal is only a few taps away." : "Create an account to save your orders and get started."}</p>{mode === "login" && <p className="small-note">Just registered? Sign in below to continue.</p>}
    <form onSubmit={onSubmit}>{mode === "register" && <label>Your name<input required autoComplete="name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></label>}<label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required minLength={mode === "register" ? 12 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label><ErrorText error={error}/><button className="action" type="submit" disabled={working}>{working ? "PLEASE WAIT…" : mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}</button></form><p className="form-switch">{mode === "login" ? <>New here? <Link href="/register">Create an account →</Link></> : <>Already part of the club? <Link href="/login">Sign in →</Link></>}</p></section></main>;
}

export function AccountPage() {
  const { data: user, isPending, isError, refetch } = useUser();
  if (isPending) return <main className="interior wrap"><p role="status">Loading your account…</p></main>;
  if (isError || !user) return <main className="interior wrap"><h1>YOUR ACCOUNT.</h1><p>Sign in to see your profile and orders.</p><Link className="action" href="/login">SIGN IN →</Link></main>;
  return <AccountForm user={user} refetch={refetch}/>;
}

function AccountForm({ user, refetch }: { user: User; refetch: () => Promise<unknown> }) {
  const client = useQueryClient();
  const access = useStaffAccess();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent) => { event.preventDefault(); setError(null); setMessage(""); try { await apiFetch<{ user: User }>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name, email }) }); await refetch(); setMessage("Profile saved."); } catch (caught) { setError(caught); } };
  const logout = async () => { try { await apiFetch("/api/auth/logout", { method: "POST", body: "{}" }); client.setQueryData(["me"], null); await client.invalidateQueries({ queryKey: ["me"] }); router.push("/"); router.refresh(); } catch (caught) { setError(caught); } };
  return <main className="interior wrap"><span className="eyebrow">GOOD TO SEE YOU, {user.name.toUpperCase()}</span><h1>YOUR ACCOUNT.</h1><div className="interior-grid"><section className="panel"><h2>Your details</h2><form onSubmit={save}><label>Name<input required value={name} maxLength={100} onChange={(event) => setName(event.target.value)}/></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label><ErrorText error={error}/>{message && <p role="status">{message}</p>}<button className="action" type="submit">SAVE CHANGES →</button></form></section><section className="panel account-links"><h2>Good things ahead.</h2><Link href="/orders">Track your orders →</Link><Link href="/menu">Explore the menu →</Link>{access.canUseKitchen && <Link href="/kitchen">Kitchen dashboard →</Link>}{access.canManage && <Link href="/admin">Manage restaurant →</Link>}<button type="button" onClick={logout}>Sign out →</button></section></div></main>;
}

export function CartPage() {
  const { lines, change, count } = useCart();
  const total = useMemo(() => lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0), [lines]);
  return <main className="interior wrap"><span className="eyebrow">ALMOST THE GOOD PART</span><h1>YOUR BAG.</h1>{!count ? <div className="empty-panel"><h2>Nothing in the bag yet.</h2><p>Make room for something delicious.</p><Link className="action" href="/menu">EXPLORE THE MENU →</Link></div> : <div className="interior-grid"><section className="panel"><div className="panel-heading"><h2>{count} {count === 1 ? "good thing" : "good things"}</h2><Link href="/menu">Add more +</Link></div>{lines.map((line) => <article className="cart-line" key={`${line.menuItemId}-${line.size}`}><Image src={line.image} alt="" width={95} height={95} unoptimized draggable={false}/><div><h3>{line.name}</h3><p>{human(line.size)} · {money(line.unitPrice)}</p><div className="quantity"><button type="button" aria-label={`Remove one ${line.name}`} onClick={() => change(line.menuItemId, line.size, line.quantity - 1)}>−</button><span>{line.quantity}</span><button type="button" aria-label={`Add one ${line.name}`} disabled={line.quantity >= 20} onClick={() => change(line.menuItemId, line.size, line.quantity + 1)}>+</button></div></div><strong>{money(Number(line.unitPrice) * line.quantity)}</strong></article>)}</section><aside className="panel summary"><h2>The total.</h2><div><span>Subtotal</span><strong>{money(total)}</strong></div><div><span>Delivery</span><span>Calculated at checkout</span></div><div className="summary-total"><span>Estimated total</span><strong>{money(total)}</strong></div><Link className="action" href="/checkout">CHECKOUT →</Link><p>Final total is confirmed by the restaurant.</p></aside></div>}</main>;
}

export function CheckoutPage() {
  const { lines, clear } = useCart();
  const restaurant = useRestaurant();
  const user = useUser();
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>("TAKEAWAY");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const checkoutKey = useRef<string | null>(null);
  const total = lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!restaurant.data || !lines.length) return;
    if (!checkoutKey.current) checkoutKey.current = crypto.randomUUID();
    setWorking(true); setError(null);
    try {
      const result = await apiFetch<{ order: Order }>("/api/orders", { method: "POST", body: JSON.stringify({ restaurantId: restaurant.data.id, checkoutKey: checkoutKey.current, orderType, items: lines.map((line) => ({ menuItemId: line.menuItemId, size: line.size, quantity: line.quantity })), ...(notes.trim() ? { notes: notes.trim() } : {}), ...(orderType === "DELIVERY" ? { deliveryAddress: deliveryAddress.trim() } : {}) }) });
      clear(); router.push(`/orders/${result.order.publicId}`);
    } catch (caught) { setError(caught); } finally { setWorking(false); }
  };
  return <main className="interior wrap"><span className="eyebrow">ONE STEP CLOSER</span><h1>CHECKOUT.</h1>{!lines.length ? <div className="empty-panel"><h2>Your bag is empty.</h2><Link className="action" href="/menu">BUILD YOUR ORDER →</Link></div> : user.isError ? <div className="empty-panel"><h2>Sign in to finish.</h2><p>Your bag will be here when you return.</p><Link className="action" href="/login?next=/checkout">SIGN IN →</Link></div> : <div className="interior-grid"><form className="panel checkout-form" onSubmit={submit}><h2>How will you have it?</h2><div className="choice-row">{(["DINE_IN", "TAKEAWAY", "DELIVERY"] as const).map((type) => <label key={type}><input type="radio" name="orderType" value={type} checked={orderType === type} onChange={() => setOrderType(type)}/><span>{human(type)}</span></label>)}</div>{orderType === "DELIVERY" && <label>Delivery address<textarea required minLength={5} maxLength={500} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Street, building, and helpful directions"/></label>}<label>Notes for the kitchen <span className="muted">Optional</span><textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything we should know?"/></label>{restaurant.isPending && <p role="status">Checking availability…</p>}<ErrorText error={restaurant.error}/>{restaurant.data && !restaurant.data.isOpen && <p className="form-error">We&apos;re closed right now. Come back soon.</p>}<ErrorText error={error}/><button className="action" type="submit" disabled={working || !restaurant.data?.isOpen || user.isPending}>{working ? "PLACING ORDER…" : "PLACE MY ORDER →"}</button></form><aside className="panel summary"><h2>Your order.</h2>{lines.map((line) => <div key={`${line.menuItemId}-${line.size}`}><span>{line.quantity} × {line.name} · {human(line.size)}</span><strong>{money(Number(line.unitPrice) * line.quantity)}</strong></div>)}<div className="summary-total"><span>Estimated total</span><strong>{money(total)}</strong></div><p>Prices and availability are confirmed when you place your order. Payment is handled at the restaurant or on delivery.</p></aside></div>}</main>;
}

export function OrdersPage() {
  const user = useUser();
  const [page, setPage] = useState(1);
  const orders = useQuery({ queryKey: ["orders", page], queryFn: () => apiFetch<Page<Order>>(`/api/orders?page=${page}&limit=10`), enabled: !!user.data, refetchInterval: 30000 });
  useOrderUpdates(!!user.data);
  if (user.isError) return <main className="interior wrap"><h1>YOUR ORDERS.</h1><p>Sign in to see your order history.</p><Link className="action" href="/login?next=/orders">SIGN IN →</Link></main>;
  return <main className="interior wrap"><span className="eyebrow">ALL THE GOOD MOMENTS</span><h1>YOUR ORDERS.</h1>{orders.isPending && <p role="status">Loading your orders…</p>}<ErrorText error={orders.error}/>{orders.data?.items.length === 0 && <div className="empty-panel"><h2>No orders yet.</h2><p>Let&apos;s change that.</p><Link className="action" href="/menu">EXPLORE THE MENU →</Link></div>}<div className="order-list">{orders.data?.items.map((order) => <Link className="order-row" href={`/orders/${order.publicId}`} key={order.id}><div><span className="eyebrow">{new Date(order.createdAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</span><h2>ORDER #{order.publicId.slice(-8).toUpperCase()}</h2><p>{order.items.map((item) => item.nameSnapshot).join(" · ")}</p></div><div><span className={`status status-${order.status.toLowerCase()}`}>{human(order.status)}</span><strong>{money(order.total)}</strong></div></Link>)}</div>{orders.data && orders.data.pagination.pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button><span>{page} / {orders.data.pagination.pageCount}</span><button disabled={page >= orders.data.pagination.pageCount} onClick={() => setPage(page + 1)}>Next →</button></div>}</main>;
}

export function OrderDetailPage({ publicId }: { publicId: string }) {
  const user = useUser();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const order = useQuery({ queryKey: ["order", publicId], queryFn: () => apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(publicId)}`).then((result) => result.order), enabled: !!user.data, refetchInterval: 15000 });
  useOrderUpdates(!!user.data);
  const cancel = async () => { if (!window.confirm("Cancel this order?")) return; setError(null); try { await apiFetch(`/api/orders/${encodeURIComponent(publicId)}/cancel`, { method: "POST", body: "{}" }); await client.invalidateQueries({ queryKey: ["order", publicId] }); await client.invalidateQueries({ queryKey: ["orders"] }); } catch (caught) { setError(caught); } };
  if (user.isError) return <main className="interior wrap"><h1>TRACK YOUR ORDER.</h1><Link className="action" href={`/login?next=/orders/${publicId}`}>SIGN IN →</Link></main>;
  const value = order.data;
  return <main className="interior wrap"><span className="eyebrow">GOOD THINGS IN MOTION</span><h1>ORDER #{publicId.slice(-8).toUpperCase()}.</h1><p className="order-reference">Reference: {publicId}</p>{order.isPending && <p role="status">Finding your order…</p>}<ErrorText error={order.error}/>{value && <div className="interior-grid"><section className="panel"><span className={`status status-${value.status.toLowerCase()}`}>{human(value.status)}</span><h2>{value.status === "READY" ? "Your food is ready." : value.status === "COMPLETED" ? "Enjoyed every bite?" : value.status === "CANCELLED" ? "Order cancelled." : "We're on it."}</h2><p>Placed {new Date(value.createdAt).toLocaleString("en")} · {human(value.orderType)}</p><div className="progress-steps">{["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"].map((status, index, all) => <div key={status} className={value.status !== "CANCELLED" && all.indexOf(value.status) >= index ? "done" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{human(status)}</div>)}</div>{value.prepDueAt && value.status !== "COMPLETED" && value.status !== "CANCELLED" && <p>Estimated preparation: {new Date(value.prepDueAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</p>}{value.status === "PENDING" && <button type="button" className="text-button" onClick={cancel}>Cancel order →</button>}<ErrorText error={error}/></section><aside className="panel summary"><h2>The details.</h2>{value.items.map((item) => <div key={item.id}><span>{item.quantity} × {item.nameSnapshot} · {human(item.sizeSnapshot)}</span><strong>{money(item.lineTotal)}</strong></div>)}<div className="summary-total"><span>Total</span><strong>{money(value.total)}</strong></div>{value.deliveryAddress && <p>Delivery to: {value.deliveryAddress}</p>}{value.notes && <p>Notes: {value.notes}</p>}<Link href="/menu">Back to the menu →</Link></aside></div>}</main>;
}
