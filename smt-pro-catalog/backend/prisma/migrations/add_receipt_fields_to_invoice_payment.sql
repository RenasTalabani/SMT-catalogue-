-- Migration: add receiptNumber and receiptPdfUrl to InvoicePayment
ALTER TABLE "InvoicePayment"
  ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptPdfUrl" TEXT;
