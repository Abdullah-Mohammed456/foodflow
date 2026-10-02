"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { apiFetch, API_BASE } from "@/lib/api";
import { human, money, type Category, type MenuItem, type Order, type OrderStatus, type Page, type Size } from "@/lib/foodflow";
import { useRestaurant, useUser } from "@/lib/queries";

const advance: Partial<Record<OrderStatus, OrderStatus>> = { PENDING: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "READY", READY: "COMPLETED" };

function ErrorMessage({ error }: { error: unknown }) { return error ? <p className="form-error" role="alert">{error instanceof Error ? error.message : "Something went wrong."}</p> : null; }

export function KitchenPage() {
  const restaurant = useRestaurant();
  const user = useUser();
  const client = useQueryClient();
  const id = restaurant.data?.id;
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState("");
  const queue = useQuery({ queryKey: ["kitchen", id, filter], queryFn: () => apiFetch<Page<Order>>(`/api/restaurants/${id}/kitchen/orders?limit=100${filter ? `&status=${filter}` : ""}`), enabled: !!id && !!user.data, refetchInterval: 15000 });
  useEffect(() => {
    if (!id || !user.data) return;
    const socket = io(API_BASE, { path: "/api/socket.io", withCredentials: true });
    const refresh = () => { client.invalidateQueries({ queryKey: ["kitchen", id] }); };
    socket.on("connect", () => { socket.emit("kitchen.subscribe", { restaurantId: id }, refresh); refresh(); });
    for (const event of ["order.created", "order.confirmed", "order.preparing", "order.ready", "order.completed", "order.cancelled"]) socket.on(event, refresh);
    return () => { socket.disconnect(); };
  }, [id, user.data, client]);
  const move = async (order: Order) => {
    const status = advance[order.status]; if (!status || !id) return;
    setBusy(order.id); setError(null);
    try { await apiFetch(`/api/restaurants/${id}/kitchen/orders/${order.publicId}/status`, { method: "PATCH", body: JSON.stringify({ status, revision: order.revision }) }); await client.invalidateQueries({ queryKey: ["kitchen", id] }); }
    catch (caught) { setError(caught); await queue.refetch(); } finally { setBusy(""); }
  };
  return <main className="interior wrap"><span className="eyebrow">LIVE SERVICE / FOOD FLOW</span><h1>THE KITCHEN.</h1>{user.isError && <div className="empty-panel"><h2>Staff sign-in required.</h2><Link className="action" href="/login?next=/kitchen">SIGN IN →</Link></div>}{queue.isPending && !user.isError && <p role="status">Loading the live queue…</p>}<ErrorMessage error={queue.error ?? error}/>{queue.data && <><div className="operations-toolbar"><p>{queue.data.pagination.total} orders in view · updates live</p><label>Status <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Active queue</option>{["PENDING", "CONFIRMED", "PREPARING", "READY"].map((status) => <option key={status} value={status}>{human(status)}</option>)}</select></label><button type="button" onClick={() => queue.refetch()}>Refresh ↻</button></div>{!queue.data.items.length && <div className="empty-panel"><h2>All clear.</h2><p>New orders will appear here.</p></div>}<div className="kitchen-grid">{queue.data.items.map((order) => <article className="panel kitchen-card" key={order.id}><div className="panel-heading"><span className={`status status-${order.status.toLowerCase()}`}>{human(order.status)}</span><span className="eyebrow">REV {order.revision}</span></div><h2>#{order.publicId.slice(-8).toUpperCase()}</h2><p>{human(order.orderType)} · {new Date(order.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</p><ul>{order.items.map((item) => <li key={item.id}><b>{item.quantity} × {item.nameSnapshot}</b><span>{human(item.sizeSnapshot)}</span></li>)}</ul>{order.notes && <p className="kitchen-notes">Note: {order.notes}</p>}{order.deliveryAddress && <p className="kitchen-notes">Delivery: {order.deliveryAddress}</p>}<p>Prep target: {new Date(order.prepDueAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</p>{advance[order.status] && <button type="button" className="action" disabled={busy === order.id} onClick={() => move(order)}>{busy === order.id ? "UPDATING…" : `MARK ${advance[order.status]} →`}</button>}</article>)}</div></>}</main>;
}

interface Overview { totalOrders: number; totalRevenue: string; averageOrderValue: string; activeQueue: number; completedOrders: number; averageFulfillmentMinutes: number | null; byStatus: { status: string; count: number }[]; byOrderType: { orderType: string; count: number }[] }
interface Revenue { buckets: { bucket: string; orders: number; revenue: string }[] }
interface Popular { items: { menuItemId: string; name: string; category: string; quantity: number; revenue: string }[] }
interface Rush { peakHourUtc: number; peakOrders: number; perHourUtc: { hour: number; orders: number }[] }
interface StaffMember { id: string; role: string; user: { id: string; name: string; email: string } }
interface VariantDraft { size: Size; price: string; isAvailable: boolean }
const SIZES: Size[] = ["REGULAR", "SMALL", "MEDIUM", "LARGE", "SINGLE", "DOUBLE"];

function VariantEditor({ variants, onChange }: { variants: VariantDraft[]; onChange: (variants: VariantDraft[]) => void }) {
  const update = (index: number, fields: Partial<VariantDraft>) => onChange(variants.map((variant, current) => current === index ? { ...variant, ...fields } : variant));
  const nextSize = SIZES.find((size) => !variants.some((variant) => variant.size === size));
  return <fieldset className="variant-editor"><legend>Sizes and prices</legend>{variants.map((variant, index) => <div className="variant-row" key={index}><label>Size<select value={variant.size} onChange={(event) => update(index, { size: event.target.value as Size })}>{SIZES.map((size) => <option key={size} value={size} disabled={variants.some((other, otherIndex) => otherIndex !== index && other.size === size)}>{human(size)}</option>)}</select></label><label>Price (EGP)<input required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" value={variant.price} onChange={(event) => update(index, { price: event.target.value })}/></label><label className="checkbox-row"><input type="checkbox" checked={variant.isAvailable} onChange={(event) => update(index, { isAvailable: event.target.checked })}/> Available</label><button type="button" className="text-button" disabled={variants.length === 1} onClick={() => onChange(variants.filter((_, current) => current !== index))}>Remove</button></div>)}{nextSize && <button type="button" className="text-button" onClick={() => onChange([...variants, { size: nextSize, price: "", isAvailable: true }])}>Add another size +</button>}</fieldset>;
}

export function AdminPage() {
  const restaurant = useRestaurant();
  const user = useUser();
  const id = restaurant.data?.id;
  const [tab, setTab] = useState<"overview" | "menu" | "staff" | "settings">("overview");
  return <main className="interior wrap"><span className="eyebrow">FOOD FLOW / CONTROL ROOM</span><h1>THE BACK OFFICE.</h1>{user.isError && <div className="empty-panel"><h2>Manager sign-in required.</h2><Link className="action" href="/login?next=/admin">SIGN IN →</Link></div>}{restaurant.isPending && <p role="status">Loading restaurant…</p>}{id && user.data && <><div className="operations-tabs" role="tablist" aria-label="Management sections">{(["overview", "menu", "staff", "settings"] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{human(value)}</button>)}</div>{tab === "overview" && <OverviewTab id={id}/ >}{tab === "menu" && <CatalogTab id={id}/ >}{tab === "staff" && <StaffTab id={id}/ >}{tab === "settings" && <SettingsTab id={id}/ >}</>}</main>;
}

function OverviewTab({ id }: { id: string }) {
  const base = `/api/restaurants/${id}/admin`;
  const overview = useQuery({ queryKey: ["admin-overview", id], queryFn: () => apiFetch<Overview>(`${base}/overview`) });
  const revenue = useQuery({ queryKey: ["admin-revenue", id], queryFn: () => apiFetch<Revenue>(`${base}/revenue?granularity=day`) });
  const popular = useQuery({ queryKey: ["admin-popular", id], queryFn: () => apiFetch<Popular>(`${base}/popular-items?limit=8`) });
  const rush = useQuery({ queryKey: ["admin-rush", id], queryFn: () => apiFetch<Rush>(`${base}/rush?days=7`) });
  if (overview.isPending) return <p role="status">Loading the numbers…</p>;
  if (overview.isError) return <ErrorMessage error={overview.error}/>;
  return <section className="operations-content"><div className="metric-grid"><article className="metric"><span>Total orders</span><strong>{overview.data.totalOrders}</strong></article><article className="metric"><span>Revenue</span><strong>{money(overview.data.totalRevenue)}</strong></article><article className="metric"><span>Active queue</span><strong>{overview.data.activeQueue}</strong></article><article className="metric"><span>Average order</span><strong>{money(overview.data.averageOrderValue)}</strong></article></div><div className="interior-grid"><div className="panel"><h2>Revenue / day</h2>{revenue.data?.buckets.length ? <div className="bar-list">{revenue.data.buckets.slice(-14).map((entry) => <div key={entry.bucket}><span>{entry.bucket}</span><i style={{ width: `${Math.max(3, Number(entry.revenue) / Math.max(...revenue.data!.buckets.map((row) => Number(row.revenue))) * 100)}%` }}/><strong>{money(entry.revenue)}</strong></div>)}</div> : <p className="muted">No revenue in this period yet.</p>}<ErrorMessage error={revenue.error}/></div><div className="panel"><h2>Most wanted.</h2>{popular.data?.items.length ? popular.data.items.map((item) => <div className="admin-row" key={item.menuItemId}><span>{item.name}<small>{item.category}</small></span><strong>{item.quantity} sold</strong></div>) : <p className="muted">No sales yet.</p>}<ErrorMessage error={popular.error}/></div></div><div className="panel"><h2>The rush.</h2><p>Peak hour (UTC): {rush.data ? `${String(rush.data.peakHourUtc).padStart(2, "0")}:00 · ${rush.data.peakOrders} orders` : "Loading…"}</p><ErrorMessage error={rush.error}/></div></section>;
}

function CatalogTab({ id }: { id: string }) {
  const client = useQueryClient();
  const categories = useQuery({ queryKey: ["admin-categories", id], queryFn: () => apiFetch<{ categories: Category[] }>(`/api/restaurants/${id}/categories`).then((value) => value.categories) });
  const items = useQuery({ queryKey: ["admin-items", id], queryFn: () => apiFetch<Page<MenuItem>>(`/api/restaurants/${id}/menu-items?limit=100`) });
  const [categoryName, setCategoryName] = useState("");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([{ size: "REGULAR", price: "", isAvailable: true }]);
  const [prepTime, setPrepTime] = useState(10);
  const [isCombo, setIsCombo] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const refresh = () => { client.invalidateQueries({ queryKey: ["admin-categories", id] }); client.invalidateQueries({ queryKey: ["admin-items", id] }); client.invalidateQueries({ queryKey: ["menu"] }); };
  const startEdit = (item: MenuItem) => { setEditing(item); setName(item.name); setDescription(item.description ?? ""); setCategoryId(item.categoryId); setImageUrl(item.imageUrl ?? ""); setVariants(item.variants.map((variant) => ({ size: variant.size, price: variant.price, isAvailable: variant.isAvailable }))); setPrepTime(item.prepTimeMinutes); setIsCombo(item.isCombo); setIsSpicy(item.isSpicy); window.scrollTo({ top: 250, behavior: "smooth" }); };
  const reset = () => { setEditing(null); setName(""); setDescription(""); setImageUrl(""); setVariants([{ size: "REGULAR", price: "", isAvailable: true }]); setPrepTime(10); setIsCombo(false); setIsSpicy(false); };
  const saveItem = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    const payload = { name, description, categoryId, imageUrl: imageUrl || null, prepTimeMinutes: prepTime, isCombo, isSpicy, variants };
    try { await apiFetch(`/api/restaurants/${id}/menu-items${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); reset(); refresh(); }
    catch (caught) { setError(caught); }
  };
  const addCategory = async (event: FormEvent) => { event.preventDefault(); setError(null); try { await apiFetch(`/api/restaurants/${id}/categories`, { method: "POST", body: JSON.stringify({ name: categoryName }) }); setCategoryName(""); refresh(); } catch (caught) { setError(caught); } };
  const changeCategory = async (category: Category) => { const next = prompt("Category name", category.name); if (!next || next === category.name) return; setError(null); try { await apiFetch(`/api/restaurants/${id}/categories/${category.id}`, { method: "PATCH", body: JSON.stringify({ name: next }) }); refresh(); } catch (caught) { setError(caught); } };
  const removeCategory = async (category: Category) => { if (!confirm(`Delete ${category.name}? It must have no menu items.`)) return; setError(null); try { await apiFetch(`/api/restaurants/${id}/categories/${category.id}`, { method: "DELETE" }); refresh(); } catch (caught) { setError(caught); } };
  const toggleItem = async (item: MenuItem) => { setError(null); try { await apiFetch(`/api/restaurants/${id}/menu-items/${item.id}/availability`, { method: "PATCH", body: JSON.stringify({ isAvailable: !item.isAvailable }) }); refresh(); } catch (caught) { setError(caught); } };
  const removeItem = async (item: MenuItem) => { if (!confirm(`Delete ${item.name}?`)) return; setError(null); try { await apiFetch(`/api/restaurants/${id}/menu-items/${item.id}`, { method: "DELETE" }); refresh(); } catch (caught) { setError(caught); } };
  return <section className="operations-content"><ErrorMessage error={error}/><div className="interior-grid"><div className="panel"><h2>{editing ? "Edit item." : "New menu item."}</h2><form onSubmit={saveItem}><label>Name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)}/></label><label>Category<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Select category</option>{categories.data?.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>Description<textarea maxLength={1500} value={description} onChange={(event) => setDescription(event.target.value)}/></label><label>Image URL<input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…"/></label><VariantEditor variants={variants} onChange={setVariants}/><label>Prep time (minutes)<input type="number" min={1} max={60} value={prepTime} onChange={(event) => setPrepTime(Number(event.target.value))}/></label><div className="checkbox-row"><label><input type="checkbox" checked={isCombo} onChange={(event) => setIsCombo(event.target.checked)}/> Combo</label><label><input type="checkbox" checked={isSpicy} onChange={(event) => setIsSpicy(event.target.checked)}/> Spicy</label></div><button className="action" type="submit">{editing ? "SAVE ITEM →" : "ADD ITEM →"}</button>{editing && <button className="text-button" type="button" onClick={reset}>Cancel edit</button>}</form></div><div className="panel"><h2>Categories.</h2><form onSubmit={addCategory} className="inline-form"><label className="sr-only" htmlFor="category-name">New category</label><input id="category-name" required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category" maxLength={80}/><button className="small-action" type="submit">ADD +</button></form>{categories.isPending && <p>Loading…</p>}<ErrorMessage error={categories.error}/>{categories.data?.map((entry) => <div className="admin-row" key={entry.id}><span>{entry.name}<small>{entry._count?.menuItems ?? 0} items · {entry.isActive ? "Active" : "Hidden"}</small></span><div><button onClick={() => changeCategory(entry)}>Edit</button><button onClick={() => removeCategory(entry)}>Delete</button></div></div>)}</div></div><div className="panel"><h2>Menu inventory.</h2>{items.isPending && <p>Loading…</p>}<ErrorMessage error={items.error}/>{items.data?.items.map((item) => <div className="admin-row" key={item.id}><span>{item.name}<small>{item.category.name} · {item.variants.map((variant) => `${human(variant.size)} ${money(variant.price)}`).join(" / ")}</small></span><div><button onClick={() => startEdit(item)}>Edit</button><button onClick={() => toggleItem(item)}>{item.isAvailable ? "Hide" : "Show"}</button><button onClick={() => removeItem(item)}>Delete</button></div></div>)}</div></section>;
}

function StaffTab({ id }: { id: string }) {
  const client = useQueryClient();
  const staff = useQuery({ queryKey: ["admin-staff", id], queryFn: () => apiFetch<{ members: StaffMember[] }>(`/api/restaurants/${id}/admin/staff`).then((value) => value.members) });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("KITCHEN");
  const [error, setError] = useState<unknown>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ["admin-staff", id] });
  const add = async (event: FormEvent) => { event.preventDefault(); setError(null); try { await apiFetch(`/api/restaurants/${id}/admin/staff`, { method: "POST", body: JSON.stringify({ email, role }) }); setEmail(""); refresh(); } catch (caught) { setError(caught); } };
  const setMemberRole = async (member: StaffMember, next: string) => { setError(null); try { await apiFetch(`/api/restaurants/${id}/admin/staff/${member.id}`, { method: "PATCH", body: JSON.stringify({ role: next }) }); refresh(); } catch (caught) { setError(caught); } };
  const remove = async (member: StaffMember) => { if (!confirm(`Remove ${member.user.name} from staff?`)) return; setError(null); try { await apiFetch(`/api/restaurants/${id}/admin/staff/${member.id}`, { method: "DELETE" }); refresh(); } catch (caught) { setError(caught); } };
  return <section className="operations-content panel"><h2>The team.</h2><p className="muted">Team members need an account before you can add them. Only the owner can make changes.</p><form onSubmit={add} className="inline-form"><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="KITCHEN">Kitchen</option><option value="MANAGER">Manager</option><option value="OWNER">Owner</option></select></label><button type="submit" className="small-action">ADD STAFF +</button></form><ErrorMessage error={error ?? staff.error}/>{staff.isPending && <p>Loading the team…</p>}{staff.data?.map((member) => <div className="admin-row" key={member.id}><span>{member.user.name}<small>{member.user.email}</small></span><div><select aria-label={`Role for ${member.user.name}`} value={member.role} onChange={(event) => setMemberRole(member, event.target.value)}><option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="KITCHEN">Kitchen</option></select><button onClick={() => remove(member)}>Remove</button></div></div>)}</section>;
}

function SettingsTab({ id }: { id: string }) {
  const restaurant = useRestaurant();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!restaurant.data) return; const timer = window.setTimeout(() => { setName(restaurant.data!.name); setDescription(restaurant.data!.description ?? ""); setLogoUrl(restaurant.data!.logoUrl ?? ""); setIsOpen(restaurant.data!.isOpen); }, 0); return () => window.clearTimeout(timer); }, [restaurant.data]);
  const save = async (event: FormEvent) => { event.preventDefault(); setError(null); setSaved(false); try { await apiFetch(`/api/restaurants/${id}`, { method: "PATCH", body: JSON.stringify({ name, description, logoUrl: logoUrl || null, isOpen }) }); await client.invalidateQueries({ queryKey: ["restaurant"] }); setSaved(true); } catch (caught) { setError(caught); } };
  return <section className="operations-content panel settings-panel"><h2>The restaurant.</h2><form onSubmit={save}><label>Restaurant name<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120}/></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500}/></label><label>Logo URL<input type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…"/></label><label className="checkbox-row"><input type="checkbox" checked={isOpen} onChange={(event) => setIsOpen(event.target.checked)}/> Open for orders</label><ErrorMessage error={error}/>{saved && <p role="status">Settings saved.</p>}<button className="action" type="submit">SAVE SETTINGS →</button></form></section>;
}
