-- Price Lists & Tiered Pricing

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "priceListId" INTEGER;

CREATE TABLE "PriceList" (
  "id"          SERIAL       PRIMARY KEY,
  "name"        TEXT         NOT NULL,
  "description" TEXT,
  "type"        TEXT         NOT NULL DEFAULT 'CUSTOM',
  "isDefault"   BOOLEAN      NOT NULL DEFAULT false,
  "isActive"    BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PriceListItem" (
  "id"          SERIAL           PRIMARY KEY,
  "priceListId" INTEGER          NOT NULL,
  "productId"   INTEGER          NOT NULL,
  "price"       DOUBLE PRECISION NOT NULL,
  "discount"    DOUBLE PRECISION NOT NULL DEFAULT 0,

  CONSTRAINT "PriceListItem_priceListId_productId_key" UNIQUE ("priceListId", "productId"),
  CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE,
  CONSTRAINT "PriceListItem_productId_fkey"   FOREIGN KEY ("productId")   REFERENCES "Product"("id")   ON DELETE RESTRICT
);

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_priceListId_fkey"
  FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL;

CREATE INDEX "PriceList_type_idx"          ON "PriceList"("type");
CREATE INDEX "PriceList_isDefault_idx"     ON "PriceList"("isDefault");
CREATE INDEX "PriceList_isActive_idx"      ON "PriceList"("isActive");
CREATE INDEX "PriceListItem_priceListId_idx" ON "PriceListItem"("priceListId");
CREATE INDEX "PriceListItem_productId_idx" ON "PriceListItem"("productId");
CREATE INDEX "Customer_priceListId_idx"    ON "Customer"("priceListId");

-- Product Bundles / Kits

CREATE TABLE "Bundle" (
  "id"             SERIAL           PRIMARY KEY,
  "name"           TEXT             NOT NULL,
  "description"    TEXT,
  "imageUrl"       TEXT,
  "price"          DOUBLE PRECISION NOT NULL,
  "compareAtPrice" DOUBLE PRECISION,
  "isActive"       BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "BundleItem" (
  "id"        SERIAL  PRIMARY KEY,
  "bundleId"  INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "quantity"  INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "BundleItem_bundleId_productId_key" UNIQUE ("bundleId", "productId"),
  CONSTRAINT "BundleItem_bundleId_fkey"  FOREIGN KEY ("bundleId")  REFERENCES "Bundle"("id")  ON DELETE CASCADE,
  CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT
);

CREATE INDEX "Bundle_isActive_idx"       ON "Bundle"("isActive");
CREATE INDEX "Bundle_createdAt_idx"      ON "Bundle"("createdAt");
CREATE INDEX "BundleItem_bundleId_idx"   ON "BundleItem"("bundleId");
CREATE INDEX "BundleItem_productId_idx"  ON "BundleItem"("productId");
