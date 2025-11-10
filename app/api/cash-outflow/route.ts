import { prisma } from '../db/client';
import { NextResponse } from 'next/server';

// Helper function to format date to YYYY-MM
const formatDateToMonth = (date: Date) => {
    return date.toISOString().substring(0, 7);
};

export async function GET(req: Request) {
  try {
    // Fetch all invoices with non-null invoiceTotal
    const invoices = await prisma.invoice.findMany({
        where: {
            invoiceTotal: {
                not: null,
            },
        },
        select: {
            invoiceTotal: true,
            payment: {
                select: {
                    dueDate: true,
                },
            },
        },
    });

    // Aggregate total spend by the month of the dueDate
    const monthlyOutflowMap = invoices.reduce((map, invoice) => {
      if (invoice.payment?.dueDate && invoice.invoiceTotal !== null) {
        const monthKey = formatDateToMonth(invoice.payment.dueDate);
        const total = parseFloat(invoice.invoiceTotal.toString()) * 1000; // Apply scaling if needed
        map.set(monthKey, (map.get(monthKey) || 0) + total);
      }
      return map;
    }, new Map<string, number>());

    // Convert Map to array format [{ dueDate: 'YYYY-MM-01', total: X }]
    const cashOutflow = Array.from(monthlyOutflowMap.entries())
      .map(([dueDate, total]) => ({
        dueDate: dueDate + '-01',
        total: total,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    console.log(cashOutflow);
    return NextResponse.json(cashOutflow);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch cash outflow' }, { status: 500 });
  }
}
