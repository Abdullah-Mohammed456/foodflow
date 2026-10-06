"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { FoodImage as Image } from "@/components/food-image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  confirmAction,
  errorMessage,
  orderPlaced,
  successToast,
} from "@/lib/alerts";
import { ApiError, apiFetch } from "@/lib/api";
import {
  human,
  money,
  type Order,
  type OrderType,
  type Page,
  type User,
} from "@/lib/foodflow";
import { useCart } from "@/components/cart-provider";
import { useRestaurant, useStaffAccess, useUser } from "@/lib/queries";
import { PageLead } from "@/components/page-lead";
import {
  checkoutAttempt,
  forgetCheckoutAttempt,
  loadCheckoutMenu,
  reviewCart,
  type CheckoutAttempt,
} from "@/lib/checkout";

function ErrorText({ error }: { error: unknown }) {
  return error ? (
    <p className="form-error" role="alert">
      {error instanceof Error
        ? error.message
        : "Something went wrong. Try again."}
    </p>
  ) : null;
}
function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/account";
  return /^\/(?:checkout|account|kitchen|admin|orders(?:\/[a-zA-Z0-9-]+)?)$/.test(
    value,
  )
    ? value
    : "/account";
}

function useOrderUpdates(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const socket = io({
      path: "/api/socket.io",
      addTrailingSlash: false,
      transports: ["polling"],
      withCredentials: true,
      reconnection: true,
    });
    const refresh = () => {
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["order"] });
    };
    socket.on("connect", refresh);
    for (const event of [
      "order.created",
      "order.confirmed",
      "order.preparing",
      "order.ready",
      "order.completed",
      "order.cancelled",
      "order.updated",
    ])
      socket.on(event, refresh);
    return () => {
      socket.disconnect();
    };
  }, [enabled, client]);
}

export function AuthPage({
  mode,
  next,
  registered = false,
}: {
  mode: "login" | "register";
  next?: string;
  registered?: boolean;
}) {
  const router = useRouter();
  const destination = safeNextPath(next ?? null);
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setWorking(true);
    try {
      if (mode === "register") {
        await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, name, password }),
        });
        void successToast("ACCOUNT CREATED.", "Sign in to finish your order.");
        router.push(
          `/login?registered=1&next=${encodeURIComponent(destination)}`,
        );
      } else {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const session = await apiFetch<{ user: User }>("/api/auth/me");
        client.clear();
        client.setQueryData(["me"], session.user);
        void successToast("WELCOME BACK.", session.user.name);
        router.push(destination);
        router.refresh();
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setWorking(false);
    }
  };
  return (
    <main className="form-page">
      <div className="form-photo" aria-hidden="true" />
      <section className="form-panel">
        <span className="eyebrow">FOOD FLOW / YOUR TABLE</span>
        <h1>{mode === "login" ? "WELCOME BACK." : "COME ON IN."}</h1>
        <p>
          {mode === "login"
            ? "Your next good meal is only a few taps away."
            : "Create an account to save your orders and get started."}
        </p>
        {registered && (
          <p className="small-note" role="status">
            Account created. Sign in to continue.
          </p>
        )}
        {destination === "/checkout" && (
          <p className="small-note" role="status">
            {mode === "login"
              ? "Please sign in to continue to checkout."
              : "Create an account to continue to checkout."}
          </p>
        )}
        <form onSubmit={onSubmit}>
          {mode === "register" && (
            <label>
              Your name
              <input
                required
                autoComplete="name"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={mode === "register" ? 12 : 1}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <ErrorText error={error} />
          <button className="action" type="submit" disabled={working}>
            {working
              ? "PLEASE WAIT…"
              : mode === "login"
                ? "SIGN IN →"
                : "CREATE ACCOUNT →"}
          </button>
        </form>
        <p className="form-switch">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href={`/register?next=${encodeURIComponent(destination)}`}>
                Create an account →
              </Link>
            </>
          ) : (
            <>
              Already part of the club?{" "}
              <Link href={`/login?next=${encodeURIComponent(destination)}`}>
                Sign in →
              </Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}

export function AccountPage() {
  const { data: user, isPending, isError, refetch } = useUser();
  if (isPending)
    return (
      <main className="interior wrap">
        <p role="status">Loading your account…</p>
      </main>
    );
  if (isError || !user)
    return (
      <main className="interior wrap">
        <h1>YOUR ACCOUNT.</h1>
        <p>Sign in to see your profile and orders.</p>
        <Link className="action" href="/login">
          SIGN IN →
        </Link>
      </main>
    );
  return <AccountForm user={user} refetch={refetch} />;
}

function AccountForm({
  user,
  refetch,
}: {
  user: User;
  refetch: () => Promise<unknown>;
}) {
  const client = useQueryClient();
  const access = useStaffAccess();
  const router = useRouter();
  const { clear: clearCart } = useCart();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage("");
    try {
      await apiFetch<{ user: User }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      await refetch();
      setMessage("Profile saved.");
      void successToast("PROFILE SAVED.");
    } catch (caught) {
      setError(caught);
    }
  };
  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: "{}" });
      clearCart();
      client.clear();
      client.setQueryData(["me"], null);
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught);
    }
  };
  return (
    <main className="interior wrap">
      <PageLead
        eyebrow={`GOOD TO SEE YOU, ${user.name.toUpperCase()}`}
        title="YOUR ACCOUNT."
        description="Your details, your orders, and all the good food ahead."
        image="/media/menu/sandwich.jpg"
        imageAlt="Fresh sandwich"
        chapter="05"
      />
      <div className="interior-grid">
        <section className="panel">
          <h2>Your details</h2>
          <form onSubmit={save}>
            <label>
              Name
              <input
                required
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <ErrorText error={error} />
            {message && <p role="status">{message}</p>}
            <button className="action" type="submit">
              SAVE CHANGES →
            </button>
          </form>
        </section>
        <section className="panel account-links">
          <h2>Good things ahead.</h2>
          {!access.isStaff && (
            <>
              <Link href="/orders">Track your orders →</Link>
              <Link href="/menu">Explore the menu →</Link>
            </>
          )}
          {access.canUseKitchen && (
            <Link href="/kitchen">Kitchen dashboard →</Link>
          )}
          {access.canManage && <Link href="/admin">Manage restaurant →</Link>}
          <button type="button" onClick={logout}>
            Sign out →
          </button>
        </section>
      </div>
    </main>
  );
}

export function CartPage() {
  const { lines, change, changeSize, count, ready } = useCart();
  const user = useUser();
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.unitPrice) * line.quantity,
        0,
      ),
    [lines],
  );
  return (
    <main className="interior wrap">
      <PageLead
        eyebrow="ALMOST THE GOOD PART"
        title="YOUR BAG."
        description="Good choices, all in one place. One more bite and it is on its way."
        image="/media/menu/cosmos_339898762.webp"
        imageAlt="Burger meal with fries"
        chapter="02"
      />
      {!ready ? (
        <p role="status">Loading your bag…</p>
      ) : !count ? (
        <div className="empty-panel food-empty">
          <h2>Nothing in the bag yet.</h2>
          <p>Make room for something delicious.</p>
          <Link className="action" href="/menu">
            EXPLORE THE MENU →
          </Link>
        </div>
      ) : (
        <div className="interior-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                {count} {count === 1 ? "good thing" : "good things"}
              </h2>
              <Link href="/menu">Add more +</Link>
            </div>
            {lines.map((line) => (
              <article
                className="cart-line"
                key={`${line.menuItemId}-${line.size}`}
              >
                <Image
                  src={line.image}
                  alt=""
                  width={95}
                  height={95}
                  draggable={false}
                />
                <div>
                  <h3>{line.name}</h3>
                  <p>{money(line.unitPrice)} each</p>
                  {line.variants && line.variants.length > 1 && (
                    <label className="cart-size">
                      Size{" "}
                      <select
                        value={line.size}
                        onChange={(event) =>
                          changeSize(
                            line.menuItemId,
                            line.size,
                            event.target.value,
                          )
                        }
                      >
                        {line.variants.map((variant) => (
                          <option key={variant.size} value={variant.size}>
                            {human(variant.size)} · {money(variant.price)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="quantity">
                    <button
                      type="button"
                      aria-label={`Remove one ${line.name}`}
                      onClick={() =>
                        change(line.menuItemId, line.size, line.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Add one ${line.name}`}
                      disabled={line.quantity >= 20}
                      onClick={() =>
                        change(line.menuItemId, line.size, line.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong>{money(Number(line.unitPrice) * line.quantity)}</strong>
              </article>
            ))}
          </section>
          <aside className="panel summary">
            <h2>The total.</h2>
            <div>
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="summary-total">
              <span>Estimated total</span>
              <strong>{money(total)}</strong>
            </div>
            {user.isPending ? (
              <span className="action" aria-disabled="true">
                CHECKOUT →
              </span>
            ) : (
              <Link
                className="action"
                href={user.data ? "/checkout" : "/login?next=/checkout"}
              >
                CHECKOUT →
              </Link>
            )}
            <p>Final total is confirmed by the restaurant.</p>
          </aside>
        </div>
      )}
    </main>
  );
}

export function CheckoutPage() {
  const { lines, clear, ready, refreshPrices, change } = useCart();
  const restaurant = useRestaurant();
  const user = useUser();
  const menu = useQuery({
    queryKey: ["checkout-menu"],
    queryFn: loadCheckoutMenu,
    enabled: ready && !!lines.length && !!user.data,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>("TAKEAWAY");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const attempt = useRef<CheckoutAttempt | null>(null);
  const submitting = useRef(false);
  const review = reviewCart(lines, menu.data ?? []);
  const changed = review.some((entry) => entry.changed);
  const unavailable = review.some((entry) => !entry.available);
  const total = review.reduce(
    (sum, entry) => sum + Number(entry.price) * entry.line.quantity,
    0,
  );
  const needsLogin =
    user.error instanceof ApiError && user.error.status === 401;
  useEffect(() => {
    if (ready && !user.isPending && needsLogin)
      router.replace("/login?next=/checkout");
  }, [ready, user.isPending, needsLogin, router]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      submitting.current ||
      !restaurant.data?.isOpen ||
      !lines.length ||
      !user.data
    )
      return;
    submitting.current = true;
    setWorking(true);
    setError(null);
    try {
      const fresh = await menu.refetch();
      if (!fresh.data || fresh.isError)
        throw (
          fresh.error ??
          new Error("We could not confirm the menu. Please retry.")
        );
      const check = reviewCart(lines, fresh.data);
      if (check.some((entry) => !entry.available))
        throw new Error(
          "An item is unavailable. Remove it below before ordering.",
        );
      if (check.some((entry) => entry.changed))
        throw new Error(
          "Prices changed. Review and accept the updated prices below.",
        );
      const currentRestaurant = await restaurant.refetch();
      if (!currentRestaurant.data || currentRestaurant.isError)
        throw (
          currentRestaurant.error ??
          new Error("We could not confirm restaurant availability.")
        );
      if (!currentRestaurant.data.isOpen)
        throw new Error(
          "We are closed right now. Your bag is saved for later.",
        );
      const payload = {
        restaurantId: currentRestaurant.data.id,
        orderType,
        items: lines
          .map((line) => ({
            menuItemId: line.menuItemId,
            size: line.size,
            quantity: line.quantity,
          }))
          .sort(
            (a, b) =>
              a.menuItemId.localeCompare(b.menuItemId) ||
              a.size.localeCompare(b.size),
          ),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(orderType === "DELIVERY"
          ? { deliveryAddress: deliveryAddress.trim() }
          : {}),
      };
      attempt.current = await checkoutAttempt(
        user.data.id,
        payload,
        attempt.current,
      );
      const result = await apiFetch<{ order: Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ ...payload, checkoutKey: attempt.current.key }),
      });
      forgetCheckoutAttempt();
      clear();
      await orderPlaced(result.order.publicId);
      router.push(`/orders/${result.order.publicId}?placed=1`);
    } catch (caught) {
      setError(caught);
      void errorMessage(caught);
      if (caught instanceof ApiError && caught.status === 401)
        await user.refetch();
    } finally {
      submitting.current = false;
      setWorking(false);
    }
  };
  const loading = !ready || user.isPending;
  return (
    <main className="interior wrap">
      <PageLead
        eyebrow="ONE STEP CLOSER"
        title="CHECKOUT."
        description="Choose how to enjoy it. Review every bite, then send it to the kitchen."
        image="/media/menu/editorial-combo.jpg"
        imageAlt="Burger, fries and drink combo"
        chapter="03"
      />
      {loading ? (
        <p role="status">Getting your bag ready…</p>
      ) : !lines.length ? (
        <div className="empty-panel food-empty">
          <h2>Your bag is empty.</h2>
          <Link className="action" href="/menu">
            BUILD YOUR ORDER →
          </Link>
        </div>
      ) : needsLogin ? (
        <div className="empty-panel">
          <h2>Sign in to finish.</h2>
          <p>Your bag will be here when you return.</p>
          <Link className="action" href="/login?next=/checkout">
            SIGN IN →
          </Link>
        </div>
      ) : user.isError ? (
        <div className="empty-panel">
          <h2>We couldn&apos;t check your account.</h2>
          <ErrorText error={user.error} />
          <button className="action" onClick={() => user.refetch()}>
            TRY AGAIN →
          </button>
        </div>
      ) : (
        <>
          <ol className="purchase-steps" aria-label="Ordering steps">
            <li>
              <span>01</span> Your bag <Link href="/cart">Edit →</Link>
            </li>
            <li aria-current="step">
              <span>02</span> Review & order
            </li>
            <li>
              <span>03</span> Kitchen & tracking
            </li>
          </ol>
          <div className="interior-grid">
            <form className="panel checkout-form" onSubmit={submit}>
              <fieldset disabled={working}>
                <legend className="sr-only">Order details</legend>
                <h2>How will you have it?</h2>
                <div className="choice-row">
                  {(["DINE_IN", "TAKEAWAY", "DELIVERY"] as const).map(
                    (type) => (
                      <label key={type}>
                        <input
                          type="radio"
                          name="orderType"
                          value={type}
                          checked={orderType === type}
                          onChange={() => setOrderType(type)}
                        />
                        <span>{human(type)}</span>
                      </label>
                    ),
                  )}
                </div>
                {orderType === "DELIVERY" && (
                  <label>
                    Delivery address
                    <textarea
                      required
                      minLength={5}
                      maxLength={500}
                      value={deliveryAddress}
                      onChange={(event) =>
                        setDeliveryAddress(event.target.value)
                      }
                      placeholder="Street, building, and helpful directions"
                    />
                  </label>
                )}
                <label>
                  Notes for the kitchen <span className="muted">Optional</span>
                  <textarea
                    maxLength={1000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Anything we should know?"
                  />
                </label>
                <div className="checkout-payment">
                  <span className="eyebrow">PAYMENT</span>
                  <h3>Pay when you get it.</h3>
                  <p>
                    Payment is collected at the restaurant or on delivery. No
                    online charge is made here.
                  </p>
                </div>
              </fieldset>
              {restaurant.isPending || menu.isPending ? (
                <p role="status">Checking current prices and availability…</p>
              ) : null}
              <ErrorText error={restaurant.error ?? menu.error} />
              {(restaurant.isError || menu.isError) && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    restaurant.refetch();
                    menu.refetch();
                  }}
                >
                  Retry availability check →
                </button>
              )}
              {restaurant.data && !restaurant.data.isOpen && (
                <p className="form-error">
                  We&apos;re closed right now. Come back soon.
                </p>
              )}
              <ErrorText error={error} />
              <button
                className="action"
                type="submit"
                disabled={
                  working ||
                  !restaurant.data?.isOpen ||
                  menu.isPending ||
                  menu.isError ||
                  changed ||
                  unavailable
                }
              >
                {working ? "CONFIRMING YOUR ORDER…" : "PLACE MY ORDER →"}
              </button>
              <p className="small-note">
                We confirm the final price and availability when the kitchen
                receives your order.
              </p>
            </form>
            <aside className="panel summary checkout-summary">
              <div className="panel-heading">
                <h2>Your order.</h2>
                <Link href="/cart">Edit bag →</Link>
              </div>
              {review.map(({ line, price, available }) => (
                <article
                  className="checkout-item"
                  key={`${line.menuItemId}-${line.size}`}
                >
                  <Image
                    src={line.image}
                    alt=""
                    width={72}
                    height={72}
                    draggable={false}
                  />
                  <div>
                    <strong>{line.name}</strong>
                    <span>
                      {line.quantity} × {human(line.size)}
                    </span>
                    {menu.data && !available && (
                      <>
                        <p className="form-error">Unavailable</p>
                        <button
                          type="button"
                          className="text-button"
                          disabled={working}
                          onClick={() => change(line.menuItemId, line.size, 0)}
                        >
                          Remove item →
                        </button>
                      </>
                    )}
                  </div>
                  <b>{money(Number(price) * line.quantity)}</b>
                </article>
              ))}
              {changed && (
                <div className="checkout-price-notice" role="status">
                  <p>The menu prices changed. These are the latest prices.</p>
                  <button
                    type="button"
                    className="small-action"
                    disabled={working}
                    onClick={() => {
                      if (menu.data) refreshPrices(menu.data);
                      setError(null);
                    }}
                  >
                    ACCEPT UPDATED PRICES →
                  </button>
                </div>
              )}
              <div className="summary-total">
                <span>Estimated total</span>
                <strong>{money(total)}</strong>
              </div>
              <p>
                Your order is sent to the kitchen after confirmation. You can
                track its progress on the next page.
              </p>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

export function OrdersPage() {
  const user = useUser();
  const [page, setPage] = useState(1);
  const orders = useQuery({
    queryKey: ["orders", page],
    queryFn: () => apiFetch<Page<Order>>(`/api/orders?page=${page}&limit=10`),
    enabled: !!user.data,
    refetchInterval: 30000,
  });
  useOrderUpdates(!!user.data);
  if (user.isError)
    return (
      <main className="interior wrap">
        <h1>YOUR ORDERS.</h1>
        <p>Sign in to see your order history.</p>
        <Link className="action" href="/login?next=/orders">
          SIGN IN →
        </Link>
      </main>
    );
  return (
    <main className="interior wrap">
      <PageLead
        eyebrow="ALL THE GOOD MOMENTS"
        title="YOUR ORDERS."
        description="From the first click to the last bite, follow every order here."
        image="/media/menu/chicken.jpg"
        imageAlt="Crispy chicken meal"
        chapter="04"
      />
      {orders.isPending && <p role="status">Loading your orders…</p>}
      <ErrorText error={orders.error} />
      {orders.data?.items.length === 0 && (
        <div className="empty-panel food-empty">
          <h2>No orders yet.</h2>
          <p>Let&apos;s change that.</p>
          <Link className="action" href="/menu">
            EXPLORE THE MENU →
          </Link>
        </div>
      )}
      <div className="order-list">
        {orders.data?.items.map((order) => (
          <Link
            className="order-row"
            href={`/orders/${order.publicId}`}
            key={order.id}
          >
            <div>
              <span className="eyebrow">
                {new Date(order.createdAt).toLocaleDateString("en", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <h2>ORDER #{order.publicId.slice(-8).toUpperCase()}</h2>
              <p>{order.items.map((item) => item.nameSnapshot).join(" · ")}</p>
            </div>
            <div>
              <span className={`status status-${order.status.toLowerCase()}`}>
                {human(order.status)}
              </span>
              <strong>{money(order.total)}</strong>
            </div>
          </Link>
        ))}
      </div>
      {orders.data && orders.data.pagination.pageCount > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span>
            {page} / {orders.data.pagination.pageCount}
          </span>
          <button
            disabled={page >= orders.data.pagination.pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}

export function OrderDetailPage({
  publicId,
  placed = false,
}: {
  publicId: string;
  placed?: boolean;
}) {
  const user = useUser();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const order = useQuery({
    queryKey: ["order", publicId],
    queryFn: () =>
      apiFetch<{ order: Order }>(
        `/api/orders/${encodeURIComponent(publicId)}`,
      ).then((result) => result.order),
    enabled: !!user.data,
    refetchInterval: (query) =>
      ["COMPLETED", "CANCELLED"].includes(query.state.data?.status ?? "")
        ? false
        : 30000,
  });
  useOrderUpdates(!!user.data);
  const cancel = async () => {
    if (
      !(await confirmAction(
        "Cancel this order?",
        "The kitchen will be notified. You can start a new order afterward.",
      ))
    )
      return;
    setError(null);
    try {
      await apiFetch(`/api/orders/${encodeURIComponent(publicId)}/cancel`, {
        method: "POST",
        body: "{}",
      });
      await client.invalidateQueries({ queryKey: ["order", publicId] });
      await client.invalidateQueries({ queryKey: ["orders"] });
      void successToast("ORDER CANCELLED.");
    } catch (caught) {
      setError(caught);
    }
  };
  if (user.isError)
    return (
      <main className="interior wrap">
        <h1>TRACK YOUR ORDER.</h1>
        <Link className="action" href={`/login?next=/orders/${publicId}`}>
          SIGN IN →
        </Link>
      </main>
    );
  const value = order.data;
  return (
    <main className="interior wrap">
      <PageLead
        eyebrow="GOOD THINGS IN MOTION"
        title={`ORDER #${publicId.slice(-8).toUpperCase()}.`}
        description="See every step from our kitchen to your table."
        image="/media/menu/cosmos_1718309446.webp"
        imageAlt="Fresh burger"
        chapter="04"
      />
      {placed && value && value.status !== "CANCELLED" && (
        <div className="order-placed" role="status">
          <span>ORDER CONFIRMED / GOOD THINGS ARE COMING</span>
          <strong>WE&apos;VE GOT IT.</strong>
          <p>
            Your order has reached the kitchen. Keep this page open for live
            updates.
          </p>
        </div>
      )}
      <p className="order-reference">Reference: {publicId}</p>
      {order.isPending && <p role="status">Finding your order…</p>}
      <ErrorText error={order.error} />
      {value && (
        <div className="interior-grid">
          <section className="panel">
            <span className={`status status-${value.status.toLowerCase()}`}>
              {human(value.status)}
            </span>
            <h2>
              {value.status === "READY"
                ? "Your food is ready."
                : value.status === "COMPLETED"
                  ? "Enjoyed every bite?"
                  : value.status === "CANCELLED"
                    ? "Order cancelled."
                    : "We're on it."}
            </h2>
            <p>
              Placed {new Date(value.createdAt).toLocaleString("en")} ·{" "}
              {human(value.orderType)}
            </p>
            <div className="progress-steps">
              {["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"].map(
                (status, index, all) => (
                  <div
                    key={status}
                    className={
                      value.status !== "CANCELLED" &&
                      all.indexOf(value.status) >= index
                        ? "done"
                        : ""
                    }
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {human(status)}
                  </div>
                ),
              )}
            </div>
            {value.prepDueAt &&
              value.status !== "COMPLETED" &&
              value.status !== "CANCELLED" && (
                <p>
                  Estimated preparation:{" "}
                  {new Date(value.prepDueAt).toLocaleTimeString("en", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            {value.status === "PENDING" && (
              <button type="button" className="text-button" onClick={cancel}>
                Cancel order →
              </button>
            )}
            <ErrorText error={error} />
          </section>
          <aside className="panel summary">
            <h2>The details.</h2>
            {value.items.map((item) => (
              <div key={item.id}>
                <span>
                  {item.quantity} × {item.nameSnapshot} ·{" "}
                  {human(item.sizeSnapshot)}
                </span>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(value.total)}</strong>
            </div>
            {value.deliveryAddress && (
              <p>Delivery to: {value.deliveryAddress}</p>
            )}
            {value.notes && <p>Notes: {value.notes}</p>}
            <Link href="/menu">Back to the menu →</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
