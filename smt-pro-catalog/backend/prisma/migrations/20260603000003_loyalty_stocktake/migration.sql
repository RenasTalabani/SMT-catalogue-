-- Customer Loyalty Points

CREATE TABLE "LoyaltyAccount" (
  "id"             SERIAL       PRIMARY KEY,
  "customerId"     INTEGER      NOT NULL UNIQUE,
  "points"         INTEGER      NOT NULL DEFAULT 0,
  "lifetimePoints" INTEGER      NOT NULL DEFAULT 0,
  "tier"           TEXT         NOT NULL DEFAULT 'BRONZE',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoyaltyAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT
);

CREATE TABLE "LoyaltyTransaction" (
  "id"        SERIAL       PRIMARY KEY,
  "accountId" INTEGER      NOT NULL,
  "type"      TEXT         NOT NULL,
  "points"    INTEGER      NOT NULL,
  "balance"   INTEGER      NOT NULL,
  "orderId"   INTEGER,
  "reference" TEXT,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoyaltyTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE
);

CREATE INDEX "LoyaltyAccount_customerId_idx"    ON "LoyaltyAccount"("customerId");
CREATE INDEX "LoyaltyAccount_tier_idx"          ON "LoyaltyAccount"("tier");
CREATE INDEX "LoyaltyAccount_points_idx"        ON "LoyaltyAccount"("points");
CREATE INDEX "LoyaltyTransaction_accountId_idx" ON "LoyaltyTransaction"("accountId");
CREATE INDEX "LoyaltyTransaction_type_idx"      ON "LoyaltyTransaction"("type");
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt");
CREATE INDEX "LoyaltyTransaction_orderId_idx"   ON "LoyaltyTransaction"("orderId");

-- Stocktake / Cycle Count

CREATE TABLE "Stocktake" (
  "id"           SERIAL       PRIMARY KEY,
  "reference"    TEXT         NOT NULL UNIQUE,
  "status"       TEXT         NOT NULL DEFAULT 'DRAFT',
  "notes"        TEXT,
  "createdById"  INTEGER      NOT NULL,
  "reviewedById" INTEGER,
  "startedAt"    TIMESTAMP(3),
  "completedAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Stocktake_createdById_fkey"  FOREIGN KEY ("createdById")  REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Stocktake_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE TABLE "StocktakeItem" (
  "id"          SERIAL   PRIMARY KEY,
  "stocktakeId" INTEGER  NOT NULL,
  "productId"   INTEGER  NOT NULL,
  "expectedQty" INTEGER  NOT NULL,
  "countedQty"  INTEGER,
  "variance"    INTEGER,
  "notes"       TEXT,

  CONSTRAINT "StocktakeItem_stocktakeId_productId_key" UNIQUE ("stocktakeId", "productId"),
  CONSTRAINT "StocktakeItem_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE CASCADE,
  CONSTRAINT "StocktakeItem_productId_fkey"   FOREIGN KEY ("productId")   REFERENCES "Product"("id")   ON DELETE RESTRICT
);

CREATE INDEX "Stocktake_status_idx"          ON "Stocktake"("status");
CREATE INDEX "Stocktake_createdById_idx"     ON "Stocktake"("createdById");
CREATE INDEX "Stocktake_createdAt_idx"       ON "Stocktake"("createdAt");
CREATE INDEX "StocktakeItem_stocktakeId_idx" ON "StocktakeItem"("stocktakeId");
CREATE INDEX "StocktakeItem_productId_idx"   ON "StocktakeItem"("productId");
