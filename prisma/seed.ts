// prisma/seed.ts
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function parseDate(s: any) {
  if (!s) return null;
  try {
    // if already ISO string
    return new Date(s);
  } catch {
    return null;
  }
}

async function main() {
  const filePath = path.join(__dirname, "../data/Analytics_Test_Data.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const arr = JSON.parse(raw);

  console.log("Records to import:", arr.length);

  for (const record of arr) {
    try {
      const llm = record.extractedData?.llmData || {};
      const invBlock = llm.invoice?.value || {};
      const vendorBlock = llm.vendor?.value || {};
      const customerBlock = llm.customer?.value || {};
      const paymentBlock = llm.payment?.value || {};
      const summary = llm.summary?.value || {};
      const lineItemsBlock = llm.lineItems?.value?.items?.value || [];

      // create or find vendor by name+tax
      let vendor = null;
      const vendorName = vendorBlock.vendorName?.value || null;
      if (vendorName) {
        vendor = await prisma.vendor.findFirst({
          where: { vendorName: vendorName },
        });
        if (!vendor) {
          vendor = await prisma.vendor.create({
            data: {
              vendorName,
              vendorPartyNumber: vendorBlock.vendorPartyNumber?.value || null,
              vendorAddress: vendorBlock.vendorAddress?.value || null,
              vendorTaxId: vendorBlock.vendorTaxId?.value || null,
            },
          });
        }
      }

      // customer
      const customerName = customerBlock.customerName?.value || null;
      let customer = null;
      if (customerName) {
        customer = await prisma.customer.create({
          data: {
            customerName,
            customerAddress: customerBlock.customerAddress?.value || null,
          },
        });
      }

      // payment
      const payment = await prisma.payment.create({
        data: {
          bankAccountNumber: paymentBlock.bankAccountNumber?.value || null,
          paymentTerms: paymentBlock.paymentTerms?.value || null,
          netDays: typeof paymentBlock.netDays?.value === "number" ? paymentBlock.netDays.value : null,
          // parse dates if available
          dueDate: paymentBlock.dueDate?.value ? parseDate(paymentBlock.dueDate.value) : null,
        },
      });

      const invoiceDate = invBlock.invoiceDate?.value || null;
      const deliveryDate = invBlock.deliveryDate?.value || null;

      // create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invBlock.invoiceId?.value || undefined,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          subTotal: typeof summary.subTotal?.value === "number" ? summary.subTotal.value : (summary.subTotal?.value ? Number(summary.subTotal.value) : null),
          totalTax: typeof summary.totalTax?.value === "number" ? summary.totalTax.value : (summary.totalTax?.value ? Number(summary.totalTax.value) : null),
          invoiceTotal: typeof summary.invoiceTotal?.value === "number" ? summary.invoiceTotal.value : (summary.invoiceTotal?.value ? Number(summary.invoiceTotal.value) : null),
          currencySymbol: summary.currencySymbol?.value || null,
          vendorId: vendor?.id || null,
          customerId: customer?.id || null,
          paymentId: payment.id,
        },
      });

      // line items
      for (const item of lineItemsBlock) {
        await prisma.lineItem.create({
          data: {
            srNo: item.srNo?.value || null,
            description: item.description?.value || null,
            quantity: typeof item.quantity?.value === "number" ? item.quantity.value : (item.quantity?.value ? Number(item.quantity.value) : null),
            unitPrice: typeof item.unitPrice?.value === "number" ? item.unitPrice.value : (item.unitPrice?.value ? Number(item.unitPrice.value) : null),
            totalPrice: typeof item.totalPrice?.value === "number" ? item.totalPrice.value : (item.totalPrice?.value ? Number(item.totalPrice.value) : null),
            Sachkonto: item.Sachkonto?.value || null,
            BUSchluessel: item.BUSchluessel?.value || null,
            invoiceId: invoice.id,
          },
        });
      }

      // file
      await prisma.file.create({
        data: {
          name: record.name || "unknown",
          filePath: record.filePath || null,
          fileType: record.fileType || null,
          status: record.status || null,
          invoiceId: invoice.id,
          createdAt: record.createdAt?.$date ? new Date(record.createdAt.$date) : null,
          updatedAt: record.updatedAt?.$date ? new Date(record.updatedAt.$date) : null,
        },
      });

    } catch (err) {
      console.error("Failed record:", err);
    }
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
