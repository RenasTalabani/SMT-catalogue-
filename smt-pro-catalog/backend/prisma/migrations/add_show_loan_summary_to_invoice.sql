-- Add showLoanSummary flag to Invoice
-- Existing loans default to true (keep showing the summary as before)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "showLoanSummary" BOOLEAN NOT NULL DEFAULT true;
