-- Add soft delete support to Product, Customer, Supplier

ALTER TABLE "Product"  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx"  ON "Product"("deletedAt");
CREATE INDEX IF NOT EXISTS "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX IF NOT EXISTS "Supplier_deletedAt_idx" ON "Supplier"("deletedAt");
