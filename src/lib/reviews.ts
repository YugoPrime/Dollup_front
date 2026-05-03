export type Review = {
  initial: string;
  name: string;
  date: string; // e.g. "Mar 2026"
  stars: 1 | 2 | 3 | 4 | 5;
  quote: string;
  size?: string;
  color?: string;
  fitNote?: "True to size" | "Runs small" | "Runs large";
};

const SAMPLE: Review[] = [
  { initial: "P", name: "Priya S.", date: "Mar 2026", stars: 5, quote: "Quality blew me away — fits perfectly and arrived in 2 days. Already ordered the matching set.", size: "S", color: "Coral", fitNote: "True to size" },
  { initial: "A", name: "Anjali M.", date: "Feb 2026", stars: 5, quote: "Honestly the prettiest dress I own. Got compliments all night 💕", size: "M", color: "Black", fitNote: "True to size" },
  { initial: "M", name: "Maya R.", date: "Feb 2026", stars: 5, quote: "My go-to for everything beach. The fit is unreal — even the bottoms run true to size.", size: "S", color: "Coral", fitNote: "True to size" },
  { initial: "K", name: "Kavya L.", date: "Jan 2026", stars: 5, quote: "Wore this to a friend's wedding — got asked where I bought it three times.", size: "M", color: "Coral", fitNote: "True to size" },
];

/**
 * For v1, every product gets the same sample reviews.
 * The handle param is reserved for the real Medusa-backed review system later.
 */
export function getReviewsForProduct(handle: string) {
  void handle;
  return { average: 4.8, count: 48, reviews: SAMPLE };
}
