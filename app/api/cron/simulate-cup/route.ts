import { NextResponse } from "next/server";
import { simulateCupFixtures } from "@/server/cup/simulate";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await simulateCupFixtures();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cup simulation error:", error);
    return NextResponse.json(
      { error: "Cup simulation failed" },
      { status: 500 }
    );
  }
}
