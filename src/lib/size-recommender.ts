export type MeasurementKey = "bust" | "waist" | "hips";
export type MeasurementUnit = "cm" | "in";

export type BodyMeasurements = Partial<Record<MeasurementKey, number>>;

export type MeasurementRange = {
  min: number;
  max: number;
};

export type SizeChartRow = {
  size: string;
  bust?: MeasurementRange;
  waist?: MeasurementRange;
  hips?: MeasurementRange;
};

export type SizeRecommendation = {
  size: string;
  source: "product" | "general";
  confidence: "high" | "medium" | "low";
  note: string;
};

export const MEASUREMENT_KEYS: MeasurementKey[] = ["bust", "waist", "hips"];

export const GENERAL_SIZE_CHART_CM: SizeChartRow[] = [
  { size: "XS", bust: { min: 78, max: 82 }, waist: { min: 60, max: 64 }, hips: { min: 84, max: 88 } },
  { size: "S", bust: { min: 82, max: 86 }, waist: { min: 64, max: 68 }, hips: { min: 88, max: 92 } },
  { size: "M", bust: { min: 86, max: 90 }, waist: { min: 68, max: 72 }, hips: { min: 92, max: 96 } },
  { size: "L", bust: { min: 90, max: 96 }, waist: { min: 72, max: 78 }, hips: { min: 96, max: 102 } },
  { size: "XL", bust: { min: 96, max: 102 }, waist: { min: 78, max: 84 }, hips: { min: 102, max: 108 } },
  { size: "2XL", bust: { min: 102, max: 108 }, waist: { min: 84, max: 90 }, hips: { min: 108, max: 114 } },
];

const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "free"];
const FIT_TOLERANCE_CM = 0.5;

export function extractSizeChartRows(html: string | null | undefined): SizeChartRow[] {
  if (!html) return [];
  const tables = html.match(/<table[\s\S]*?<\/table>/gi);
  if (!tables) return [];

  for (const table of tables) {
    const matrix = parseTableMatrix(table);
    const rows = parseRegularSizeTable(matrix);
    if (rows.length > 0) return mergeDuplicateSizes(rows);

    const transposedRows = parseTransposedSizeTable(matrix);
    if (transposedRows.length > 0) return mergeDuplicateSizes(transposedRows);
  }

  return [];
}

export function toCentimeters(measurements: BodyMeasurements, unit: MeasurementUnit): BodyMeasurements {
  if (unit === "cm") return measurements;
  const out: BodyMeasurements = {};
  for (const key of MEASUREMENT_KEYS) {
    const value = measurements[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = roundOne(value * 2.54);
    }
  }
  return out;
}

export function recommendSize({
  measurementsCm,
  availableSizes,
  productChartRows,
}: {
  measurementsCm: BodyMeasurements;
  availableSizes: string[];
  productChartRows: SizeChartRow[];
}): SizeRecommendation | null {
  const source: SizeRecommendation["source"] = productChartRows.length > 0 ? "product" : "general";
  const chartRows = source === "product" ? productChartRows : GENERAL_SIZE_CHART_CM;
  const displayByKey = new Map(availableSizes.map((size) => [normalizeSizeKey(size), size]));
  const rows = chartRows
    .map((row) => {
      const displaySize = displayByKey.get(normalizeSizeKey(row.size));
      return displaySize ? { ...row, size: displaySize } : null;
    })
    .filter((row): row is SizeChartRow => row != null)
    .sort(compareSizeRows);

  if (rows.length === 0) return null;

  const values = MEASUREMENT_KEYS
    .map((key) => ({ key, value: measurementsCm[key] }))
    .filter(
      (entry): entry is { key: MeasurementKey; value: number } =>
        typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value > 0,
    );
  if (values.length === 0) return null;

  const dimensionIndexes: number[] = [];
  let aboveLargestSize = false;
  let missingChartFields = 0;

  for (const { key, value } of values) {
    const hasAnyRange = rows.some((row) => row[key] != null);
    if (!hasAnyRange) {
      missingChartFields++;
      continue;
    }

    const index = rows.findIndex((row) => {
      const range = row[key];
      return range ? value <= range.max + FIT_TOLERANCE_CM : false;
    });

    if (index >= 0) {
      dimensionIndexes.push(index);
    } else {
      dimensionIndexes.push(rows.length - 1);
      aboveLargestSize = true;
    }
  }

  if (dimensionIndexes.length === 0) return null;

  const lowIndex = Math.min(...dimensionIndexes);
  const highIndex = Math.max(...dimensionIndexes);
  const picked = rows[highIndex];
  const crossesSizes = highIndex > lowIndex;

  let confidence: SizeRecommendation["confidence"] = "medium";
  if (aboveLargestSize) confidence = "low";
  else if (source === "product" && !crossesSizes && missingChartFields === 0) confidence = "high";
  else if (source === "general") confidence = "low";

  return {
    size: picked.size,
    source,
    confidence,
    note: recommendationNote({ source, aboveLargestSize, crossesSizes, missingChartFields }),
  };
}

function recommendationNote({
  source,
  aboveLargestSize,
  crossesSizes,
  missingChartFields,
}: {
  source: SizeRecommendation["source"];
  aboveLargestSize: boolean;
  crossesSizes: boolean;
  missingChartFields: number;
}) {
  if (aboveLargestSize) {
    return "This is the closest available size, but one measurement is above the chart. Message us for an exact fit check.";
  }
  if (crossesSizes) {
    return "Your measurements sit across sizes, so this picks the size that fits your largest measurement.";
  }
  if (missingChartFields > 0) {
    return "This chart does not include every measurement, so use this as a fit guide.";
  }
  if (source === "product") {
    return "Based on this product's size chart.";
  }
  return "Based on Doll Up's general chart because this product chart could not be read automatically.";
}

function parseTableMatrix(tableHtml: string): string[][] {
  const rows = [...tableHtml.matchAll(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi)];
  return rows
    .map((row) =>
      [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => htmlToText(cell[1]))
        .filter(Boolean),
    )
    .filter((row) => row.length >= 2);
}

function parseRegularSizeTable(matrix: string[][]): SizeChartRow[] {
  const headerIndex = matrix.findIndex((row) => {
    const keys = row.map(detectHeaderKey);
    return keys.includes("size") && keys.some((key) => key === "bust" || key === "waist" || key === "hips");
  });
  if (headerIndex < 0) return [];

  const header = matrix[headerIndex];
  const sizeIndex = header.findIndex((cell) => detectHeaderKey(cell) === "size");
  if (sizeIndex < 0) return [];

  const measurementIndexes = MEASUREMENT_KEYS
    .map((key) => ({ key, index: header.findIndex((cell) => detectHeaderKey(cell) === key) }))
    .filter((entry) => entry.index >= 0);
  if (measurementIndexes.length === 0) return [];

  const rows: SizeChartRow[] = [];
  for (const row of matrix.slice(headerIndex + 1)) {
    const size = row[sizeIndex];
    if (!size || detectHeaderKey(size) === "size") continue;

    const parsed: SizeChartRow = { size };
    for (const { key, index } of measurementIndexes) {
      const range = parseRange(row[index]);
      if (range) parsed[key] = range;
    }
    if (hasMeasurementRange(parsed)) rows.push(parsed);
  }

  return rows;
}

function parseTransposedSizeTable(matrix: string[][]): SizeChartRow[] {
  if (matrix.length < 2 || detectHeaderKey(matrix[0][0]) !== "size") return [];
  const sizes = matrix[0].slice(1).filter(Boolean);
  if (sizes.length === 0) return [];

  const rows = sizes.map((size) => ({ size }) as SizeChartRow);
  for (const row of matrix.slice(1)) {
    const key = detectHeaderKey(row[0]);
    if (key !== "bust" && key !== "waist" && key !== "hips") continue;

    row.slice(1).forEach((cell, index) => {
      const range = parseRange(cell);
      if (range && rows[index]) rows[index][key] = range;
    });
  }

  return rows.filter(hasMeasurementRange);
}

function mergeDuplicateSizes(rows: SizeChartRow[]): SizeChartRow[] {
  const merged = new Map<string, SizeChartRow>();
  for (const row of rows) {
    const key = normalizeSizeKey(row.size);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...row, size: existing.size } : row);
  }
  return [...merged.values()].sort(compareSizeRows);
}

function hasMeasurementRange(row: SizeChartRow) {
  return MEASUREMENT_KEYS.some((key) => row[key] != null);
}

function detectHeaderKey(value: string): MeasurementKey | "size" | null {
  const label = value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();

  if (!label) return null;
  if (label === "size" || label.startsWith("size ")) return "size";
  if (label.includes("under bust") || label.includes("underbust")) return null;
  if (label.includes("bust") || label.includes("chest")) return "bust";
  if (label.includes("waist")) return "waist";
  if (label.includes("hip")) return "hips";
  return null;
}

function parseRange(value: string | undefined): MeasurementRange | null {
  if (!value) return null;
  const numbers = [...value.replace(/,/g, ".").matchAll(/\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((number) => Number.isFinite(number));

  if (numbers.length === 0) return null;
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };

  const [a, b] = numbers;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function compareSizeRows(a: SizeChartRow, b: SizeChartRow) {
  return sizeSortIndex(a.size) - sizeSortIndex(b.size);
}

function sizeSortIndex(size: string) {
  const key = normalizeSizeKey(size);
  const knownIndex = SIZE_ORDER.indexOf(key);
  if (knownIndex >= 0) return knownIndex;
  const numeric = Number(key);
  return Number.isFinite(numeric) ? 100 + numeric : 1000;
}

function normalizeSizeKey(size: string) {
  const key = size.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (key === "onesize" || key === "freesize") return "free";
  if (key === "xxl") return "2xl";
  if (key === "xxxl") return "3xl";
  if (key === "xxxxl") return "4xl";
  return key;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
