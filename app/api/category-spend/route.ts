import { NextResponse } from "next/server";
import { prisma } from "../db/client";

// Mapping from Sachkonto code → category name
const SACHKONTO_MAPPING: Record<string, string> = {
  "4400": "Marketing",
  "5100": "Operations",
  "6300": "Facilities",
  // Add others if needed
};

export async function GET() {
  try {
    const lineItems = await prisma.lineItem.findMany({
      where: {
        totalPrice: { not: null },
      },
      select: {
        Sachkonto: true,
        totalPrice: true,
      },
    });

    const categorySpend: Record<string, number> = {};

    lineItems.forEach((item) => {
      const sachkonto = String(item.Sachkonto ?? "").trim();
      const category = SACHKONTO_MAPPING[sachkonto] || "Unknown";
      const spend = Math.abs(item.totalPrice || 0); // take positive value
      categorySpend[category] = (categorySpend[category] || 0) + spend;
    });

    const result = Object.entries(categorySpend).map(([category, spend]) => ({
      category,
      spend,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch spend data" },
      { status: 500 }
    );
  }
}
