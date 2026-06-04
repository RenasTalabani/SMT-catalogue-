-- Multi-Warehouse Locations

CREATE TABLE "Location" (
  "id"        SERIAL       PRIMARY KEY,
  "name"      TEXT         NOT NULL,
  "code"      TEXT         NOT NULL UNIQUE,
  "address"   TEXT,
  "isDefault" BOOLEAN      NOT NULL DEFAULT false,
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LocationStock" (
  "id"         SERIAL   PRIMARY KEY,
  "locationId" INTEGER  NOT NULL,
  "productId"  INTEGER  NOT NULL,
  "quantity"   INTEGER  NOT NULL DEFAULT 0,

  CONSTRAINT "LocationStock_locationId_productId_key" UNIQUE ("locationId", "productId"),
  CONSTRAINT "LocationStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE,
  CONSTRAINT "LocationStock_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "Product"("id")  ON DELETE CASCADE
);

CREATE TABLE "StockTransfer" (
  "id"          SERIAL       PRIMARY KEY,
  "reference"   TEXT         NOT NULL UNIQUE,
  "fromId"      INTEGER      NOT NULL,
  "toId"        INTEGER      NOT NULL,
  "status"      TEXT         NOT NULL DEFAULT 'PENDING',
  "notes"       TEXT,
  "createdById" INTEGER      NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockTransfer_fromId_fkey"      FOREIGN KEY ("fromId")      REFERENCES "Location"("id") ON DELETE RESTRICT,
  CONSTRAINT "StockTransfer_toId_fkey"        FOREIGN KEY ("toId")        REFERENCES "Location"("id") ON DELETE RESTRICT,
  CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")     ON DELETE RESTRICT
);

CREATE TABLE "StockTransferItem" (
  "id"         SERIAL   PRIMARY KEY,
  "transferId" INTEGER  NOT NULL,
  "productId"  INTEGER  NOT NULL,
  "quantity"   INTEGER  NOT NULL,

  CONSTRAINT "StockTransferItem_transferId_productId_key" UNIQUE ("transferId", "productId"),
  CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE,
  CONSTRAINT "StockTransferItem_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "Product"("id")       ON DELETE RESTRICT
);

CREATE INDEX "Location_code_idx"                ON "Location"("code");
CREATE INDEX "Location_isDefault_idx"           ON "Location"("isDefault");
CREATE INDEX "Location_isActive_idx"            ON "Location"("isActive");
CREATE INDEX "LocationStock_locationId_idx"     ON "LocationStock"("locationId");
CREATE INDEX "LocationStock_productId_idx"      ON "LocationStock"("productId");
CREATE INDEX "StockTransfer_fromId_idx"         ON "StockTransfer"("fromId");
CREATE INDEX "StockTransfer_toId_idx"           ON "StockTransfer"("toId");
CREATE INDEX "StockTransfer_status_idx"         ON "StockTransfer"("status");
CREATE INDEX "StockTransfer_createdAt_idx"      ON "StockTransfer"("createdAt");
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");
CREATE INDEX "StockTransferItem_productId_idx"  ON "StockTransferItem"("productId");

-- Payment Plans / Installments

CREATE TABLE "PaymentPlan" (
  "id"               SERIAL           PRIMARY KEY,
  "orderId"          INTEGER          NOT NULL UNIQUE,
  "totalAmount"      DOUBLE PRECISION NOT NULL,
  "paidAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "installmentCount" INTEGER          NOT NULL,
  "status"           TEXT             NOT NULL DEFAULT 'ACTIVE',
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentPlan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT
);

CREATE TABLE "PaymentInstallment" (
  "id"         SERIAL           PRIMARY KEY,
  "planId"     INTEGER          NOT NULL,
  "number"     INTEGER          NOT NULL,
  "amount"     DOUBLE PRECISION NOT NULL,
  "dueDate"    TIMESTAMP(3)     NOT NULL,
  "paidAt"     TIMESTAMP(3),
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"     TEXT             NOT NULL DEFAULT 'PENDING',
  "notes"      TEXT,

  CONSTRAINT "PaymentInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE
);

CREATE INDEX "PaymentPlan_status_idx"           ON "PaymentPlan"("status");
CREATE INDEX "PaymentPlan_createdAt_idx"        ON "PaymentPlan"("createdAt");
CREATE INDEX "PaymentInstallment_planId_idx"    ON "PaymentInstallment"("planId");
CREATE INDEX "PaymentInstallment_status_idx"    ON "PaymentInstallment"("status");
CREATE INDEX "PaymentInstallment_dueDate_idx"   ON "PaymentInstallment"("dueDate");
