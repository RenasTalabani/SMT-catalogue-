-- Product Tags & Labels

CREATE TABLE "Tag" (
  "id"        SERIAL       PRIMARY KEY,
  "name"      TEXT         NOT NULL UNIQUE,
  "slug"      TEXT         NOT NULL UNIQUE,
  "color"     TEXT         NOT NULL DEFAULT '#6366f1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProductTag" (
  "productId" INTEGER NOT NULL,
  "tagId"     INTEGER NOT NULL,

  CONSTRAINT "ProductTag_pkey"          PRIMARY KEY ("productId", "tagId"),
  CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductTag_tagId_fkey"     FOREIGN KEY ("tagId")     REFERENCES "Tag"("id")     ON DELETE CASCADE
);

CREATE INDEX "Tag_slug_idx"            ON "Tag"("slug");
CREATE INDEX "ProductTag_productId_idx" ON "ProductTag"("productId");
CREATE INDEX "ProductTag_tagId_idx"     ON "ProductTag"("tagId");

-- Cash Register / Shift Management

CREATE TABLE "Register" (
  "id"        SERIAL       PRIMARY KEY,
  "name"      TEXT         NOT NULL,
  "location"  TEXT,
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Shift" (
  "id"           SERIAL           PRIMARY KEY,
  "registerId"   INTEGER          NOT NULL,
  "employeeId"   INTEGER          NOT NULL,
  "status"       TEXT             NOT NULL DEFAULT 'OPEN',
  "openingFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "closingFloat" DOUBLE PRECISION,
  "expectedCash" DOUBLE PRECISION,
  "cashVariance" DOUBLE PRECISION,
  "totalSales"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalOrders"  INTEGER          NOT NULL DEFAULT 0,
  "notes"        TEXT,
  "openedAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"     TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Shift_registerId_fkey"  FOREIGN KEY ("registerId")  REFERENCES "Register"("id") ON DELETE RESTRICT,
  CONSTRAINT "Shift_employeeId_fkey"  FOREIGN KEY ("employeeId")  REFERENCES "User"("id")      ON DELETE RESTRICT
);

CREATE TABLE "ShiftOrder" (
  "shiftId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,

  CONSTRAINT "ShiftOrder_pkey"         PRIMARY KEY ("shiftId", "orderId"),
  CONSTRAINT "ShiftOrder_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE,
  CONSTRAINT "ShiftOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT
);

CREATE INDEX "Register_isActive_idx"    ON "Register"("isActive");
CREATE INDEX "Shift_registerId_idx"     ON "Shift"("registerId");
CREATE INDEX "Shift_employeeId_idx"     ON "Shift"("employeeId");
CREATE INDEX "Shift_status_idx"         ON "Shift"("status");
CREATE INDEX "Shift_openedAt_idx"       ON "Shift"("openedAt");
CREATE INDEX "ShiftOrder_shiftId_idx"   ON "ShiftOrder"("shiftId");
CREATE INDEX "ShiftOrder_orderId_idx"   ON "ShiftOrder"("orderId");
