import { NextResponse } from "next/server";
import { simulateContinentalFixtures } from "@/server/continental/simulate";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await simulateContinentalFixtures();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Continental simulation error:", error);
    return NextResponse.json(
      { error: "Continental simulation failed" },
      { status: 500 }
    );
  }
}
