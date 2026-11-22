// The "mono" sale look (SALE_CAMPAIGN.look in sale-campaign.ts): what the
// black ticker bar, the homepage sale hero and the once-a-day popup say on
// each day of the sale. Pure and client-safe, so the browser re-checks it on
// cached pages (useAdventNow) and everything switches off by itself at the
// end of the window. Dates come from SALE_CAMPAIGN, in Mauritius time.
import { muDateParts } from "./checkout";
import {
  SALE_CAMPAIGN,
  SALE_PATH,
  isSaleActive,
  muShortDate,
  salePeakPhase,
} from "./sale-campaign";

export type SpotlightPhase = "week" | "peak" | "weekend" | "last-day";

export type SpotlightCopy = {
  /** week = before the peak day, weekend = after it, last-day = the final MU day. */
  phase: SpotlightPhase;
  /** Small caps line above the hero and popup titles. */
  kicker: string;
  /** One sentence under the hero and popup titles. */
  line: string;
  /** Promo bar ticker items, in order. */
  ticker: string[];
  /** ISO instant the countdowns run to: midnight on the peak day, else the sale end. */
  countdownTo: string;
  /** Mauritius date (YYYY-MM-DD). The popup shows once per value, so once a day. */
  seenValue: string;
};

/** localStorage key holding the last seenValue the popup was shown for. */
export const POPUP_STORAGE_KEY = "dub_sale_popup_seen_v1";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COD = "Cash on delivery";
const DROP = "prices drop again";

/** "Sunday 29 Nov" */
function dayLabel(iso: string): string {
  return `${WEEKDAYS[muDateParts(new Date(iso)).dow]} ${muShortDate(iso)}`;
}

/** "Fri 27 Nov" */
function shortDayLabel(iso: string): string {
  return `${WEEKDAYS[muDateParts(new Date(iso)).dow].slice(0, 3)} ${muShortDate(iso)}`;
}

function muDateKey(d: Date): string {
  const { year, month, day } = muDateParts(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The mono look's copy for `now`, or null outside the sale or with another look. */
export function spotlightCopy(now: number | Date): SpotlightCopy | null {
  if (SALE_CAMPAIGN.look !== "mono" || !isSaleActive(now)) return null;
  const date = typeof now === "number" ? new Date(now) : now;
  const c = SALE_CAMPAIGN;
  const seenValue = muDateKey(date);
  const ends = dayLabel(c.endsAt);
  const peak = salePeakPhase(date);

  if (peak === "active") {
    return {
      phase: "peak",
      kicker: `${c.name} · today only`,
      line: c.peak.spotlightLine,
      ticker: [c.name, c.peak.label, c.headline, "Ends at midnight", COD],
      countdownTo: c.peak.endsAt,
      seenValue,
    };
  }
  if (peak === "upcoming") {
    return {
      phase: "week",
      kicker: `${c.name} · ends ${ends}`,
      line: `${c.rangeLabel}. ${dayLabel(c.peak.startsAt)}: ${DROP}.`,
      ticker: [c.name, c.headline, c.piecesLabel, `${shortDayLabel(c.peak.startsAt)}: ${DROP}`, `Ends ${ends}`, COD],
      countdownTo: c.endsAt,
      seenValue,
    };
  }
  if (seenValue === muDateKey(new Date(c.endsAt))) {
    return {
      phase: "last-day",
      kicker: `${c.name} · last day`,
      line: `Last day: ${c.piecesLabel} ${c.headline.toLowerCase()}. Ends at midnight.`,
      ticker: [c.name, "Last day: ends at midnight", c.headline, c.piecesLabel, COD],
      countdownTo: c.endsAt,
      seenValue,
    };
  }
  return {
    phase: "weekend",
    kicker: `${c.name} · ends ${ends}`,
    line: `${c.rangeLabel}. Ends ${ends}.`,
    ticker: [c.name, c.headline, c.piecesLabel, `Ends ${ends}`, COD],
    countdownTo: c.endsAt,
    seenValue,
  };
}

/** Pages the popup never opens on: the sale itself, checkout, account and sign-in. */
const POPUP_BLOCKED_PATHS = [
  SALE_PATH,
  "/checkout",
  "/account",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/track-order",
  "/private",
];

/** Whether the popup may open on `pathname` (segment-exact: /saletest is not /sale). */
export function isPopupPath(pathname: string): boolean {
  return !POPUP_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
