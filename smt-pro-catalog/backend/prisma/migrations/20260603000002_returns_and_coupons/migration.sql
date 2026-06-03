-- Returns & Refunds

CREATE TABLE "ReturnRequest" (
  "id"           SERIAL           PRIMARY KEY,
  "orderId"      INTEGER          NOT NULL,
  "requestedBy"  INTEGER          NOT NULL,
  "reviewedBy"   INTEGER,
  "status"       TEXT             NOT NULL DEFAULT 'PENDING',
  "reason"       TEXT             NOT NULL,
  "notes"        TEXT,
  "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "refundMethod" TEXT             NOT NULL DEFAULT 'ORIGINAL',
  "resolvedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReturnRequest_orderId_fkey"      FOREIGN KEY ("orderId")      REFERENCES "Order"("id") ON DELETE RESTRICT,
  CONSTRAINT "ReturnRequest_requestedBy_fkey"  FOREIGN KEY ("requestedBy")  REFERENCES "User"("id")  ON DELETE RESTRICT,
  CONSTRAINT "ReturnRequest_reviewedBy_fkey"   FOREIGN KEY ("reviewedBy")   REFERENCES "User"("id")  ON DELETE SET NULL
);

CREATE TABLE "ReturnItem" (
  "id"              SERIAL           PRIMARY KEY,
  "returnRequestId" INTEGER          NOT NULL,
  "productId"       INTEGER          NOT NULL,
  "orderItemId"     INTEGER          NOT NULL,
  "quantity"        INTEGER          NOT NULL,
  "unitPrice"       DOUBLE PRECISION NOT NULL,
  "condition"       TEXT             NOT NULL DEFAULT 'GOOD',

  CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE,
  CONSTRAINT "ReturnItem_productId_fkey"       FOREIGN KEY ("productId")       REFERENCES "Product"("id")       ON DELETE RESTRICT,
  CONSTRAINT "ReturnItem_orderItemId_fkey"     FOREIGN KEY ("orderItemId")     REFERENCES "OrderItem"("id")     ON DELETE RESTRICT
);

CREATE INDEX "ReturnRequest_orderId_idx"      ON "ReturnRequest"("orderId");
CREATE INDEX "ReturnRequest_requestedBy_idx"  ON "ReturnRequest"("requestedBy");
CREATE INDEX "ReturnRequest_status_idx"       ON "ReturnRequest"("status");
CREATE INDEX "ReturnRequest_createdAt_idx"    ON "ReturnRequest"("createdAt");
CREATE INDEX "ReturnItem_returnRequestId_idx" ON "ReturnItem"("returnRequestId");
CREATE INDEX "ReturnItem_productId_idx"       ON "ReturnItem"("productId");

-- Coupons & Discount Codes

CREATE TABLE "Coupon" (
  "id"              SERIAL           PRIMARY KEY,
  "code"            TEXT             NOT NULL UNIQUE,
  "description"     TEXT,
  "type"            TEXT             NOT NULL DEFAULT 'PERCENTAGE',
  "value"           DOUBLE PRECISION NOT NULL,
  "minOrderAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxUses"         INTEGER,
  "usedCount"       INTEGER          NOT NULL DEFAULT 0,
  "isActive"        BOOLEAN          NOT NULL DEFAULT true,
  "validFrom"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CouponUsage" (
  "id"        SERIAL           PRIMARY KEY,
  "couponId"  INTEGER          NOT NULL,
  "orderId"   INTEGER          NOT NULL UNIQUE,
  "userId"    INTEGER          NOT NULL,
  "discount"  DOUBLE PRECISION NOT NULL,
  "usedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT,
  CONSTRAINT "CouponUsage_orderId_fkey"  FOREIGN KEY ("orderId")  REFERENCES "Order"("id")  ON DELETE RESTRICT,
  CONSTRAINT "CouponUsage_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE RESTRICT
);

CREATE INDEX "Coupon_code_idx"            ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_idx"        ON "Coupon"("isActive");
CREATE INDEX "Coupon_validFrom_idx"       ON "Coupon"("validFrom");
CREATE INDEX "Coupon_validUntil_idx"      ON "Coupon"("validUntil");
CREATE INDEX "CouponUsage_couponId_idx"   ON "CouponUsage"("couponId");
CREATE INDEX "CouponUsage_userId_idx"     ON "CouponUsage"("userId");
CREATE INDEX "CouponUsage_usedAt_idx"     ON "CouponUsage"("usedAt");
