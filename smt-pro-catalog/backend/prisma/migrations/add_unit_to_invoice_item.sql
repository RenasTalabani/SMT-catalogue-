-- Migration: add unit column to InvoiceItem
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'piece';
