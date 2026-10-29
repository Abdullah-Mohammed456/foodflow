"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { lockBodyScroll } from "@/lib/scroll-lock";

export function AppLoader({
  done,
  failed,
  onRetry,
  onFinished,
}: {
  done: boolean;
  failed: boolean;
  onRetry: () => void;
  onFinished: () => void;
}) {
  const screen = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const percentage = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const progressFill = useRef<HTMLSpanElement>(null);
  const error = useRef<HTMLDivElement>(null);
  const proxy = useRef({ value: 1 });
  const finished = useRef(false);
  const finishRef = useRef(() => {});
  const failRef = useRef(() => {});
  const startRef = useRef(() => {});
  const latest = useRef({ done, failed, onRetry, onFinished });

  useEffect(() => {
    latest.current = { done, failed, onRetry, onFinished };
  });

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const value = proxy.current;

    const render = () => {
      const roundedValue = Math.round(value.value);
      if (percentage.current) percentage.current.textContent = String(roundedValue);
      progress.current?.setAttribute("aria-valuenow", String(roundedValue));
      if (progressFill.current)
        progressFill.current.style.transform = `scaleX(${value.value / 100})`;
    };

    const finishExit = () => {
      gsap
        .timeline({
          delay: 0.15,
          onComplete: () => latest.current.onFinished(),
        })
        .to(content.current, {
          y: reduceMotion ? 0 : -8,
          opacity: 0,
          duration: reduceMotion ? 0.05 : 0.2,
          ease: "power2.in",
        })
        .to(screen.current, { opacity: 0, duration: reduceMotion ? 0.05 : 0.25 }, "<");
    };

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      gsap.killTweensOf(value);
      if (status.current) status.current.textContent = "Ready";
      gsap.to(value, {
        value: 100,
        duration: reduceMotion ? 0.1 : 0.5,
        ease: "power2.out",
        onUpdate: render,
        onComplete: finishExit,
      });
    };

    const fail = () => {
      if (finished.current) return;
      gsap.killTweensOf(value);
      if (status.current) status.current.textContent = "Still waiting for the server.";
      error.current?.setAttribute("data-show", "true");
      if (!reduceMotion && error.current)
        gsap.fromTo(
          error.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3 },
        );
    };

    const start = () => {
      gsap.killTweensOf([value, content.current, screen.current, error.current]);
      finished.current = false;
      value.value = 1;
      render();
      error.current?.removeAttribute("data-show");
      if (status.current) status.current.textContent = "Loading";
      gsap.set([screen.current, content.current, error.current], { clearProps: "all" });

      if (!reduceMotion)
        gsap.fromTo(
          content.current,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
        );

      // Hold below 100 until the server actually responds.
      gsap.to(value, { value: 82, duration: 18, ease: "power2.out", onUpdate: render });
      gsap.to(value, {
        value: 97,
        duration: 75,
        delay: 18,
        ease: "power1.out",
        onUpdate: render,
      });
    };

    finishRef.current = finish;
    failRef.current = fail;
    startRef.current = start;
    start();
    const unlock = lockBodyScroll();
    if (latest.current.failed) fail();
    else if (latest.current.done) finish();

    return () => {
      gsap.killTweensOf([value, content.current, screen.current, error.current]);
      unlock();
    };
  }, []);

  useEffect(() => {
    if (done) finishRef.current();
  }, [done]);
  useEffect(() => {
    if (failed) failRef.current();
  }, [failed]);

  const handleRetry = () => {
    latest.current.onRetry();
    startRef.current();
  };

  return (
    <div className="ff-loader-screen" ref={screen}>
      <div className="ff-loader-content" ref={content}>
        <span className="ff-loader-label">LOADING</span>
        <div className="ff-loader-count" aria-hidden="true">
          <span ref={percentage}>1</span>
          <span className="ff-loader-percent">%</span>
        </div>
        <div
          className="ff-loader-track"
          ref={progress}
          role="progressbar"
          aria-label="Page loading progress"
          aria-valuemin={1}
          aria-valuemax={100}
          aria-valuenow={1}
        >
          <span className="ff-loader-fill" ref={progressFill} />
        </div>
        <span className="ff-loader-status" ref={status} role="status">
          Loading
        </span>
        <div className="ff-loader-error" ref={error}>
          <span>The server is taking too long.</span>
          <button className="ff-loader-retry" type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLoaderGate({
  done,
  failed,
  onRetry,
  children,
}: {
  done: boolean;
  failed: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setVisible(true), failed ? 0 : 300);
    return () => window.clearTimeout(t);
  }, [done, failed]);

  if (gone) return <>{children}</>;
  if (!visible) return done ? <>{children}</> : null;
  return (
    <>
      {children}
      <AppLoader
        done={done}
        failed={failed}
        onRetry={onRetry}
        onFinished={() => setGone(true)}
      />
    </>
  );
}
