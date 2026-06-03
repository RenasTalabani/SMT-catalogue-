-- Create PurchaseOrder and PurchaseOrderItem tables

CREATE TABLE "PurchaseOrder" (
  "id"           SERIAL         PRIMARY KEY,
  "poNumber"     TEXT           NOT NULL UNIQUE,
  "supplierId"   INTEGER        NOT NULL,
  "createdById"  INTEGER        NOT NULL,
  "status"       TEXT           NOT NULL DEFAULT 'DRAFT',
  "notes"        TEXT,
  "expectedDate" TIMESTAMP(3),
  "receivedAt"   TIMESTAMP(3),
  "subtotal"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseOrder_supplierId_fkey"  FOREIGN KEY ("supplierId")  REFERENCES "Supplier"("id") ON DELETE RESTRICT,
  CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")     ON DELETE RESTRICT
);

CREATE TABLE "PurchaseOrderItem" (
  "id"              SERIAL           PRIMARY KEY,
  "purchaseOrderId" INTEGER          NOT NULL,
  "productId"       INTEGER          NOT NULL,
  "orderedQty"      INTEGER          NOT NULL,
  "receivedQty"     INTEGER          NOT NULL DEFAULT 0,
  "unitCost"        DOUBLE PRECISION NOT NULL,
  "total"           DOUBLE PRECISION NOT NULL,

  CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderItem_productId_fkey"       FOREIGN KEY ("productId")       REFERENCES "Product"("id")       ON DELETE RESTRICT
);

CREATE INDEX "PurchaseOrder_supplierId_idx"       ON "PurchaseOrder"("supplierId");
CREATE INDEX "PurchaseOrder_createdById_idx"      ON "PurchaseOrder"("createdById");
CREATE INDEX "PurchaseOrder_status_idx"           ON "PurchaseOrder"("status");
CREATE INDEX "PurchaseOrder_createdAt_idx"        ON "PurchaseOrder"("createdAt");
CREATE INDEX "PurchaseOrder_poNumber_idx"         ON "PurchaseOrder"("poNumber");
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_productId_idx"    ON "PurchaseOrderItem"("productId");
