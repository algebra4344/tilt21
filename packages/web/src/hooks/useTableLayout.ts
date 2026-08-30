"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type TableLayoutMode = "auto" | "landscape" | "portrait";

const STORAGE_KEY = "cards-table-layout";

type Snapshot = {
  mode: TableLayoutMode;
  deviceLandscape: boolean;
};

let snapshot: Snapshot = {
  mode: "auto",
  deviceLandscape: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function readStoredMode(): TableLayoutMode {
  if (typeof window === "undefined") return "auto";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "landscape" || raw === "portrait" || raw === "auto") return raw;
  return "auto";
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return { mode: "auto", deviceLandscape: false };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setMode(next: TableLayoutMode) {
  snapshot = { ...snapshot, mode: next };
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  emit();
}

function setDeviceLandscape(deviceLandscape: boolean) {
  if (snapshot.deviceLandscape === deviceLandscape) return;
  snapshot = { ...snapshot, deviceLandscape };
  emit();
}

let bootstrapped = false;

function bootstrap() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  snapshot = {
    mode: readStoredMode(),
    deviceLandscape: window.matchMedia("(orientation: landscape)").matches,
  };
  emit();

  const mq = window.matchMedia("(orientation: landscape)");
  const onChange = () => setDeviceLandscape(mq.matches);
  mq.addEventListener("change", onChange);
}

let layoutConsumers = 0;

/**
 * Shared table-game layout preference (virtual felt boards only — not chipless).
 * Auto follows device orientation; landscape/portrait force chrome.
 */
export function useTableLayout() {
  const { mode, deviceLandscape } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    bootstrap();
  }, []);

  const isLandscape =
    mode === "landscape" || (mode === "auto" && deviceLandscape);

  useEffect(() => {
    if (typeof document === "undefined") return;
    layoutConsumers += 1;
    document.documentElement.dataset.tableLayout = isLandscape
      ? "landscape"
      : "portrait";
    return () => {
      layoutConsumers -= 1;
      if (layoutConsumers <= 0) {
        layoutConsumers = 0;
        delete document.documentElement.dataset.tableLayout;
      }
    };
    // Mount/unmount only — isLandscape updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.tableLayout = isLandscape
      ? "landscape"
      : "portrait";
  }, [isLandscape]);

  const cycleMode = useCallback(() => {
    const order: TableLayoutMode[] = ["auto", "landscape", "portrait"];
    const idx = order.indexOf(snapshot.mode);
    setMode(order[(idx + 1) % order.length]);
  }, []);

  return {
    mode,
    setMode,
    cycleMode,
    isLandscape,
    deviceLandscape,
  };
}
