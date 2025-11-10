import { prisma } from '../db/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalInvoices = await prisma.invoice.count();
    const totalVendors = await prisma.vendor.count();
    const totalCustomers = await prisma.customer.count();
    const totalPayments = await prisma.payment.count();

    return NextResponse.json({
      totalInvoices,
      totalVendors,
      totalCustomers,
      totalPayments,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
