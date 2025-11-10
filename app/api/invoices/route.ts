import { prisma } from '../db/client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorName = searchParams.get('vendorName');
    const customerName = searchParams.get('customerName');

    const invoices = await prisma.invoice.findMany({
      where: {
        vendor: vendorName ? { vendorName: { contains: vendorName } } : undefined,
        customer: customerName ? { customerName: { contains: customerName } } : undefined,
      },
      include: {
        vendor: true,
        customer: true,
        lineItems: true,
        payment: true,
        files: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
