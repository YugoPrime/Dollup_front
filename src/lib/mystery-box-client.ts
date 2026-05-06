"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "dub_mystery_box_spins";
const DAILY_LIMIT = 3;

type SpinRecord = {
  date: string;
  spins: number;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function readRecord(): SpinRecord {
  const empty = { date: todayKey(), spins: 0 };
  if (typeof window === "undefined") return empty;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<SpinRecord>;
    if (parsed.date !== todayKey()) return empty;
    const spins = Number(parsed.spins ?? 0);
    return {
      date: parsed.date,
      spins: Number.isFinite(spins) ? Math.max(0, Math.floor(spins)) : 0,
    };
  } catch {
    return empty;
  }
}

function writeRecord(record: SpinRecord): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("dub:mystery-spin-change"));
}

let cachedSnapshot: SpinRecord | null = null;
let cachedKey = "";
const SERVER_SNAPSHOT: SpinRecord = { date: "server", spins: 0 };

function getSnapshot(): SpinRecord {
  const record = readRecord();
  const key = `${record.date}:${record.spins}`;
  if (key !== cachedKey) {
    cachedSnapshot = record;
    cachedKey = key;
  }
  return cachedSnapshot!;
}

function getServerSnapshot(): SpinRecord {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => callback();
  window.addEventListener("dub:mystery-spin-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("dub:mystery-spin-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useSpinCounter(): {
  spinsUsed: number;
  spinsRemaining: number;
  canSpin: boolean;
  recordSpin: () => void;
  refundSpin: () => void;
  reset: () => void;
} {
  const record = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    spinsUsed: record.spins,
    spinsRemaining: Math.max(0, DAILY_LIMIT - record.spins),
    canSpin: record.spins < DAILY_LIMIT,
    recordSpin: () =>
      writeRecord({
        date: todayKey(),
        spins: Math.min(DAILY_LIMIT, record.spins + 1),
      }),
    refundSpin: () =>
      writeRecord({
        date: todayKey(),
        spins: Math.max(0, record.spins - 1),
      }),
    reset: () => writeRecord({ date: todayKey(), spins: 0 }),
  };
}

export const MYSTERY_BOX_DAILY_LIMIT = DAILY_LIMIT;
