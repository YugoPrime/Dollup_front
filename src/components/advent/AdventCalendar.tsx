"use client";

import { useEffect, useRef, useState } from "react";
import {
  ADVENT,
  adventPhase,
  doorOfDay,
  doorState,
  msUntilNextDoor,
  muDayLabel,
} from "@/lib/advent";
import type { Door, DoorState } from "@/lib/advent";
import { trackAdventDoor } from "@/lib/analytics";
import { DoorSheet } from "./DoorSheet";
import { useAdventNow } from "./useAdventNow";

type Thumbs = { day: number; items: { title: string; thumbnail: string; href: string }[] };

const STORAGE_KEY = "dub_advent_opened_v1";
const UNTIE_MS = 650;
const NOTE_MS = 3200;

function readOpened(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function writeOpened(days: number[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  } catch {
    // storage blocked: the calendar still works for this visit
  }
}

function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

// The locked-door message, under the tapped door. It scrolls itself into view
// so a door near the bottom of the screen doesn't hide it behind the bottom nav.
function NoteBubble({ text, align }: { text: string; align: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [text]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute top-full z-10 mt-1.5 scroll-mb-24 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg ${align}`}
    >
      {text}
    </span>
  );
}

function Bow({ untying }: { untying: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute left-1/2 top-1.5 z-[3] h-[21px] w-9 -translate-x-1/2 motion-safe:transition-all motion-safe:duration-500 ${
        untying ? "-translate-y-3 rotate-12 scale-50 opacity-0" : ""
      }`}
    >
      <i className="absolute left-0 top-0 h-[17px] w-[17px] -rotate-[20deg] rounded-[50%_0_50%_50%] border-4 border-coral-500" />
      <i className="absolute right-0 top-0 h-[17px] w-[17px] rotate-[20deg] rounded-[0_50%_50%_50%] border-4 border-coral-500" />
      <b className="absolute left-[14px] top-[6px] h-2 w-2 rounded-[3px] bg-coral-700" />
    </span>
  );
}

function Ribbons({ tone, untying }: { tone: "coral" | "soft"; untying: boolean }) {
  const color = tone === "coral" ? "bg-coral-500" : "bg-coral-300";
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-1/2 z-[1] w-2.5 -translate-x-1/2 ${color} motion-safe:transition-all motion-safe:duration-500 ${
          untying ? "translate-y-full opacity-0" : ""
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-1/2 z-[1] h-2.5 -translate-y-1/2 ${color} motion-safe:transition-all motion-safe:duration-500 ${
          untying ? "translate-x-full opacity-0" : ""
        }`}
      />
    </>
  );
}

function NumberChip({ day, dim }: { day: number; dim?: boolean }) {
  return (
    <span
      className={`relative z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-cream font-display text-base font-medium ${
        dim ? "text-ink-soft" : "text-ink"
      }`}
    >
      {day}
    </span>
  );
}

function DoorTile({
  door,
  state,
  opened,
  untying,
  note,
  onTap,
}: {
  door: Door;
  state: DoorState;
  opened: boolean;
  untying: boolean;
  note: string | null;
  onTap: (door: Door) => void;
}) {
  const wide = door.day === ADVENT.doors.length;
  const span = wide ? "col-span-4 min-h-24" : "aspect-square";
  const base = `relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl ${span}`;

  if (state === "past") {
    return (
      <li
        className={`${base} border border-blush-400 bg-white px-1.5 text-center`}
        aria-label={`Door ${door.day}, past: ${door.label}`}
      >
        <span className="font-display text-base font-medium text-ink-soft">{door.day}</span>
        <span className="mt-0.5 line-clamp-3 text-[10px] leading-tight text-ink-soft line-through">
          {wide ? "Christmas Eve · " : ""}
          {door.label}
        </span>
      </li>
    );
  }

  const wrapped = state === "locked" || (state === "today" && !opened);
  // Keep the bubble on screen: edge columns align to their outer edge.
  const col = (door.day - 1) % 4;
  const bubbleAlign = wide || col === 1 || col === 2 ? "left-1/2 -translate-x-1/2" : col === 0 ? "left-0" : "right-0";

  return (
    <li className={`relative ${wide ? "col-span-4" : ""}`}>
      <button
        type="button"
        onClick={() => onTap(door)}
        aria-label={
          state === "locked"
            ? `Door ${door.day}, locked. Opens ${muDayLabel(door.day)}`
            : opened
              ? `Door ${door.day}, today. View offer`
              : `Door ${door.day}, today. Tap to open`
        }
        className={`${base} min-h-11 text-center transition-transform active:scale-[0.97] ${
          state === "locked"
            ? "bg-blush-100"
            : opened
              ? "border-2 border-coral-500 bg-white"
              : "bg-blush-200 ring-2 ring-coral-500/60"
        }`}
      >
        {wrapped && <Ribbons tone={state === "today" ? "coral" : "soft"} untying={untying} />}
        {state === "today" && !opened && <Bow untying={untying} />}
        <NumberChip day={door.day} dim={state === "locked"} />
        {wide && (
          <span className="relative z-[2] mt-1 rounded bg-cream px-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
            Christmas Eve
          </span>
        )}
        {state === "today" && (
          <span className="absolute inset-x-0 bottom-1.5 z-[2] text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-ink">
            <span className={wrapped ? "rounded bg-cream/90 px-1" : ""}>{opened ? "Today" : "Tap to open"}</span>
          </span>
        )}
      </button>
      {/* The status line below the grid reads the message out. */}
      {note && <NoteBubble text={note} align={bubbleAlign} />}
    </li>
  );
}

export function AdventCalendar({ initialNow, thumbs }: { initialNow: number; thumbs: Thumbs }) {
  const now = useAdventNow(initialNow);
  const phase = adventPhase(now);
  const [opened, setOpened] = useState<number[]>([]);
  const [sheetDay, setSheetDay] = useState<number | null>(null);
  const [untyingDay, setUntyingDay] = useState<number | null>(null);
  const [note, setNote] = useState<{ day: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Read after hydration so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpened(readOpened());
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const ms = msUntilNextDoor(now);

  function openSheet(day: number) {
    setNote(null);
    setSheetDay(day);
    trackAdventDoor("open", day);
  }

  function onTap(door: Door) {
    const state = doorState(door.day, now);
    if (state === "locked") {
      // Name the door: "Opens Thursday 3 December" alone read as if the
      // whole calendar started on the 3rd.
      setNote({ day: door.day, text: `Door ${door.day} opens ${muDayLabel(door.day)}` });
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNote(null), NOTE_MS);
      return;
    }
    if (state !== "today") return;
    if (opened.includes(door.day)) {
      openSheet(door.day);
      return;
    }
    if (untyingDay !== null) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      const next = [...opened, door.day];
      setOpened(next);
      writeOpened(next);
      setUntyingDay(null);
      openSheet(door.day);
    };
    if (reduced) {
      finish();
    } else {
      setUntyingDay(door.day);
      timer.current = setTimeout(finish, UNTIE_MS);
    }
  }

  const sheetDoor = sheetDay ? doorOfDay(sheetDay) : null;
  const sheetThumbs =
    sheetDoor && thumbs.day === sheetDoor.day && doorState(sheetDoor.day, now) === "today" ? thumbs.items : [];

  return (
    <div className="bg-cream">
      <div className="mx-auto w-full max-w-xl px-4 pb-14 pt-6 sm:pt-10">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          <span aria-hidden="true" className="text-gold">★ </span>1–24 December
        </p>
        <h1 className="mt-2 text-center font-display text-[2rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
          24 Days of <em className="italic text-coral-700">Doll Up</em>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-snug text-ink-soft">
          A new treat behind every door. Open today&apos;s before midnight.
        </p>

        {phase === "teaser" && ms !== null && (
          <p className="mx-auto mt-5 w-fit rounded-full bg-blush-200 px-4 py-2 text-sm text-ink">
            Door 1 opens in <span className="font-semibold">{formatCountdown(ms)}</span>
          </p>
        )}
        {phase === "ended" && (
          <p className="mx-auto mt-5 max-w-xs rounded-2xl bg-blush-200 px-4 py-3 text-center font-display text-lg text-ink">
            That&apos;s a wrap. See you next Christmas
          </p>
        )}

        <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Advent doors">
          {ADVENT.doors.map((door) => (
            <DoorTile
              key={door.day}
              door={door}
              state={phase === "ended" ? "past" : phase === "teaser" ? "locked" : doorState(door.day, now)}
              opened={opened.includes(door.day)}
              untying={untyingDay === door.day}
              note={note?.day === door.day ? note.text : null}
              onTap={onTap}
            />
          ))}
        </ol>

        <p role="status" aria-live="polite" className="sr-only">
          {note?.text}
        </p>

        <section className="mt-11 rounded-2xl border border-blush-200 bg-white p-5">
          <h2 className="font-display text-xl font-medium text-ink">
            How it <em className="italic text-coral-700">works</em>
          </h2>
          <ol className="mt-3 space-y-2 text-sm leading-snug text-ink-soft">
            <li>1. A new door opens every day at midnight.</li>
            <li>2. The offer comes off by itself when you order on the website that day.</li>
            <li>3. Door offers are for website orders, not Instagram DMs.</li>
          </ol>
        </section>
      </div>

      {sheetDoor && <DoorSheet door={sheetDoor} thumbs={sheetThumbs} onClose={() => setSheetDay(null)} />}
    </div>
  );
}
