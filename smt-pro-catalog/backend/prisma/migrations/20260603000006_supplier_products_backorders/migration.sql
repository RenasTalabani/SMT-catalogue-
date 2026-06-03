-- Supplier Product Catalog (multi-supplier per product)

CREATE TABLE "SupplierProduct" (
  "id"           SERIAL           PRIMARY KEY,
  "supplierId"   INTEGER          NOT NULL,
  "productId"    INTEGER          NOT NULL,
  "supplierSku"  TEXT,
  "unitCost"     DOUBLE PRECISION NOT NULL,
  "leadTimeDays" INTEGER          NOT NULL DEFAULT 0,
  "minOrderQty"  INTEGER          NOT NULL DEFAULT 1,
  "packSize"     INTEGER          NOT NULL DEFAULT 1,
  "isPreferred"  BOOLEAN          NOT NULL DEFAULT false,
  "notes"        TEXT,
  "lastUpdated"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierProduct_supplierId_productId_key" UNIQUE ("supplierId", "productId"),
  CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierProduct_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "Product"("id")  ON DELETE CASCADE
);

CREATE INDEX "SupplierProduct_supplierId_idx"  ON "SupplierProduct"("supplierId");
CREATE INDEX "SupplierProduct_productId_idx"   ON "SupplierProduct"("productId");
CREATE INDEX "SupplierProduct_isPreferred_idx" ON "SupplierProduct"("isPreferred");
CREATE INDEX "SupplierProduct_unitCost_idx"    ON "SupplierProduct"("unitCost");

-- Backorders / Waitlist

CREATE TABLE "BackorderRequest" (
  "id"          SERIAL       PRIMARY KEY,
  "productId"   INTEGER      NOT NULL,
  "customerId"  INTEGER,
  "requestedBy" INTEGER      NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "status"      TEXT         NOT NULL DEFAULT 'PENDING',
  "notes"       TEXT,
  "notifiedAt"  TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BackorderRequest_productId_fkey"   FOREIGN KEY ("productId")   REFERENCES "Product"("id")   ON DELETE RESTRICT,
  CONSTRAINT "BackorderRequest_customerId_fkey"  FOREIGN KEY ("customerId")  REFERENCES "Customer"("id")  ON DELETE SET NULL,
  CONSTRAINT "BackorderRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id")      ON DELETE RESTRICT
);

CREATE INDEX "BackorderRequest_productId_idx"   ON "BackorderRequest"("productId");
CREATE INDEX "BackorderRequest_customerId_idx"  ON "BackorderRequest"("customerId");
CREATE INDEX "BackorderRequest_requestedBy_idx" ON "BackorderRequest"("requestedBy");
CREATE INDEX "BackorderRequest_status_idx"      ON "BackorderRequest"("status");
CREATE INDEX "BackorderRequest_createdAt_idx"   ON "BackorderRequest"("createdAt");
