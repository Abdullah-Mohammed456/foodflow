"use client";

let locks = 0;
let prevBody = "";
let prevHtml = "";
let saved = false;

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  if (locks === 0) {
    prevBody = document.body.style.overflow;
    prevHtml = document.documentElement.style.overflow;
    saved = true;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0 && saved && typeof document !== "undefined") {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      saved = false;
    }
  };
}
