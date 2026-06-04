-- Flash Sales

CREATE TABLE "FlashSale" (
  "id"          SERIAL           PRIMARY KEY,
  "title"       TEXT             NOT NULL,
  "productId"   INTEGER,
  "variantId"   INTEGER,
  "categoryId"  INTEGER,
  "salePrice"   DOUBLE PRECISION,
  "discountPct" DOUBLE PRECISION,
  "maxQuantity" INTEGER,
  "soldCount"   INTEGER          NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN          NOT NULL DEFAULT true,
  "startAt"     TIMESTAMP(3)     NOT NULL,
  "endAt"       TIMESTAMP(3)     NOT NULL,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FlashSale_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "Product"("id")        ON DELETE CASCADE,
  CONSTRAINT "FlashSale_variantId_fkey"  FOREIGN KEY ("variantId")  REFERENCES "ProductVariant"("id") ON DELETE CASCADE,
  CONSTRAINT "FlashSale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id")       ON DELETE CASCADE
);

CREATE INDEX "FlashSale_isActive_idx"   ON "FlashSale"("isActive");
CREATE INDEX "FlashSale_startAt_idx"    ON "FlashSale"("startAt");
CREATE INDEX "FlashSale_endAt_idx"      ON "FlashSale"("endAt");
CREATE INDEX "FlashSale_productId_idx"  ON "FlashSale"("productId");
CREATE INDEX "FlashSale_categoryId_idx" ON "FlashSale"("categoryId");

-- Supplier Performance Ratings

CREATE TABLE "SupplierRating" (
  "id"              SERIAL           PRIMARY KEY,
  "supplierId"      INTEGER          NOT NULL,
  "purchaseOrderId" INTEGER          NOT NULL UNIQUE,
  "qualityScore"    INTEGER          NOT NULL,
  "deliveryScore"   INTEGER          NOT NULL,
  "pricingScore"    INTEGER          NOT NULL,
  "overallScore"    DOUBLE PRECISION NOT NULL,
  "deliveredOnTime" BOOLEAN          NOT NULL,
  "fillRate"        DOUBLE PRECISION NOT NULL,
  "notes"           TEXT,
  "ratedBy"         INTEGER          NOT NULL,
  "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierRating_supplierId_fkey"      FOREIGN KEY ("supplierId")      REFERENCES "Supplier"("id")      ON DELETE RESTRICT,
  CONSTRAINT "SupplierRating_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT,
  CONSTRAINT "SupplierRating_ratedBy_fkey"         FOREIGN KEY ("ratedBy")         REFERENCES "User"("id")          ON DELETE RESTRICT
);

CREATE INDEX "SupplierRating_supplierId_idx"      ON "SupplierRating"("supplierId");
CREATE INDEX "SupplierRating_purchaseOrderId_idx" ON "SupplierRating"("purchaseOrderId");
CREATE INDEX "SupplierRating_createdAt_idx"       ON "SupplierRating"("createdAt");
