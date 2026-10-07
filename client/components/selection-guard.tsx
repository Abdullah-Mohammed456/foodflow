"use client";

import { useEffect } from "react";

export function SelectionGuard() {
  useEffect(() => {
    const allow = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest(
        "input, textarea, select, [contenteditable], .order-reference",
      );
    };
    const onCopy = (event: ClipboardEvent) => {
      if (!allow(event.target)) event.preventDefault();
    };
    const onCut = (event: ClipboardEvent) => {
      if (!allow(event.target)) event.preventDefault();
    };
    const onSelect = (event: Event) => {
      if (!allow(event.target)) event.preventDefault();
    };
    const onDrag = (event: DragEvent) => {
      if (!allow(event.target)) event.preventDefault();
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("selectstart", onSelect);
    document.addEventListener("dragstart", onDrag);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("selectstart", onSelect);
      document.removeEventListener("dragstart", onDrag);
    };
  }, []);
  return null;
}
