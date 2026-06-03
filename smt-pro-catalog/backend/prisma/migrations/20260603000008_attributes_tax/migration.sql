-- Product Attributes / Specifications

CREATE TABLE "AttributeDefinition" (
  "id"           SERIAL       PRIMARY KEY,
  "name"         TEXT         NOT NULL UNIQUE,
  "unit"         TEXT,
  "type"         TEXT         NOT NULL DEFAULT 'TEXT',
  "isFilterable" BOOLEAN      NOT NULL DEFAULT true,
  "categoryId"   INTEGER,
  "sortOrder"    INTEGER      NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AttributeDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL
);

CREATE TABLE "ProductAttribute" (
  "id"           SERIAL           PRIMARY KEY,
  "productId"    INTEGER          NOT NULL,
  "attributeId"  INTEGER          NOT NULL,
  "value"        TEXT             NOT NULL,
  "numericValue" DOUBLE PRECISION,

  CONSTRAINT "ProductAttribute_productId_attributeId_key" UNIQUE ("productId", "attributeId"),
  CONSTRAINT "ProductAttribute_productId_fkey"   FOREIGN KEY ("productId")   REFERENCES "Product"("id")             ON DELETE CASCADE,
  CONSTRAINT "ProductAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE
);

CREATE INDEX "AttributeDefinition_categoryId_idx"  ON "AttributeDefinition"("categoryId");
CREATE INDEX "AttributeDefinition_isFilterable_idx" ON "AttributeDefinition"("isFilterable");
CREATE INDEX "ProductAttribute_productId_idx"       ON "ProductAttribute"("productId");
CREATE INDEX "ProductAttribute_attributeId_idx"     ON "ProductAttribute"("attributeId");
CREATE INDEX "ProductAttribute_numericValue_idx"    ON "ProductAttribute"("numericValue");

-- Tax Rate Configuration

CREATE TABLE "TaxRate" (
  "id"          SERIAL           PRIMARY KEY,
  "name"        TEXT             NOT NULL,
  "rate"        DOUBLE PRECISION NOT NULL,
  "type"        TEXT             NOT NULL DEFAULT 'VAT',
  "countryCode" TEXT,
  "isDefault"   BOOLEAN          NOT NULL DEFAULT false,
  "isActive"    BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "TaxRate_isDefault_idx" ON "TaxRate"("isDefault");
CREATE INDEX "TaxRate_isActive_idx"  ON "TaxRate"("isActive");
CREATE INDEX "TaxRate_type_idx"      ON "TaxRate"("type");

-- Add taxExempt to Customer

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "taxExempt" BOOLEAN NOT NULL DEFAULT false;
