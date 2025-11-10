import { prisma } from '../db/client';
import { NextResponse } from 'next/server';

// Helper function to format date to YYYY-MM
const formatDateToMonth = (date: Date) => {
    return date.toISOString().substring(0, 7);
};

// Returns trends for the last 12 months (or fewer if less data is available)
export async function GET() {
  try {
    // Fetch all invoices that have a date and a total value
    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: {
          not: null,
        },
        invoiceTotal: {
          not: null,
        }
      },
      select: {
        invoiceDate: true,
        invoiceTotal: true,
      },
    });

    // 1. Aggregate total spend and count by the month of the invoiceDate
    const monthlyTrendsMap = invoices.reduce((map, invoice) => {
      if (invoice.invoiceDate && invoice.invoiceTotal !== null) {
        const monthKey = formatDateToMonth(invoice.invoiceDate);
        
        // Parse Decimal value to number and apply scaling
        const totalSpend = parseFloat(invoice.invoiceTotal.toString()) * 1000; 

        const current = map.get(monthKey) || { invoiceCount: 0, totalSpend: 0 };
        current.invoiceCount += 1;
        current.totalSpend += totalSpend;
        map.set(monthKey, current);
      }
      return map;
    }, new Map<string, { invoiceCount: number, totalSpend: number }>());

    // 2. Convert Map to expected array format and sort by month
    const invoiceTrends = Array.from(monthlyTrendsMap.entries())
      .map(([monthKey, data]) => ({
        month: monthKey,
        invoiceCount: data.invoiceCount,
        totalSpend: data.totalSpend,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort months chronologically

    // 3. Optional: Filter/Limit to the last 12 months for better visualization
    // (This step is optional but recommended for a clean dashboard line chart)
    const last12Months = invoiceTrends.slice(-12);

    // Format the month key (YYYY-MM) to Mmm YYYY for display
    const finalResult = last12Months.map(item => {
        const date = new Date(item.month + '-01');
        return {
            ...item,
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        };
    });

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch invoice trends' }, { status: 500 });
  }
}