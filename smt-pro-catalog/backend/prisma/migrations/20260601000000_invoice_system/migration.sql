-- CreateTable: Invoice
CREATE TABLE "Invoice" (
    "id"              SERIAL NOT NULL,
    "invoiceNumber"   TEXT NOT NULL,
    "orderId"         INTEGER NOT NULL,
    "createdById"     INTEGER NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'ISSUED',
    "customerName"    TEXT,
    "customerPhone"   TEXT,
    "customerEmail"   TEXT,
    "customerAddress" TEXT,
    "subtotal"        DOUBLE PRECISION NOT NULL,
    "discountType"    TEXT NOT NULL DEFAULT 'FIXED',
    "discountValue"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total"           DOUBLE PRECISION NOT NULL,
    "paymentMethod"   TEXT NOT NULL DEFAULT 'CASH',
    "notes"           TEXT,
    "pdfUrl"          TEXT,
    "pdfPublicId"     TEXT,
    "qrData"          TEXT,
    "issuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt"          TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvoiceItem
CREATE TABLE "InvoiceItem" (
    "id"          SERIAL NOT NULL,
    "invoiceId"   INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku"  TEXT,
    "quantity"    INTEGER NOT NULL,
    "unitPrice"   DOUBLE PRECISION NOT NULL,
    "discount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total"       DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");
CREATE INDEX "Invoice_createdById_idx" ON "Invoice"("createdById");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
