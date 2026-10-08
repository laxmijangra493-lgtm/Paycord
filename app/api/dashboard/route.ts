import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/data";

export async function GET() {
  try { return NextResponse.json(await getDashboardData()); }
  catch (error) { const message = error instanceof Error ? error.message : "Failed to load dashboard."; const status = message === "UNAUTHORIZED" ? 401 : 500; return NextResponse.json({ error: message }, { status }); }
}
