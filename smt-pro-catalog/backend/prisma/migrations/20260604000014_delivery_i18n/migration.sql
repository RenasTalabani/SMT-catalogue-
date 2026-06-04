-- Order delivery fields

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "deliveryFee"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveryZoneId" INTEGER;

-- Delivery Zones & Shipping Rates

CREATE TABLE "DeliveryZone" (
  "id"               SERIAL           PRIMARY KEY,
  "name"             TEXT             NOT NULL,
  "nameAr"           TEXT,
  "nameKu"           TEXT,
  "regions"          JSONB            NOT NULL,
  "isActive"         BOOLEAN          NOT NULL DEFAULT true,
  "freeShippingOver" DOUBLE PRECISION,
  "estimatedDays"    TEXT             NOT NULL DEFAULT '1-3',
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ShippingRate" (
  "id"        SERIAL           PRIMARY KEY,
  "zoneId"    INTEGER          NOT NULL,
  "minWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxWeight" DOUBLE PRECISION,
  "baseCost"  DOUBLE PRECISION NOT NULL,
  "perKgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN          NOT NULL DEFAULT true,

  CONSTRAINT "ShippingRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id") ON DELETE CASCADE
);

CREATE INDEX "DeliveryZone_isActive_idx" ON "DeliveryZone"("isActive");
CREATE INDEX "ShippingRate_zoneId_idx"   ON "ShippingRate"("zoneId");
CREATE INDEX "ShippingRate_isActive_idx" ON "ShippingRate"("isActive");

-- Product & Category Translations

CREATE TABLE "ProductTranslation" (
  "id"          SERIAL   PRIMARY KEY,
  "productId"   INTEGER  NOT NULL,
  "locale"      TEXT     NOT NULL,
  "name"        TEXT     NOT NULL,
  "description" TEXT,

  CONSTRAINT "ProductTranslation_productId_locale_key" UNIQUE ("productId", "locale"),
  CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE TABLE "CategoryTranslation" (
  "id"          SERIAL   PRIMARY KEY,
  "categoryId"  INTEGER  NOT NULL,
  "locale"      TEXT     NOT NULL,
  "name"        TEXT     NOT NULL,
  "description" TEXT,

  CONSTRAINT "CategoryTranslation_categoryId_locale_key" UNIQUE ("categoryId", "locale"),
  CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE
);

CREATE INDEX "ProductTranslation_productId_idx"   ON "ProductTranslation"("productId");
CREATE INDEX "ProductTranslation_locale_idx"      ON "ProductTranslation"("locale");
CREATE INDEX "CategoryTranslation_categoryId_idx" ON "CategoryTranslation"("categoryId");
CREATE INDEX "CategoryTranslation_locale_idx"     ON "CategoryTranslation"("locale");
