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
  const ld = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const msg = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const guy = useRef<HTMLDivElement>(null);
  const legL = useRef<HTMLSpanElement>(null);
  const legR = useRef<HTMLSpanElement>(null);
  const armL = useRef<HTMLSpanElement>(null);
  const armR = useRef<HTMLSpanElement>(null);
  const stripes = useRef<HTMLElement>(null);
  const brand = useRef<HTMLDivElement>(null);
  const err = useRef<HTMLDivElement>(null);
  const proxy = useRef({ v: 0 });
  const calls = useRef<{ kill(): void }[]>([]);
  const loops = useRef<{ kill(): void }[]>([]);
  const finished = useRef(false);
  const finishRef = useRef(() => {});
  const failRef = useRef(() => {});
  const startRef = useRef(() => {});
  const latest = useRef({ done, failed, onRetry, onFinished });

  useEffect(() => {
    latest.current = { done, failed, onRetry, onFinished };
  });

  useEffect(() => {
    const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const P = proxy.current;
    const letters = () =>
      Array.from(brand.current?.querySelectorAll(".ch > i") ?? []);

    const render = () => {
      stage.current?.style.setProperty("--p", String(P.v));
      ld.current?.setAttribute("aria-valuenow", String(Math.round(P.v)));
      if (pct.current) pct.current.textContent = `${Math.round(P.v)}%`;
    };

    const setMsg = (text: string) => {
      if (msg.current) msg.current.textContent = text;
      if (!RM && msg.current)
        gsap.fromTo(
          msg.current,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.3, overwrite: true },
        );
    };

    const killAll = () => {
      gsap.killTweensOf(P);
      gsap.killTweensOf([
        ld.current,
        screen.current,
        err.current,
        tilt.current,
        guy.current,
        legL.current,
        legR.current,
        armL.current,
        armR.current,
        stripes.current,
        msg.current,
      ]);
      calls.current.forEach((call) => call.kill());
      calls.current = [];
      loops.current.forEach((loop) => loop.kill());
      loops.current = [];
    };

    const exitIn = () => {
      const tl = gsap.timeline({
        delay: 0.4,
        onComplete: () => {
          latest.current.onFinished();
        },
      });
      if (RM) {
        tl.to(screen.current, { opacity: 0, duration: 0.2 });
        return;
      }
      tl.call(() => {
        loops.current.forEach((loop) => loop.kill());
        gsap.set(
          [guy.current, legL.current, legR.current, armL.current, armR.current],
          { rotation: 0, y: 0 },
        );
      })
        .to(guy.current, { y: -46, duration: 0.25, ease: "power2.out" })
        .to([armL.current], { rotation: 150, duration: 0.25 }, "<")
        .to([armR.current], { rotation: -150, duration: 0.25 }, "<")
        .to(guy.current, { y: 0, duration: 0.45, ease: "bounce.out" })
        .to(
          tilt.current,
          { rotationX: 90, y: -30, opacity: 0, duration: 0.5, ease: "power3.in" },
          "-=.1",
        )
        .to(
          letters(),
          { yPercent: -110, opacity: 0, stagger: 0.03, duration: 0.35, ease: "power3.in" },
          "<",
        )
        .to(screen.current, { opacity: 0, duration: 0.35 }, "-=.1");
    };

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      gsap.killTweensOf(P);
      calls.current.forEach((call) => call.kill());
      calls.current = [];
      setMsg("Ready");
      gsap.to(P, {
        v: 100,
        duration: RM ? 0.1 : 0.5,
        ease: "power2.out",
        onUpdate: render,
        onComplete: exitIn,
      });
    };

    const fail = () => {
      if (finished.current) return;
      gsap.killTweensOf(P);
      calls.current.forEach((call) => call.kill());
      calls.current = [];
      setMsg("The server is taking too long.");
      err.current?.setAttribute("data-show", "true");
      if (!RM && err.current)
        gsap.fromTo(
          err.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4 },
        );
    };

    const start = () => {
      killAll();
      finished.current = false;
      P.v = 0;
      render();
      err.current?.removeAttribute("data-show");
      gsap.set(
        [
          screen.current,
          ld.current,
          guy.current,
          legL.current,
          legR.current,
          armL.current,
          armR.current,
          msg.current,
          err.current,
          ...letters(),
        ],
        { clearProps: "all" },
      );
      gsap.set(tilt.current, { rotationX: 58, y: 0, opacity: 1 });
      setMsg("Getting your table ready...");
      if (!RM) {
        gsap.fromTo(
          letters(),
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.6, ease: "power3.out" },
        );
        gsap.fromTo(
          tilt.current,
          { rotationX: 90, opacity: 0, y: 40 },
          { rotationX: 58, opacity: 1, y: 0, duration: 1, delay: 0.2, ease: "power3.out" },
        );
        gsap.set(stripes.current, { backgroundPosition: "0px 0,0px 0" });
        loops.current.push(
          gsap.to(stripes.current, {
            backgroundPosition: "0px 0,40px 0",
            duration: 0.8,
            ease: "none",
            repeat: -1,
          }),
        );
        gsap.set(guy.current, { rotation: 5 });
        loops.current.push(
          gsap.fromTo(
            legL.current,
            { rotation: -38 },
            { rotation: 38, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: -1 },
          ),
        );
        loops.current.push(
          gsap.fromTo(
            legR.current,
            { rotation: 38 },
            { rotation: -38, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: -1 },
          ),
        );
        loops.current.push(
          gsap.fromTo(
            armL.current,
            { rotation: 45 },
            { rotation: -45, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: -1 },
          ),
        );
        loops.current.push(
          gsap.fromTo(
            armR.current,
            { rotation: -45 },
            { rotation: 45, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: -1 },
          ),
        );
        loops.current.push(
          gsap.to(guy.current, { y: -5, duration: 0.22, ease: "sine.out", yoyo: true, repeat: -1 }),
        );
      }
      gsap.to(P, { v: 82, duration: 18, ease: "power2.out", onUpdate: render });
      gsap.to(P, {
        v: 97,
        duration: 75,
        delay: 18,
        ease: "power1.out",
        onUpdate: render,
      });
      calls.current.push(
        gsap.delayedCall(4, () => setMsg("Waking up the kitchen (the server was asleep)...")),
      );
      calls.current.push(
        gsap.delayedCall(20, () => setMsg("Still warming up, almost there...")),
      );
      calls.current.push(
        gsap.delayedCall(50, () => setMsg("Free-tier servers can take a minute on first load...")),
      );
    };

    finishRef.current = finish;
    failRef.current = fail;
    startRef.current = start;
    start();
    const unlock = lockBodyScroll();
    if (latest.current.failed) fail();
    else if (latest.current.done) finish();
    return () => {
      killAll();
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
      <div
        className="ld"
        ref={ld}
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div className="brand" ref={brand} aria-hidden="true">
          {"FOOD".split("").map((c, i) => (
            <span className="ch" key={`food-${i}`}>
              <i>{c}</i>
            </span>
          ))}{" "}
          {"FLOW".split("").map((c, i) => (
            <span className="ch" key={`flow-${i}`}>
              <i style={{ color: "var(--ff-orange)" }}>{c}</i>
            </span>
          ))}
        </div>
        <div className="stage" ref={stage} style={{ "--p": 0 } as React.CSSProperties}>
          <div className="tilt" ref={tilt}>
            <div className="spin">
              <div className="slab">
                <div className="shadow" />
                <div className="box base">
                  <i className="f top" />
                  <i className="f front" />
                  <i className="f end" />
                </div>
                <div className="fill">
                  <i className="f top" ref={stripes} />
                  <i className="f front" />
                  <i className="f end" />
                </div>
                <div className="rider">
                  <div className="stand">
                    <div className="guy" ref={guy}>
                      <span className="leg l" ref={legL} />
                      <span className="leg r" ref={legR} />
                      <span className="arm l" ref={armL} />
                      <span className="arm r" ref={armR} />
                      <span className="bun">
                        <b className="seed" style={{ left: 22, top: 3 }} />
                        <b className="seed" style={{ left: 38, top: 2 }} />
                        <b className="seed" style={{ left: 54, top: 4 }} />
                        <b className="seed" style={{ left: 10, top: 9 }} />
                        <b className="seed" style={{ left: 64, top: 10 }} />
                        <b className="brow l" />
                        <b className="brow r" />
                        <b className="eye l">
                          <u />
                        </b>
                        <b className="eye r">
                          <u />
                        </b>
                        <b className="nose" />
                        <b className="cheek l" />
                        <b className="cheek r" />
                        <b className="mouth" />
                      </span>
                      <span className="lt" />
                      <span className="cz" />
                      <span className="pt" />
                      <span className="bb2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="meta">
          <span aria-live="polite" ref={msg}>
            Getting your table ready...
          </span>
          <b ref={pct}>0%</b>
        </div>
        <div className="err" ref={err}>
          <div>The server is taking too long.</div>
          <button className="retry" type="button" onClick={handleRetry}>
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
  if (done) return <>{children}</>;
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
