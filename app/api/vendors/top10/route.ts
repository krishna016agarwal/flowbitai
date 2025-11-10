// C:\Users\krish\Desktop\fitbit\app\api\vendors\top10\route.ts

import { prisma } from '../../db/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Aggregate total invoice count and total spend per vendor
    const vendorData = await prisma.invoice.groupBy({
      by: ['vendorId'],
      _sum: {
        invoiceTotal: true, // This will be the netValue
      },
      _count: {
        vendorId: true, // This will be the invoiceCount
      },
      orderBy: {
        _sum: {
          invoiceTotal: 'desc',
        },
      },
      take: 10,
      // Only include groups where vendorId is not null
      where: {
        vendorId: {
          not: null,
        },
      },
    });

    // Fetch vendor names and structure the final result
    const result = await Promise.all(
      vendorData.map(async (v) => {
        // Ensure vendorId is not null before searching
        if (!v.vendorId) return null; 
        
        const vendor = await prisma.vendor.findUnique({
          where: { id: v.vendorId },
        });

        // The frontend dashboard component expects: vendorName, invoiceCount, netValue
        return {
          vendorName: vendor?.vendorName || 'Unknown Vendor',
          invoiceCount: v._count.vendorId, // The count of invoices
          netValue: v._sum.invoiceTotal || 0, // The total spend
        };
      })
    );
    
    // Filter out any null entries that might have been returned (though unlikely with the 'where' clause)
    const filteredResult = result.filter(item => item !== null); 

    return NextResponse.json(filteredResult);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch top vendors' }, { status: 500 });
  }
}