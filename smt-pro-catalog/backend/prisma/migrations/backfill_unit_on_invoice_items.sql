-- Step 1: Add unit column if not already there (safe to re-run)
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'piece';

-- Step 2: Backfill unit from Product where SKU matches
UPDATE "InvoiceItem" ii
SET    unit = p.unit
FROM   "Product" p
WHERE  ii."productSku" IS NOT NULL
  AND  ii."productSku" != ''
  AND  p.sku = ii."productSku"
  AND  ii.unit = 'piece';  -- only touch rows still at default

-- Step 3: For rows with no SKU match, try matching by product name
UPDATE "InvoiceItem" ii
SET    unit = p.unit
FROM   "Product" p
WHERE  ii.unit = 'piece'
  AND  (ii."productSku" IS NULL OR ii."productSku" = '')
  AND  p.name = ii."productName";
