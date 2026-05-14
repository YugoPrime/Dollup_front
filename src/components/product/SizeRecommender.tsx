"use client";

import { ChevronDown, Check, Ruler } from "lucide-react";
import { useMemo, useState } from "react";
import {
  extractSizeChartRows,
  MEASUREMENT_KEYS,
  recommendSize,
  toCentimeters,
  type BodyMeasurements,
  type MeasurementKey,
  type MeasurementUnit,
} from "@/lib/size-recommender";

const LABELS: Record<MeasurementKey, string> = {
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
};

export function SizeRecommender({
  sizeChartHtml,
  sizeValues,
  candidateSizes,
  selectedSize,
  onSelectSize,
}: {
  sizeChartHtml: string | null;
  sizeValues: string[];
  candidateSizes: string[];
  selectedSize?: string;
  onSelectSize: (size: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [inputs, setInputs] = useState<Record<MeasurementKey, string>>({
    bust: "",
    waist: "",
    hips: "",
  });

  const productRows = useMemo(() => extractSizeChartRows(sizeChartHtml), [sizeChartHtml]);
  const recommendationSizes = candidateSizes.length > 0 ? candidateSizes : sizeValues;
  const measurements = useMemo<BodyMeasurements>(() => {
    const parsed: BodyMeasurements = {};
    for (const key of MEASUREMENT_KEYS) {
      const value = Number(inputs[key]);
      if (Number.isFinite(value) && value > 0) parsed[key] = value;
    }
    return toCentimeters(parsed, unit);
  }, [inputs, unit]);

  const recommendation = useMemo(
    () =>
      recommendSize({
        measurementsCm: measurements,
        availableSizes: recommendationSizes,
        productChartRows: productRows,
      }),
    [recommendationSizes, measurements, productRows],
  );

  const hasMeasurements = MEASUREMENT_KEYS.some((key) => inputs[key].trim().length > 0);
  const chartLabel = productRows.length > 0 ? "Product chart" : "General chart";

  const updateInput = (key: MeasurementKey, value: string) => {
    setInputs((current) => ({
      ...current,
      [key]: value.replace(/[^\d.]/g, ""),
    }));
  };

  return (
    <div className="rounded-xl border border-blush-300 bg-cream-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-500/10 text-coral-500">
            <Ruler size={16} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-sans text-[12px] font-bold uppercase tracking-[0.1em] text-ink">
              Not sure about your size?
            </span>
            <span className="mt-0.5 block font-sans text-[12px] text-ink-muted">
              Enter your measurements for a quick recommendation.
            </span>
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-coral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-blush-300 px-3.5 pb-3.5 pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-sans text-[11px] font-semibold text-ink-muted">
              Measurements
            </span>
            <div className="grid grid-cols-2 rounded-full border border-blush-300 bg-white p-0.5">
              {(["cm", "in"] as MeasurementUnit[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUnit(value)}
                  className={`rounded-full px-3 py-1.5 font-sans text-[11px] font-bold uppercase transition-colors ${
                    unit === value ? "bg-ink text-white" : "text-ink-muted"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MEASUREMENT_KEYS.map((key) => (
              <label key={key} className="block">
                <span className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {LABELS[key]}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputs[key]}
                  onChange={(event) => updateInput(key, event.target.value)}
                  aria-label={`${LABELS[key]} measurement`}
                  placeholder={unit}
                  className="h-11 w-full rounded-lg border border-blush-300 bg-white px-2.5 font-sans text-[14px] font-semibold text-ink outline-none placeholder:text-ink-muted/45"
                />
              </label>
            ))}
          </div>

          <div className="mt-3" aria-live="polite">
            {recommendation ? (
              <div className="rounded-lg border border-coral-300 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-coral-500">
                      Recommended size
                    </p>
                    <p className="mt-1 font-display text-[30px] leading-none text-ink">
                      {recommendation.size}
                    </p>
                  </div>
                  <span className="rounded-full bg-blush-100 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                    {chartLabel}
                  </span>
                </div>
                <p className="mt-2 font-sans text-[12px] leading-[1.45] text-ink-soft">
                  {recommendation.note}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSize(recommendation.size)}
                    disabled={selectedSize === recommendation.size}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors disabled:bg-emerald-600"
                  >
                    <Check size={14} aria-hidden="true" />
                    {selectedSize === recommendation.size ? "Selected" : `Use ${recommendation.size}`}
                  </button>
                  <a
                    href="/size-guide"
                    className="font-sans text-[11px] font-semibold text-coral-500"
                  >
                    Size guide
                  </a>
                </div>
              </div>
            ) : hasMeasurements ? (
              <div className="rounded-lg border border-blush-300 bg-white p-3">
                <p className="font-sans text-[12px] leading-[1.45] text-ink-soft">
                  I cannot match those measurements to the available sizes. Check the size chart below or message us for an exact fit check.
                </p>
              </div>
            ) : (
              <p className="font-sans text-[11px] leading-[1.45] text-ink-muted">
                Use a soft tape and enter the fullest bust, natural waist, and fullest hips.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
