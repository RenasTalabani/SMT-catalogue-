-- Product Variants

CREATE TABLE "ProductVariant" (
  "id"        SERIAL           PRIMARY KEY,
  "parentId"  INTEGER          NOT NULL,
  "name"      TEXT             NOT NULL,
  "sku"       TEXT             UNIQUE,
  "barcode"   TEXT             UNIQUE,
  "price"     DOUBLE PRECISION NOT NULL,
  "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantity"  INTEGER          NOT NULL DEFAULT 0,
  "attributes" JSONB,
  "imageUrl"  TEXT,
  "isActive"  BOOLEAN          NOT NULL DEFAULT true,
  "sortOrder" INTEGER          NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductVariant_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE TABLE "VariantOrderItem" (
  "id"        SERIAL           PRIMARY KEY,
  "orderId"   INTEGER          NOT NULL,
  "variantId" INTEGER          NOT NULL,
  "quantity"  INTEGER          NOT NULL,
  "price"     DOUBLE PRECISION NOT NULL,
  "discount"  DOUBLE PRECISION NOT NULL DEFAULT 0,

  CONSTRAINT "VariantOrderItem_orderId_fkey"   FOREIGN KEY ("orderId")   REFERENCES "Order"("id")          ON DELETE CASCADE,
  CONSTRAINT "VariantOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT
);

CREATE INDEX "ProductVariant_parentId_idx"       ON "ProductVariant"("parentId");
CREATE INDEX "ProductVariant_sku_idx"             ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_isActive_idx"        ON "ProductVariant"("isActive");
CREATE INDEX "VariantOrderItem_orderId_idx"       ON "VariantOrderItem"("orderId");
CREATE INDEX "VariantOrderItem_variantId_idx"     ON "VariantOrderItem"("variantId");

-- Scheduled Report Emails

CREATE TABLE "ReportSchedule" (
  "id"         SERIAL       PRIMARY KEY,
  "type"       TEXT         NOT NULL UNIQUE,
  "frequency"  TEXT         NOT NULL DEFAULT 'DAILY',
  "recipients" JSONB        NOT NULL,
  "isActive"   BOOLEAN      NOT NULL DEFAULT true,
  "lastSentAt" TIMESTAMP(3),
  "nextRunAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ReportSchedule_isActive_idx"  ON "ReportSchedule"("isActive");
CREATE INDEX "ReportSchedule_nextRunAt_idx" ON "ReportSchedule"("nextRunAt");
