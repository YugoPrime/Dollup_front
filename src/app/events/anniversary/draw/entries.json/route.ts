import { NextResponse } from "next/server";

import { fetchDrawEntries } from "@/lib/draw-wall";

// The wall polls this every 60s; the upstream store route is itself cached 60s.
export const revalidate = 60;

export async function GET() {
  return NextResponse.json(await fetchDrawEntries());
}
