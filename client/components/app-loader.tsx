"use client";

import { useEffect, useRef, useState } from "react";

function messageFor(elapsed: number) {
  if (elapsed >= 12000)
    return "Still warming up, almost there...";
  if (elapsed >= 4000)
    return "Waking up the kitchen (the server was asleep)...";
  return "Getting your table ready...";
}

export function AppLoader({
  value,
  message,
  failed,
  onRetry,
}: {
  value: number;
  message: string;
  failed: boolean;
  onRetry: () => void;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="ff-loader-screen">
      <div
        className="ff-loader"
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="ff-loader-brand" aria-hidden="true">
          FOOD <span>FLOW</span>
        </div>
        <div className="ff-loader-stage">
          <div className="ff-loader-tilt">
            <div className="ff-loader-slab" style={{ ["--p" as string]: percent }}>
              <div className="ff-loader-shadow" aria-hidden="true" />
              <div className="ff-loader-base" aria-hidden="true">
                <i className="ff-loader-base-top" />
                <i className="ff-loader-base-front" />
              </div>
              <div className="ff-loader-fill" aria-hidden="true">
                <i className="ff-loader-fill-top" />
                <i className="ff-loader-fill-front" />
              </div>
              <div className="ff-loader-rider" aria-hidden="true">
                <div className="ff-loader-guy">
                  <span className="ff-loader-bun">
                    <i className="ff-loader-eye ff-loader-eye-l" />
                    <i className="ff-loader-eye ff-loader-eye-r" />
                    <i className="ff-loader-mouth" />
                  </span>
                  <span className="ff-loader-patty" />
                  <span className="ff-loader-base-bun" />
                  <span className="ff-loader-leg ff-loader-leg-l" />
                  <span className="ff-loader-leg ff-loader-leg-r" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="ff-loader-meta">
          <span aria-live="polite">{failed ? "The server is taking too long." : message}</span>
          <b>{percent}%</b>
        </div>
        {failed && (
          <div className="ff-loader-error">
            <button className="ff-loader-retry" type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
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
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [value, setValue] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const progress = useRef(0);
  const startAt = useRef(0);

  useEffect(() => {
    if (done && !failed) return;
    const t = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(t);
  }, [done, failed]);

  useEffect(() => {
    if (gone) return;
    startAt.current = Date.now();
    const tick = window.setInterval(() => {
      const run = Date.now() - startAt.current;
      setElapsed(run);
      if (done) {
        progress.current = 100;
        setValue(100);
        return;
      }
      if (failed) return;
      progress.current += (90 - progress.current) * 0.04;
      setValue(progress.current);
      if (run >= 30000) setTimedOut(true);
    }, 100);
    return () => window.clearInterval(tick);
  }, [done, failed, gone]);

  useEffect(() => {
    if (!done || failed || gone) return;
    progress.current = 100;
    const wait = window.setTimeout(() => {
      setValue(100);
      setLeaving(true);
    }, 400);
    const hide = window.setTimeout(() => setGone(true), 800);
    return () => {
      window.clearTimeout(wait);
      window.clearTimeout(hide);
    };
  }, [done, failed, gone]);

  const showError = failed || timedOut;
  const message = messageFor(elapsed);

  if (gone && !showError) return <>{children}</>;
  if (!visible && !showError) {
    if (done) return <>{children}</>;
    return null;
  }
  if (done && !showError && leaving) {
    return (
      <>
        <div style={{ visibility: "hidden" }}>{children}</div>
        <div className="ff-loader-screen" data-leaving="true">
          <div
            className="ff-loader"
            role="progressbar"
            aria-label="Loading"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100}
          >
            <div className="ff-loader-brand" aria-hidden="true">
              FOOD <span>FLOW</span>
            </div>
            <div className="ff-loader-meta">
              <span aria-live="polite">Ready</span>
              <b>100%</b>
            </div>
          </div>
        </div>
      </>
    );
  }
  if (done && !showError) return <>{children}</>;
  return (
    <>
      <div aria-hidden="true" style={{ visibility: "hidden", position: "fixed", inset: 0, overflow: "hidden" }} />
      <AppLoader
        value={showError ? value : Math.min(value, 99)}
        message={message}
        failed={showError}
        onRetry={() => {
          progress.current = 0;
          startAt.current = Date.now();
          setValue(0);
          setElapsed(0);
          setTimedOut(false);
          onRetry();
        }}
      />
    </>
  );
}
