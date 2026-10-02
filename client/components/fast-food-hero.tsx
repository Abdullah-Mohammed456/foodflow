"use client";

import { useCallback, useRef } from "react";

const PHRASE = "FAST FOOD";
const RADIUS = 240;
const WORDS = PHRASE.split(" ").map((word) => word.split(""));
type Letter = { ch: string; globalIndex: number };
const LETTER_GROUPS: Letter[][] = (() => {
  let g = 0;
  return WORDS.map((chars) =>
    chars.map((ch) => ({ ch, globalIndex: g++ })),
  );
})();

// Base (far from cursor) -> Active (right under cursor)
const BASE_COLOR = { r: 23, g: 23, b: 23 }; // near-black
const ACTIVE_COLOR = { r: 249, g: 115, b: 22 }; // primary orange
const BASE_BLUR = 3;
const LIFT_PX = 26;
const GROW = 0.38;

function influenceFromDistance(distance: number): number {
  if (distance >= RADIUS) return 0;
  const t = 1 - distance / RADIUS;
  return t * t * (3 - 2 * t); // smoothstep for soft falloff
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function styleForInfluence(el: HTMLElement, k: number): void {
  const scale = 1 + k * GROW;
  const y = -k * LIFT_PX;
  const blur = lerp(BASE_BLUR, 0, k);
  const r = Math.round(lerp(BASE_COLOR.r, ACTIVE_COLOR.r, k));
  const g = Math.round(lerp(BASE_COLOR.g, ACTIVE_COLOR.g, k));
  const b = Math.round(lerp(BASE_COLOR.b, ACTIVE_COLOR.b, k));

  el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
  el.style.filter = `blur(${blur.toFixed(2)}px)`;
  el.style.color = `rgb(${r}, ${g}, ${b})`;
  el.style.opacity = `${lerp(0.55, 1, k).toFixed(3)}`;
}

function resetStyle(el: HTMLElement): void {
  el.style.transform = "translate3d(0, 0, 0) scale(1)";
  el.style.filter = `blur(${BASE_BLUR}px)`;
  el.style.color = `rgb(${BASE_COLOR.r}, ${BASE_COLOR.g}, ${BASE_COLOR.b})`;
  el.style.opacity = "0.55";
}

export function FastFoodHero() {
  const containerRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const getLetters = useCallback((): NodeListOf<HTMLElement> | null => {
    const root = containerRef.current;
    if (!root) return null;
    return root.querySelectorAll<HTMLElement>("[data-letter]");
  }, []);

  const applyAt = useCallback(
    (px: number, py: number) => {
      const nodes = getLetters();
      if (!nodes) return;
      nodes.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(px - cx, py - cy);
        styleForInfluence(el, influenceFromDistance(dist));
      });
    },
    [getLetters],
  );

  const schedule = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pointerRef.current;
      if (p) applyAt(p.x, p.y);
    });
  }, [applyAt]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      schedule();
    },
    [schedule],
  );

  const reset = useCallback(() => {
    pointerRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    getLetters()?.forEach(resetStyle);
  }, [getLetters]);

  return (
    <section
      ref={containerRef}
      aria-label="Fast food hero"
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      className="flex flex-col items-center gap-6 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-14 text-center select-none"
    >
      <p className="rounded-full border border-border bg-surface-muted px-4 py-1 text-xs font-semibold tracking-widest text-text-muted uppercase">
        Move your cursor across the letters
      </p>

      <h1
        aria-label={PHRASE}
        className="flex flex-wrap items-center justify-center gap-x-[0.28em] leading-[0.9] font-black tracking-tight uppercase"
        style={{ fontSize: "clamp(3.5rem, 14vw, 11rem)" }}
      >
        {LETTER_GROUPS.map((letters, wi) => (
          <span key={wi} className="flex" aria-hidden={wi !== 0}>
            {letters.map(({ ch, globalIndex }) => (
              <span
                key={globalIndex}
                data-letter=""
                aria-hidden="true"
                className="inline-block will-change-transform"
                style={{
                  transform: "translate3d(0, 0, 0) scale(1)",
                  filter: `blur(${BASE_BLUR}px)`,
                  color: `rgb(${BASE_COLOR.r}, ${BASE_COLOR.g}, ${BASE_COLOR.b})`,
                  opacity: 0.55,
                  transition:
                    "transform 120ms ease-out, filter 120ms ease-out, color 120ms ease-out, opacity 120ms ease-out",
                }}
              >
                {ch}
              </span>
            ))}
            {wi === 0 && <span className="w-[0.28em]" aria-hidden="true" />}
          </span>
        ))}
      </h1>

      <p className="max-w-md text-sm text-text-muted">
        Only the letters <span className="font-semibold text-text">near your cursor</span>{" "}
        wake up — they lift, grow, sharpen and turn orange. The rest stay blurry
        and dim. No full-sentence hover, no glow circle.
      </p>
    </section>
  );
}
