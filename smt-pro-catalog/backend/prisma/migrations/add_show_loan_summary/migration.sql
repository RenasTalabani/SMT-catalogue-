-- Add showLoanSummary column to Invoice table
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "showLoanSummary" BOOLEAN NOT NULL DEFAULT true;

