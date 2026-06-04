-- Order payment tracking fields

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "paymentStatus"   TEXT             NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "paidAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- Customer Credit System

CREATE TABLE "CreditAccount" (
  "id"          SERIAL           PRIMARY KEY,
  "customerId"  INTEGER          NOT NULL UNIQUE,
  "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balance"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalDebt"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalPaid"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"      TEXT             NOT NULL DEFAULT 'ACTIVE',
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT
);

CREATE TABLE "CreditPayment" (
  "id"         SERIAL           PRIMARY KEY,
  "accountId"  INTEGER          NOT NULL,
  "orderId"    INTEGER,
  "amount"     DOUBLE PRECISION NOT NULL,
  "method"     TEXT             NOT NULL DEFAULT 'CASH',
  "reference"  TEXT,
  "notes"      TEXT,
  "recordedBy" INTEGER          NOT NULL,
  "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditPayment_accountId_fkey"  FOREIGN KEY ("accountId")  REFERENCES "CreditAccount"("id") ON DELETE RESTRICT,
  CONSTRAINT "CreditPayment_orderId_fkey"    FOREIGN KEY ("orderId")    REFERENCES "Order"("id")         ON DELETE SET NULL,
  CONSTRAINT "CreditPayment_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id")          ON DELETE RESTRICT
);

CREATE INDEX "CreditAccount_customerId_idx" ON "CreditAccount"("customerId");
CREATE INDEX "CreditAccount_status_idx"     ON "CreditAccount"("status");
CREATE INDEX "CreditAccount_balance_idx"    ON "CreditAccount"("balance");
CREATE INDEX "CreditPayment_accountId_idx"  ON "CreditPayment"("accountId");
CREATE INDEX "CreditPayment_orderId_idx"    ON "CreditPayment"("orderId");
CREATE INDEX "CreditPayment_recordedBy_idx" ON "CreditPayment"("recordedBy");
CREATE INDEX "CreditPayment_createdAt_idx"  ON "CreditPayment"("createdAt");

-- Employee Login History & Discount Approvals

CREATE TABLE "EmployeeLoginHistory" (
  "id"          SERIAL       PRIMARY KEY,
  "userId"      INTEGER      NOT NULL,
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "success"     BOOLEAN      NOT NULL DEFAULT true,
  "failReason"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmployeeLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "DiscountRequest" (
  "id"           SERIAL           PRIMARY KEY,
  "orderId"      INTEGER,
  "requestedBy"  INTEGER          NOT NULL,
  "approvedBy"   INTEGER,
  "percentage"   DOUBLE PRECISION NOT NULL,
  "reason"       TEXT             NOT NULL,
  "status"       TEXT             NOT NULL DEFAULT 'PENDING',
  "reviewNote"   TEXT,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DiscountRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "DiscountRequest_approvedBy_fkey"  FOREIGN KEY ("approvedBy")  REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "EmployeeLoginHistory_userId_idx"    ON "EmployeeLoginHistory"("userId");
CREATE INDEX "EmployeeLoginHistory_success_idx"   ON "EmployeeLoginHistory"("success");
CREATE INDEX "EmployeeLoginHistory_createdAt_idx" ON "EmployeeLoginHistory"("createdAt");
CREATE INDEX "DiscountRequest_requestedBy_idx"    ON "DiscountRequest"("requestedBy");
CREATE INDEX "DiscountRequest_approvedBy_idx"     ON "DiscountRequest"("approvedBy");
CREATE INDEX "DiscountRequest_status_idx"         ON "DiscountRequest"("status");
CREATE INDEX "DiscountRequest_createdAt_idx"      ON "DiscountRequest"("createdAt");
